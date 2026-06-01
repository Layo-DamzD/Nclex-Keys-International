const Question = require('../models/Question');
const TestResult = require('../models/testResult');
const User = require('../models/user');
const { matchCategory, matchSubcategory, CATEGORIES, getClientNeedMatches } = require('../constants/categories');
const Test = require('../models/Test');
const StudyMaterial = require('../models/StudyMaterial');
const SystemLog = require('../models/SystemLog');
const Activity = require('../models/Activity');
const ExamSupportMessage = require('../models/ExamSupportMessage');
const Image = require('../models/Image');
const { sendPushNotificationMulticast } = require('../services/firebaseAdmin');
const { sendStudentWelcomeEmail, sendTestAssignmentEmail, sendStudyMaterialUpdateEmail } = require('../services/emailService');
const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary - supports both CLOUDINARY_URL and individual env vars
// Option 1 (EASIEST): Set CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
// Option 2: Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET separately
const cloudinaryConfigured = Boolean(process.env.CLOUDINARY_URL) || Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (cloudinaryConfigured) {
  // cloudinary.config() automatically reads CLOUDINARY_URL if set
  // Or uses individual vars if CLOUDINARY_URL is not set
  cloudinary.config();
  console.log('✅ Cloudinary configured for persistent image storage');
} else {
  console.log('📦 Cloudinary not configured - using MongoDB for persistent image storage');
  console.log('💡 To enable Cloudinary: Add CLOUDINARY_URL to your environment variables');
}

const normalizeRole = (role) => String(role || '').trim().toLowerCase();
const isSuperAdminUser = (user) => normalizeRole(user?.role) === 'superadmin';
const getScopedStudentIdsForAdmin = (user) =>
  Array.isArray(user?.managedStudents)
    ? user.managedStudents.map((id) => String(id)).filter(Boolean)
    : [];
const getScopedStudentObjectIdsForAdmin = (user) =>
  Array.isArray(user?.managedStudents) ? user.managedStudents.filter(Boolean) : [];

const applyStudentScopeFilter = (user, baseFilter = {}, idField = '_id') => {
  if (isSuperAdminUser(user)) return { ...baseFilter };
  const scopedIds = getScopedStudentIdsForAdmin(user);
  return {
    ...baseFilter,
    [idField]: { $in: scopedIds }
  };
};

const normalizeStudentIds = (ids) =>
  Array.isArray(ids)
    ? [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))]
    : [];

const ensureStudentInScopeForAdmin = (user, studentId) => {
  if (isSuperAdminUser(user)) return true;
  const scopedIds = getScopedStudentIdsForAdmin(user);
  return scopedIds.includes(String(studentId));
};

const STUDENT_SUBSCRIPTION_DAYS = 30;

const isStudentSubscriptionExpired = (student) => {
  if (!student) return false;
  const start = student.subscriptionStartDate ? new Date(student.subscriptionStartDate) : null;
  if (!start || Number.isNaN(start.getTime())) return false;
  const expiry = new Date(start.getTime() + STUDENT_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() > expiry.getTime();
};

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (admin only)
const getAdminStats = async (req, res) => {
  try {
    // Use the SAME counting logic as the student dashboard.
    // Exclude drafts, exclude case-study type (they have their own tab),
    // and count subjects and client needs independently (a question can be both).
    const allQuestions = await Question.find(
      { isDraft: { $ne: true } },
      '_id category subcategory clientNeed clientNeedSubcategory type'
    ).lean();

    const subjectIds = new Set();
    const clientNeedIds = new Set();
    const caseStudyIds = new Set();

    for (const q of allQuestions) {
      const qId = String(q._id);

      // Case-study type questions have their own counter
      if (q.type === 'case-study') {
        caseStudyIds.add(qId);
        continue;
      }

      // Subjects: canonical category + subcategory match
      const canonicalCat = matchCategory(q.category);
      const canonicalSub = canonicalCat ? matchSubcategory(canonicalCat, q.subcategory) : null;
      if (canonicalCat && canonicalSub && CATEGORIES[canonicalCat] && CATEGORIES[canonicalCat].includes(canonicalSub)) {
        subjectIds.add(qId);
      }

      // Client needs: at least one match to a predefined NCLEX client need
      const cnMatches = getClientNeedMatches(q);
      if (cnMatches.size > 0) {
        clientNeedIds.add(qId);
      }
    }

    const totalQuestions = allQuestions.length;
    const unionIds = new Set([...subjectIds, ...clientNeedIds, ...caseStudyIds]);
    const uncategorized = totalQuestions - unionIds.size;

    const totalStudents = await User.countDocuments({ role: 'student' });

    const testResults = await TestResult.find();
    const totalUsage = testResults.reduce((sum, t) => sum + t.totalQuestions, 0);
    const totalCorrect = testResults.reduce((sum, t) => sum + t.score, 0);
    const totalAnswered = testResults.reduce((sum, t) => sum + t.totalQuestions, 0);
    const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    res.json({
      totalQuestions,
      subjectQuestions: subjectIds.size,
      clientNeedQuestions: clientNeedIds.size,
      caseStudyQuestions: caseStudyIds.size,
      uncategorized,
      totalStudents,
      totalUsage,
      successRate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to properly escape CSV fields
const escapeCsvField = (value) => {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  // Always quote fields and escape internal quotes by doubling them
  return `"${str.replace(/"/g, '""')}"`;
};

// @desc    Export all questions as CSV
// @route   GET /api/admin/questions/export
// @access  Private (admin only)
const exportQuestions = async (req, res) => {
  try {
    const questions = await Question.find().lean();
    
    // Define CSV headers - MUST match import expected headers (lowercase)
    // type, category, subcategory, questiontext are required for import
    const headers = ['type', 'category', 'subcategory', 'clientneed', 'clientneedsubcategory', 'questiontext', 'options', 'correctanswer', 'rationale', 'difficulty'];
    
    // Convert questions to CSV rows with proper escaping
    const rows = questions.map(q => [
      escapeCsvField(q.type || ''),
      escapeCsvField(q.category || ''),
      escapeCsvField(q.subcategory || ''),
      escapeCsvField(q.clientNeed || ''),
      escapeCsvField(q.clientNeedSubcategory || ''),
      escapeCsvField(q.questionText || ''),
      escapeCsvField(q.options ? q.options.join('; ') : ''),
      escapeCsvField(Array.isArray(q.correctAnswer) ? q.correctAnswer.join(';') : (q.correctAnswer || '')),
      escapeCsvField(q.rationale || ''),
      escapeCsvField(q.difficulty || 'medium')
    ]);

    // Build CSV string with CRLF line endings (standard CSV format)
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"');
    // Add BOM for Excel compatibility with UTF-8
    res.send('\ufeff' + csvContent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all questions with filters and pagination
// @route   GET /api/admin/questions
// @access  Private (admin only)
const getQuestions = async (req, res) => {
  try {
    const { category, subcategory, type, difficulty, clientNeed, uncategorized, isDraft, search } = req.query;
    const rawPage = Number(req.query.page || 1);
    const rawLimit = String(req.query.limit || '10').trim().toLowerCase();
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const includeAll = rawLimit === 'all';
    const parsedLimit = Number(rawLimit);
    const limit = includeAll ? 0 : (Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10);
    let filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = String(difficulty).toLowerCase();
    if (clientNeed) filter.clientNeed = clientNeed;
    if (isDraft !== undefined && isDraft !== '') {
      filter.isDraft = isDraft === 'true';
    }
    // Text search on questionText OR _id (UID)
    if (search && String(search).trim()) {
      const term = String(search).trim();
      // If the search looks like a MongoDB ObjectId (24 hex chars), search by _id
      if (/^[0-9a-fA-F]{24}$/.test(term)) {
        filter.$or = [
          { questionText: { $regex: term, $options: 'i' } },
          { _id: term },
        ];
      } else {
        // Text search only — do NOT use $regex on ObjectId field (crashes)
        filter.questionText = { $regex: term, $options: 'i' };
      }
    }

    // Handle uncategorized filter: return questions not matching any
    // canonical subject category or predefined client need category
    if (uncategorized === 'true') {
      const allQuestions = await Question.find(
        {},
        '_id category subcategory clientNeed clientNeedSubcategory questionText type difficulty timesUsed correctAttempts incorrectAttempts caseStudyId'
      ).sort({ createdAt: -1 }).lean();

      const matchedIds = new Set();
      for (const q of allQuestions) {
        const canonicalCat = matchCategory(q.category);
        const canonicalSub = canonicalCat ? matchSubcategory(canonicalCat, q.subcategory) : null;
        const isSubject = canonicalCat && canonicalSub && CATEGORIES[canonicalCat] && CATEGORIES[canonicalCat].includes(canonicalSub);
        const isClientNeed = getClientNeedMatches(q).size > 0;
        if (isSubject || isClientNeed) matchedIds.add(String(q._id));
      }

      const filtered = allQuestions.filter(q => !matchedIds.has(String(q._id)));
      const total = filtered.length;
      const paged = includeAll ? filtered : filtered.slice((page - 1) * limit, page * limit);

      return res.json({
        questions: paged,
        totalPages: includeAll ? 1 : Math.max(1, Math.ceil(total / limit)),
        currentPage: page,
        total
      });
    }

    const total = await Question.countDocuments(filter);
    let query = Question.find(filter)
      .sort({ createdAt: -1 })
      .select('questionText type category subcategory difficulty timesUsed correctAttempts incorrectAttempts caseStudyId isDraft');

    if (!includeAll) {
      query = query.limit(limit).skip((page - 1) * limit);
    }

    const questions = await query;
    const totalPages = includeAll ? 1 : Math.max(1, Math.ceil(total / limit));

    res.json({
      questions,
      totalPages,
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Bulk delete questions by IDs
// @route   POST /api/admin/questions/bulk-delete
// @access  Private (admin only)
const bulkDeleteQuestions = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id) => String(id || '').trim()).filter(Boolean)
      : [];

    if (!ids.length) {
      return res.status(400).json({ message: 'No question IDs provided' });
    }

    const result = await Question.deleteMany({ _id: { $in: ids } });
    return res.json({
      message: `Deleted ${result.deletedCount || 0} question(s)`,
      deletedCount: result.deletedCount || 0,
      requestedCount: ids.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get full question details by ID
// @route   GET /api/admin/questions/:id
// @access  Private (admin only)
const getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).lean();
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    return res.json(question);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a question
// @route   DELETE /api/admin/questions/:id
// @access  Private (admin only)
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    await question.deleteOne();
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new question
// @route   POST /api/admin/questions
// @access  Private (admin only)
const createQuestion = async (req, res) => {
  try {
    const { type, correctAnswer, options, rationale } = req.body || {};

    // For published MC/SATA questions, only check that correctAnswer exists (not empty).
    // Format conversion (full-text → letter) is handled silently by the pre-save hook in Question.js.
    // This avoids blocking uploaders — they can paste any format and it gets auto-fixed.
    if (!req.body.isDraft && (type === 'multiple-choice' || type === 'sata')) {
      if (!correctAnswer || (typeof correctAnswer === 'string' && correctAnswer.trim() === '')) {
        return res.status(400).json({ message: 'correctAnswer is required for published questions' });
      }
    }

    const payload = {
      type,
      category: req.body?.category,
      subcategory: req.body?.subcategory,
      clientNeed: req.body?.clientNeed,
      clientNeedSubcategory: req.body?.clientNeedSubcategory,
      isNextGen: req.body?.isNextGen,
      isDraft: req.body?.isDraft,
      questionText: req.body?.questionText,
      questionImageUrl: req.body?.questionImageUrl,
      options,
      optionImages: req.body?.optionImages,
      correctAnswer,
      rationale,
      rationaleImageUrl: req.body?.rationaleImageUrl,
      difficulty: req.body?.difficulty,
      highlightStart: req.body?.highlightStart,
      highlightEnd: req.body?.highlightEnd,
      highlightSelectableWords: req.body?.highlightSelectableWords,
      highlightCorrectWords: req.body?.highlightCorrectWords,
      matrixColumns: req.body?.matrixColumns,
      matrixRows: req.body?.matrixRows,
      hotspotImageUrl: req.body?.hotspotImageUrl,
      hotspotTargets: req.body?.hotspotTargets,
      clozeTemplate: req.body?.clozeTemplate,
      clozeBlanks: req.body?.clozeBlanks,
      uploadedBy: req.user?._id || null,
    };

    const question = new Question(payload);

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error('createQuestion error:', error);
    const msg = error?.errors
      ? Object.values(error.errors).map(e => e.message).join('; ')
      : (error?.message || 'Server error');
    res.status(500).json({ message: msg });
  }
};

// @desc    Update a question
// @route   PUT /api/admin/questions/:id
// @access  Private (admin only)
const updateQuestion = async (req, res) => {
  try {
    const updates = req.body;

    // When publishing, only check that correctAnswer is not empty.
    // Format conversion (full-text → letter) is handled silently by the pre-save hook.
    if (updates.isDraft === false || updates.isDraft === 'false') {
      const { correctAnswer } = updates;
      if (!correctAnswer || (typeof correctAnswer === 'string' && correctAnswer.trim() === '') ||
          (Array.isArray(correctAnswer) && correctAnswer.length === 0)) {
        return res.status(400).json({ message: 'Cannot publish: correctAnswer is required' });
      }
    }

    // Use findOneAndUpdate + save() to trigger pre-save middleware
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    Object.assign(question, updates);
    await question.save();
    res.json(question);
  } catch (error) {
    console.error('updateQuestion error:', error);
    const msg = error?.errors
      ? Object.values(error.errors).map(e => e.message).join('; ')
      : (error?.message || 'Server error');
    res.status(500).json({ message: msg });
  }
};

// @desc    Bulk import questions from CSV
// @route   POST /api/admin/questions/bulk-import
// @access  Private (admin only)
const bulkImportQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Handle BOM and different encodings
    let csvText = req.file.buffer.toString('utf8');
    // Remove BOM if present
    if (csvText.charCodeAt(0) === 0xfeff) {
      csvText = csvText.slice(1);
    }

    // Improved CSV parser that handles:
    // - Quoted fields with commas inside
    // - Quoted fields with newlines inside
    // - Escaped quotes (doubled quotes)
    const parseCsv = (text = '') => {
      const rows = [];
      let row = [];
      let cell = '';
      let inQuotes = false;

      const pushCell = () => {
        // Don't trim - preserve original spacing, just remove \r
        row.push(cell.replace(/\r/g, ''));
        cell = '';
      };

      const pushRow = () => {
        if (row.some((entry) => String(entry || '').trim() !== '')) {
          rows.push(row);
        }
        row = [];
      };

      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            // Escaped quote - add single quote and skip next
            cell += '"';
            i += 1;
          } else {
            // Toggle quote state
            inQuotes = !inQuotes;
          }
          continue;
        }

        if (char === ',' && !inQuotes) {
          pushCell();
          continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
          // Handle CRLF
          if (char === '\r' && nextChar === '\n') {
            i += 1;
          }
          pushCell();
          pushRow();
          continue;
        }

        cell += char;
      }

      // Handle last cell/row
      pushCell();
      pushRow();
      return rows;
    };

    const rows = parseCsv(csvText);
    const rowCount = Math.max(0, rows.length - 1);

    console.log(`📊 CSV Import: Parsed ${rows.length} rows (${rowCount} data rows)`);

    if (rows.length < 2) {
      return res.status(400).json({ message: 'CSV file is empty or invalid' });
    }

    const headers = rows[0].map(h => String(h || '').toLowerCase().trim());
    console.log(`📋 CSV Headers: ${headers.join(', ')}`);

    const requiredHeaders = ['type', 'category', 'subcategory', 'questiontext'];

    const normalizeImportedText = (value) => String(value || '')
      .replace(/\r\n/g, '\n')
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n');

    // Improved value normalization - no more auto-merging
    // If values don't match headers, log warning and handle gracefully
    const normalizeValuesForHeaders = (values = [], rowIndex) => {
      const normalized = [...values];
      
      if (normalized.length === headers.length) {
        return normalized;
      }
      
      if (normalized.length < headers.length) {
        // Pad with empty strings
        normalized.push(...Array(headers.length - normalized.length).fill(''));
        return normalized;
      }

      // More values than headers - this shouldn't happen with properly quoted CSV
      // Log warning and truncate
      console.warn(`⚠️ Row ${rowIndex}: ${normalized.length} values vs ${headers.length} headers. Extra values will be truncated.`);
      console.warn(`   First extra value: "${String(normalized[headers.length] || '').substring(0, 50)}..."`);
      
      return normalized.slice(0, headers.length);
    };

    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing required headers: ${missing.join(', ')}. Required: ${requiredHeaders.join(', ')}` });
    }

    const questions = [];
    const errors = [];
    let inserted = 0;
    let updated = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const values = normalizeValuesForHeaders(rows[i], i);

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      // Basic validation
      if (!row.type || !row.category || !row.subcategory || !row.questiontext) {
        errors.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      // ── AUTO-DETECT QUESTION TYPE ──
      // Normalize the type value from CSV to match our enum
      const rawType = String(row.type).trim().toLowerCase();
      const typeAliases = {
        'fill-in-the-blank': 'fill-blank',
        'fill in the blank': 'fill-blank',
        'fill in blank': 'fill-blank',
        'fill-blank': 'fill-blank',
        'fillblank': 'fill-blank',
        'fill_the_blank': 'fill-blank',
        'fitb': 'fill-blank',
        'fib': 'fill-blank',
        'highlight': 'highlight',
        'hot-spot': 'hotspot',
        'hot spot': 'hotspot',
        'hotspot': 'hotspot',
        'drag-and-drop': 'drag-drop',
        'drag and drop': 'drag-drop',
        'drag drop': 'drag-drop',
        'drag-drop': 'drag-drop',
        'dragdrop': 'drag-drop',
        'multiple-choice': 'multiple-choice',
        'multiple choice': 'multiple-choice',
        'mcq': 'multiple-choice',
        'mc': 'multiple-choice',
        'sata': 'sata',
        'select all that apply': 'sata',
        'select-all-that-apply': 'sata',
        'multiple-answer': 'sata',
        'cloze-dropdown': 'cloze-dropdown',
        'cloze dropdown': 'cloze-dropdown',
        'cloze': 'cloze-dropdown',
        'matrix': 'matrix',
        'case-study': 'case-study',
        'case study': 'case-study',
      };
      let questionType = typeAliases[rawType] || rawType;
      // Validate final type against enum
      const validTypes = ['multiple-choice', 'sata', 'fill-blank', 'highlight', 'drag-drop', 'matrix', 'hotspot', 'cloze-dropdown', 'case-study'];
      if (!validTypes.includes(questionType)) {
        console.warn(`\u26a0\ufe0f Row ${i + 1}: Unknown type "${row.type}" auto-detected as "${questionType}". Using 'multiple-choice' as fallback.`);
        questionType = 'multiple-choice';
      }

      // Parse options (semicolon separated)
      let options = [];
      if (row.options) {
        options = row.options.split(';').map(o => o.trim()).
        filter(o => o.length > 0);
      }

      // ── AUTO-CORRECT: If type is fill-blank but options exist with "fill in the blank" text, clear them ──
      if (questionType === 'fill-blank') {
        // Remove options that look like fill-blank placeholder text
        options = options.filter(o => {
          const lower = o.toLowerCase();
          return !lower.includes('fill in the blank') &&
                 !lower.includes('fill-in-the-blank') &&
                 !lower.includes('type your answer') &&
                 !lower.includes('type answer here');
        });
      }

      // ── AUTO-CORRECT: If options contain only "fill in the blank" text, change type to fill-blank ──
      if (questionType === 'multiple-choice' && options.length > 0) {
        const allFillBlank = options.every(o => {
          const lower = o.toLowerCase().trim();
          return lower === 'fill in the blank' ||
                 lower === 'fill-in-the-blank' ||
                 lower === 'type your answer' ||
                 lower === 'type answer here' ||
                 lower === '';
        });
        if (allFillBlank) {
          console.log(`\u2705 Row ${i + 1}: Auto-corrected type from 'multiple-choice' to 'fill-blank' (detected fill-blank placeholder options)`);
          questionType = 'fill-blank';
          options = [];
        }
      }

      const toOptionLetter = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const upper = raw.toUpperCase();
        if (/^[A-Z]$/.test(upper)) return upper;
        const idx = options.findIndex((opt) => String(opt || '').trim().toLowerCase() === raw.toLowerCase());
        return idx >= 0 ? String.fromCharCode(65 + idx) : '';
      };

      // Parse correctAnswer
      let correctAnswer = row.correctanswer || '';
      if (questionType === 'sata') {
        const sataParts = String(correctAnswer)
          .split(/[,;]+/)
          .map(c => c.trim())
          .filter(Boolean);
        const mappedSata = sataParts.map(toOptionLetter).filter(Boolean);
        if (!mappedSata.length) {
          errors.push(`Row ${i + 1}: SATA correctAnswer must be option letters or option text values`);
          continue;
        }
        correctAnswer = mappedSata;
      }
      if (questionType === 'multiple-choice') {
        const mappedMc = toOptionLetter(correctAnswer);
        if (!mappedMc) {
          errors.push(`Row ${i + 1}: multiple-choice correctAnswer must match an option letter or option text`);
          continue;
        }
        correctAnswer = mappedMc;
      }
      if (questionType === 'drag-drop' && (!correctAnswer || !String(correctAnswer).trim()) && options.length > 0) {
        correctAnswer = options.map((_, idx) => String.fromCharCode(65 + idx)).join(',');
      }

      // ── Validate required fields ──
      const rawQuestionText = normalizeImportedText(row.questiontext);
      const rawRationale = normalizeImportedText(row.rationale);
      const rawCorrectAnswer = String(row.correctanswer || '').trim();

      if (!rawQuestionText) {
        errors.push(`Row ${i + 1}: questionText is required`);
        continue;
      }
      if (!rawRationale) {
        errors.push(`Row ${i + 1}: rationale is required and cannot be blank`);
        continue;
      }
      if (!rawCorrectAnswer && questionType !== 'drag-drop') {
        errors.push(`Row ${i + 1}: correctAnswer is required for ${questionType} questions`);
        continue;
      }

      const question = {
        type: questionType,
        category: row.category,
        subcategory: row.subcategory,
        clientNeed: String(row.clientneed || '').trim(),
        clientNeedSubcategory: String(row.clientneedsubcategory || '').trim(),
        questionText: rawQuestionText,
        options,
        correctAnswer,
        rationale: rawRationale,
        difficulty: row.difficulty || 'medium',
      };

      if (questionType === 'highlight') {
        const start = Number(row.highlightstart);
        const end = Number(row.highlightend);
        if (!Number.isNaN(start)) question.highlightStart = start;
        if (!Number.isNaN(end)) question.highlightEnd = end;
      }

      if (row.type === 'matrix') {
        let matrixColumns = [];
        let matrixRows = [];

        if (row.matrixcolumns) {
          if (String(row.matrixcolumns).trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(row.matrixcolumns);
              if (Array.isArray(parsed)) matrixColumns = parsed.map((c) => String(c || '').trim()).filter(Boolean);
            } catch {
              // Fallback handled below
            }
          }
          if (!matrixColumns.length) {
            matrixColumns = String(row.matrixcolumns).split(';').map((c) => c.trim()).filter(Boolean);
          }
        }

        if (row.matrixrows) {
          if (String(row.matrixrows).trim().startsWith('[')) {
            try {
              const parsed = JSON.parse(row.matrixrows);
              if (Array.isArray(parsed)) {
                matrixRows = parsed
                  .map((r) => ({
                    rowText: String(r?.rowText || '').trim(),
                    correctColumn: Number(r?.correctColumn)
                  }))
                  .filter((r) => r.rowText && !Number.isNaN(r.correctColumn));
              }
            } catch {
              // Fallback handled below
            }
          }
          if (!matrixRows.length) {
            matrixRows = String(row.matrixrows)
              .split(';')
              .map((item) => item.trim())
              .filter(Boolean)
              .map((item) => {
                const [rowText, col] = item.split('|').map((v) => String(v || '').trim());
                return { rowText, correctColumn: Number(col) };
              })
              .filter((r) => r.rowText && !Number.isNaN(r.correctColumn));
          }
        }

        if (!matrixColumns.length || !matrixRows.length) {
          errors.push(`Row ${i + 1}: matrix questions require matrixColumns and matrixRows`);
          continue;
        }

        question.matrixColumns = matrixColumns;
        question.matrixRows = matrixRows;
        question.options = [];
        question.correctAnswer = matrixRows.map((r) => r.correctColumn);
      }

      if (row.type === 'hotspot') {
        const hotspotImageUrl = String(row.hotspotimageurl || '').trim();
        const rawTargets = String(row.hotspottargets || '').trim();
        if (!hotspotImageUrl) {
          errors.push(`Row ${i + 1}: hotspot questions require hotspotImageUrl`);
          continue;
        }
        if (!rawTargets) {
          errors.push(`Row ${i + 1}: hotspot questions require hotspotTargets`);
          continue;
        }

        let hotspotTargets = [];

        if (rawTargets.startsWith('[')) {
          try {
            const parsed = JSON.parse(rawTargets);
            if (Array.isArray(parsed)) {
              hotspotTargets = parsed
                .map((t, idx) => ({
                  id: String(t?.id || `target${idx + 1}`).trim(),
                  label: String(t?.label || '').trim(),
                  x: Number(t?.x),
                  y: Number(t?.y),
                  radius: Number(t?.radius)
                }))
                .filter((t) => t.id && !Number.isNaN(t.x) && !Number.isNaN(t.y));
            }
          } catch {
            // Fallback handled below
          }
        }

        if (!hotspotTargets.length) {
          hotspotTargets = rawTargets
            .split(';')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item, idx) => {
              const [id, label, x, y, radius] = item.split('|').map((v) => String(v || '').trim());
              return {
                id: id || `target${idx + 1}`,
                label: label || id || `Target ${idx + 1}`,
                x: Number(x),
                y: Number(y),
                radius: Number(radius || 6)
              };
            })
            .filter((t) => t.id && !Number.isNaN(t.x) && !Number.isNaN(t.y));
        }

        if (!hotspotTargets.length) {
          errors.push(`Row ${i + 1}: hotspotTargets must be valid JSON or id|label|x|y|radius items`);
          continue;
        }

        const normalizedCorrect = String(correctAnswer || '').trim();
        if (!normalizedCorrect) {
          errors.push(`Row ${i + 1}: hotspot questions require correctAnswer target id`);
          continue;
        }

        const hasCorrectTarget = hotspotTargets.some((t) => String(t.id) === normalizedCorrect);
        if (!hasCorrectTarget) {
          errors.push(`Row ${i + 1}: hotspot correctAnswer must match one hotspot target id`);
          continue;
        }

        question.hotspotImageUrl = hotspotImageUrl;
        question.hotspotTargets = hotspotTargets.map((t) => ({
          ...t,
          radius: Number.isFinite(t.radius) ? Math.max(1, Math.min(20, t.radius)) : 6
        }));
        question.options = [];
        question.correctAnswer = normalizedCorrect;
      }

      if (row.type === 'cloze-dropdown') {
        const clozeTemplate = String(row.clozetemplate || row.questiontext || '').trim();
        const rawClozeBlanks = String(row.clozeblanks || '').trim();
        if (!clozeTemplate) {
          errors.push(`Row ${i + 1}: cloze-dropdown questions require clozeTemplate/questionText`);
          continue;
        }
        if (!rawClozeBlanks) {
          errors.push(`Row ${i + 1}: cloze-dropdown questions require clozeBlanks`);
          continue;
        }

        let clozeBlanks = [];
        if (rawClozeBlanks.startsWith('[')) {
          try {
            const parsed = JSON.parse(rawClozeBlanks);
            if (Array.isArray(parsed)) {
              clozeBlanks = parsed
                .map((b) => ({
                  key: String(b?.key || '').trim(),
                  options: Array.isArray(b?.options)
                    ? b.options.map((opt) => String(opt || '').trim()).filter(Boolean)
                    : [],
                  correctAnswer: String(b?.correctAnswer || '').trim()
                }))
                .filter((b) => b.key && b.correctAnswer);
            }
          } catch {
            // Fallback handled below
          }
        }

        if (!clozeBlanks.length) {
          clozeBlanks = rawClozeBlanks
            .split(';;')
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => {
              const [key, optionsPart, answer] = item.split('|').map((v) => String(v || '').trim());
              return {
                key,
                options: optionsPart ? optionsPart.split('/').map((v) => v.trim()).filter(Boolean) : [],
                correctAnswer: answer
              };
            })
            .filter((b) => b.key && b.correctAnswer);
        }

        if (!clozeBlanks.length) {
          errors.push(`Row ${i + 1}: clozeBlanks must be JSON or key|opt1/opt2|correct blocks`);
          continue;
        }

        const correctAnswerMap = {};
        clozeBlanks.forEach((b) => {
          correctAnswerMap[b.key] = b.correctAnswer;
        });

        question.questionText = clozeTemplate;
        question.clozeTemplate = clozeTemplate;
        question.clozeBlanks = clozeBlanks;
        question.options = [];
        question.correctAnswer = correctAnswerMap;
      }

      if (row.type === 'case-study') {
        const scenario = String(row.casestudyscenario || row.scenario || '').trim();
        const caseStudyType = String(row.casestudytype || '').trim().toLowerCase();
        const rawSections = String(row.casestudysections || '').trim();
        const rawQuestions = String(row.casestudyquestions || '').trim();

        if (!scenario) {
          errors.push(`Row ${i + 1}: case-study questions require caseStudyScenario/scenario`);
          continue;
        }

        if (!rawQuestions) {
          errors.push(`Row ${i + 1}: case-study questions require caseStudyQuestions JSON`);
          continue;
        }

        let sections = [];
        if (rawSections) {
          if (rawSections.startsWith('[')) {
            try {
              const parsedSections = JSON.parse(rawSections);
              if (Array.isArray(parsedSections)) {
                sections = parsedSections
                  .map((s) => ({
                    title: String(s?.title || '').trim(),
                    content: String(s?.content || '').trim()
                  }))
                  .filter((s) => s.title || s.content);
              }
            } catch {
              // Fallback handled below
            }
          }
          if (!sections.length) {
            sections = rawSections
              .split(';;')
              .map((pair) => pair.trim())
              .filter(Boolean)
              .map((pair) => {
                const [title, content] = pair.split('|');
                return {
                  title: String(title || '').trim(),
                  content: String(content || '').trim()
                };
              })
              .filter((s) => s.title || s.content);
          }
        }

        let caseStudyQuestions = [];
        try {
          const parsedQuestions = JSON.parse(rawQuestions);
          if (Array.isArray(parsedQuestions)) {
            caseStudyQuestions = parsedQuestions
              .map((subQ) => ({
                ...subQ,
                category: subQ?.category || row.category,
                subcategory: subQ?.subcategory || row.subcategory
              }))
              .filter((subQ) => subQ?.type && subQ?.questionText);
          }
        } catch {
          errors.push(`Row ${i + 1}: caseStudyQuestions must be valid JSON array`);
          continue;
        }

        if (!caseStudyQuestions.length) {
          errors.push(`Row ${i + 1}: caseStudyQuestions array cannot be empty`);
          continue;
        }

        question.scenario = scenario;
        if (['layered', 'bowtie', 'trend'].includes(caseStudyType)) {
          question.caseStudyType = caseStudyType;
        }
        question.sections = sections;
        question.questions = caseStudyQuestions;
        question.options = [];
        question.correctAnswer = '';
      }

      questions.push(question);
    }

    // Upsert valid questions so existing records are updated (not duplicated)
    if (questions.length > 0) {
      for (const question of questions) {
        const keyFilter = {
          type: String(question.type || '').trim(),
          category: String(question.category || '').trim(),
          subcategory: String(question.subcategory || '').trim(),
          questionText: String(question.questionText || '').trim()
        };

        const existing = await Question.findOne(keyFilter).select('_id');
        if (existing) {
          await Question.findByIdAndUpdate(existing._id, { $set: question }, { runValidators: true });
          updated += 1;
        } else {
          question.uploadedBy = req.user?._id || null;
          await Question.create(question);
          inserted += 1;
        }
      }
    }

    res.json({
      imported: inserted + updated,
      inserted,
      updated,
      processedRows: rowCount,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Import questions from a URL
// @route   POST /api/admin/questions/import-url
// @access  Private (admin only)
const importFromUrl = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !String(url).trim()) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    const validUrl = String(url).trim();
    
    // Validate URL format
    try {
      new URL(validUrl);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }
    
    // Fetch the URL content
    let html = '';
    let pageTitle = '';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(validUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        return res.status(400).json({ message: `Failed to fetch URL: ${response.status} ${response.statusText}` });
      }
      
      html = await response.text();
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        return res.status(400).json({ message: 'URL fetch timed out (15s). The page may be too large or blocking requests.' });
      }
      return res.status(400).json({ message: `Could not fetch URL: ${fetchError.message}. Some websites block automated requests.` });
    }
    
    // Extract text content from HTML (simple approach - remove tags)
    const extractText = (htmlStr) => {
      // Remove script and style tags with content
      let text = htmlStr.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      text = text.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
      // Convert some block elements to newlines
      text = text.replace(/<\/?(p|div|br|h[1-6]|li|tr)[^>]*>/gi, '\n');
      // Remove remaining tags
      text = text.replace(/<[^>]+>/g, '');
      // Decode HTML entities
      text = text.replace(/&nbsp;/g, ' ');
      text = text.replace(/&amp;/g, '&');
      text = text.replace(/&lt;/g, '<');
      text = text.replace(/&gt;/g, '>');
      text = text.replace(/&quot;/g, '"');
      text = text.replace(/&#39;/g, "'");
      text = text.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
      // Clean up whitespace
      text = text.replace(/[ \t]+/g, ' ');
      text = text.replace(/\n\s*\n/g, '\n\n');
      return text.trim();
    };
    
    // Extract page title
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    pageTitle = titleMatch ? extractText(titleMatch[1]) : '';
    
    const textContent = extractText(html);
    
    // Parse questions from text using multiple strategies
    const parsedQuestions = [];
    
    // Strategy 1: Numbered questions (1. 2. 3. etc)
    const numberedPattern = /(?:^|\n)\s*(\d+)\s*[.)]\s*(.+?)(?=\n\s*\d+\s*[.)]|\n\s*(?:Answer|Correct|Explanation|Rationale|The correct|$))/gims;
    let match;
    while ((match = numberedPattern.exec(textContent)) !== null) {
      const questionBlock = match[2].trim();
      if (questionBlock.length < 15) continue; // skip too short
      
      // Try to extract options from the question block
      const optionPattern = /([A-D])\s*[\).]\s*(.+?)(?=\n\s*[A-D]\s*[\).]|\n\s*(?:Answer|Correct|Explanation|$))/gim;
      const extractedOptions = [];
      let optMatch;
      const optionText = questionBlock;
      while ((optMatch = optionPattern.exec(optionText)) !== null) {
        extractedOptions.push(optMatch[2].trim());
      }
      
      // Try to find answer
      const answerMatch = questionBlock.match(/(?:correct answer|answer)[\s:]*([A-D])/i);
      const correctLetter = answerMatch ? answerMatch[1].toUpperCase() : '';
      
      parsedQuestions.push({
        questionText: questionBlock.split(/\n[A-D]\s*[\).]/i)[0].trim(),
        options: extractedOptions.length >= 2 ? extractedOptions : [],
        correctAnswer: correctLetter,
        source: pageTitle || validUrl,
        sourceUrl: validUrl,
      });
    }
    
    // Strategy 2: Questions ending with "?" 
    if (parsedQuestions.length === 0) {
      const questionLines = textContent.split(/\n/).filter(line => line.includes('?') && line.trim().length > 20);
      for (const line of questionLines) {
        const trimmed = line.trim();
        // Look for options nearby (next few lines)
        const lineIdx = textContent.indexOf(trimmed);
        const nearbyText = textContent.substring(lineIdx, lineIdx + 500);
        
        const optionPattern = /([A-D])\s*[\).]\s*(.+?)(?=\n|$)/gim;
        const extractedOptions = [];
        let optMatch;
        while ((optMatch = optionPattern.exec(nearbyText)) !== null) {
          extractedOptions.push(optMatch[2].trim());
        }
        
        const answerMatch = nearbyText.match(/(?:correct answer|answer)[\s:]*([A-D])/i);
        
        parsedQuestions.push({
          questionText: trimmed.split(/[A-D]\s*[\).]/i)[0].trim(),
          options: extractedOptions.length >= 2 ? extractedOptions : [],
          correctAnswer: answerMatch ? answerMatch[1].toUpperCase() : '',
          source: pageTitle || validUrl,
          sourceUrl: validUrl,
        });
      }
    }
    
    // Strategy 3: If still nothing, return raw text as a single draft block
    if (parsedQuestions.length === 0) {
      // Return the raw text content for manual review
      const sentences = textContent.split(/\n\n+/).filter(s => s.trim().length > 20).slice(0, 20);
      
      return res.json({
        success: true,
        source: pageTitle || validUrl,
        sourceUrl: validUrl,
        questions: sentences.map(s => ({
          questionText: s.trim(),
          options: [],
          correctAnswer: '',
          source: pageTitle || validUrl,
          sourceUrl: validUrl,
          needsEditing: true,
        })),
        rawText: textContent.substring(0, 5000),
        message: `Could not auto-parse questions from this page. ${sentences.length} text blocks extracted for manual review.`,
      });
    }
    
    // Save each parsed question as a draft
    const savedDrafts = [];
    const errors = [];
    
    for (let i = 0; i < parsedQuestions.length; i++) {
      const q = parsedQuestions[i];
      try {
        const question = new Question({
          type: 'multiple-choice',
          category: 'Uncategorized',
          subcategory: 'General',
          questionText: q.questionText,
          options: q.options.length >= 2 ? q.options : ['', '', '', ''],
          correctAnswer: q.correctAnswer || '',
          difficulty: 'medium',
          isDraft: true,
          source: q.source,
          uploadedBy: req.user?._id || null,
        });
        const saved = await question.save();
        savedDrafts.push(saved._id);
      } catch (saveErr) {
        errors.push(`Question ${i + 1}: ${saveErr.message}`);
      }
    }
    
    res.json({
      success: true,
      source: pageTitle || validUrl,
      sourceUrl: validUrl,
      questions: parsedQuestions,
      savedDrafts,
      savedCount: savedDrafts.length,
      errors: errors.length,
      errorDetails: errors,
      message: `Found ${parsedQuestions.length} questions from "${pageTitle || validUrl}". ${savedDrafts.length} saved as drafts.`,
    });
  } catch (error) {
    console.error('URL Import Error:', error);
    res.status(500).json({ message: 'Server error during URL import' });
  }
};

// @desc    Check for duplicate questions
// @route   POST /api/admin/questions/check-duplicate
// @access  Private (admin only)
const checkDuplicate = async (req, res) => {
  try {
    const { questionText, excludeId } = req.body;
    
    if (!questionText || !String(questionText).trim()) {
      return res.status(400).json({ message: 'Question text is required' });
    }
    
    const searchText = String(questionText).trim();
    
    // Simple similarity: check for questions with overlapping words
    const normalizeText = (text) => {
      return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2); // skip very short words
    };
    
    const searchWords = normalizeText(searchText);
    
    if (searchWords.length === 0) {
      return res.json({ isDuplicate: false, matches: [] });
    }
    
    // Find questions with any matching words (broad search)
    const wordRegexes = searchWords.slice(0, 10).map(w => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
    
    const orConditions = wordRegexes.map(regex => ({ questionText: { $regex: regex } }));
    
    let query = Question.find({
      $and: orConditions,
      isDraft: false, // Only compare against published questions
    }).select('_id questionText type category subcategory difficulty').lean();
    
    if (excludeId) {
      query = query.where('_id').ne(String(excludeId));
    }
    
    const candidates = await query.limit(50);
    
    // Calculate Jaccard similarity for each candidate
    const matches = candidates.map(candidate => {
      const candidateWords = normalizeText(candidate.questionText);
      const searchSet = new Set(searchWords);
      const candidateSet = new Set(candidateWords);
      
      const intersection = new Set([...searchSet].filter(w => candidateSet.has(w)));
      const union = new Set([...searchSet, ...candidateSet]);
      
      const similarity = union.size > 0 ? intersection.size / union.size : 0;
      
      return {
        _id: candidate._id,
        questionText: candidate.questionText,
        type: candidate.type,
        category: candidate.category,
        subcategory: candidate.subcategory,
        difficulty: candidate.difficulty,
        similarity: Math.round(similarity * 100),
      };
    }).filter(m => m.similarity >= 50) // 50% threshold for reporting
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5); // Top 5 matches
    
    const isDuplicate = matches.length > 0 && matches[0].similarity >= 80;
    
    res.json({
      isDuplicate,
      matches,
      message: isDuplicate 
        ? `Possible duplicate found (${matches[0].similarity}% similar to existing question)`
        : matches.length > 0
          ? `Found ${matches.length} similar questions (below 80% threshold)`
          : 'No similar questions found',
    });
  } catch (error) {
    console.error('Duplicate Check Error:', error);
    res.status(500).json({ message: 'Server error during duplicate check' });
  }
};

// @desc    Create a prepared test assigned to all or individual students
// @route   POST /api/admin/tests
// @access  Private (admin/superadmin)
const createAdminTest = async (req, res) => {
  try {
    const {
      title,
      description = '',
      category = '',
      questions = [],
      duration,
      passingScore = 70,
      maxAttempts = 0,
      assignmentType = 'individual',
      assignedStudents = [],
      proctored = false
    } = req.body;
    let studentsForAssignment = [];

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Test title is required' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    if (!duration || Number(duration) <= 0) {
      return res.status(400).json({ message: 'Valid duration is required' });
    }

    if (!['all', 'individual'].includes(assignmentType)) {
      return res.status(400).json({ message: 'Invalid assignment type' });
    }

    if (assignmentType === 'all' && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admins can assign tests to all students' });
    }

    if (assignmentType === 'individual') {
      const normalizedAssignedStudents = normalizeStudentIds(assignedStudents);
      if (normalizedAssignedStudents.length === 0) {
        return res.status(400).json({ message: 'Select at least one student' });
      }

      if (!isSuperAdminUser(req.user)) {
        const outOfScopeStudent = normalizedAssignedStudents.find(
          (studentId) => !ensureStudentInScopeForAdmin(req.user, studentId)
        );
        if (outOfScopeStudent) {
          return res.status(403).json({ message: 'You can only assign tests to your students' });
        }
      }

      const studentValidationFilter = {
        _id: { $in: normalizedAssignedStudents },
        role: 'student'
      };
      if (!isSuperAdminUser(req.user)) {
        studentValidationFilter._id.$in = normalizedAssignedStudents.filter((studentId) =>
          ensureStudentInScopeForAdmin(req.user, studentId)
        );
      }

      const validStudentCount = await User.countDocuments(studentValidationFilter);

      if (validStudentCount !== normalizedAssignedStudents.length) {
        return res.status(400).json({ message: 'One or more selected students are invalid or outside your scope' });
      }

      studentsForAssignment = normalizedAssignedStudents;
    }

    const validQuestionCount = await Question.countDocuments({ _id: { $in: questions } });
    if (validQuestionCount !== questions.length) {
      return res.status(400).json({ message: 'One or more selected questions are invalid' });
    }

    const test = await Test.create({
      title: String(title).trim(),
      description,
      category,
      questions,
      duration: Number(duration),
      passingScore: Number(passingScore),
      maxAttempts: Number(maxAttempts),
      assignmentType,
      assignedStudents: assignmentType === 'individual' ? studentsForAssignment : [],
      createdBy: req.user._id,
      proctored: Boolean(proctored)
    });


    if (assignmentType === 'individual' && studentsForAssignment.length > 0) {
      const now = new Date();
      const noticeTitle = 'Prepared Test Available';
      const noticeDetail = `Your tutor has prepared a new test for you: ${String(title).trim()}`;
      const activities = studentsForAssignment.map((studentId) => ({
        student: studentId,
        type: 'notification',
        text: noticeTitle,
        detail: noticeDetail,
        description: noticeTitle,
        metadata: {
          message: noticeDetail,
          testId: test._id,
          testTitle: String(title).trim(),
          sentBy: req.user.id,
          sentAt: now.toISOString()
        },
        createdAt: now
      }));

      try {
        await Activity.insertMany(activities);
      } catch (insertError) {
        const fallback = activities.map((item) => ({
          ...item,
          type: 'achievement',
          metadata: { ...(item.metadata || {}), isNotification: true }
        }));
        await Activity.insertMany(fallback);
      }

      // Send email notifications to assigned students
      try {
        const students = await User.find({ _id: { $in: studentsForAssignment }, role: 'student' })
          .select('name email')
          .lean();
        const adminName = req.user?.name || 'Your Tutor';
        const emailPromises = students.map((student) =>
          sendTestAssignmentEmail({
            to: student.email,
            studentName: student.name,
            testTitle: String(title).trim(),
            duration: Number(duration),
            proctored: Boolean(proctored),
            adminName
          })
        );
        await Promise.allSettled(emailPromises);
      } catch (emailError) {
        console.error('Failed to send test assignment emails:', emailError?.message);
        // Don't fail the test creation if emails fail
      }
    }

    res.status(201).json({ message: 'Test created successfully', test });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all students with filters
// @route   GET /api/admin/students
// @access  Private (admin only)
const getStudents = async (req, res) => {
  try {
    const { search, status } = req.query;
    const filter = applyStudentScopeFilter(req.user, { role: 'student' });
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await User.find(filter)
      .select('name email program status createdAt subscriptionStartDate')
      .sort({ createdAt: -1 });

    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new student account by an admin
// @route   POST /api/admin/students
// @access  Private (admin only)
const createStudentByAdmin = async (req, res) => {
  try {
    const { name, email, password, program, phone, country, examDate, lastPaymentDate } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    let subscriptionStartDate = new Date();
    if (lastPaymentDate) {
      const parsedDate = new Date(lastPaymentDate);
      if (!isNaN(parsedDate.getTime())) {
        subscriptionStartDate = parsedDate;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      status: 'active',
      approved: true,
      program,
      phone,
      country,
      examDate,
      subscriptionStartDate,
    });

    // Send welcome email to new student (fire and forget)
    sendStudentWelcomeEmail({
      to: user.email,
      name: user.name,
      isSelfSignup: false
    }).catch((err) => console.error('Failed to send welcome email:', err));

    res.status(201).json({
      message: 'Student account created and activated successfully',
      student: {
        _id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        approved: user.approved,
        subscriptionStartDate: user.subscriptionStartDate
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle student status (activate/deactivate)
// @route   PUT /api/admin/students/:id/toggle-status
// @access  Private (super admin only)
const toggleStudentStatus = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admin can activate/deactivate students' });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Toggle status
    const nextStatus = student.status === 'active' ? 'inactive' : 'active';
    student.status = nextStatus;

    // Superadmin activation also verifies newly created student accounts.
    if (nextStatus === 'active') {
      student.approved = true;
    }

    // If account was auto-deactivated due expired subscription, give a fresh cycle on reactivation.
    if (nextStatus === 'active' && isStudentSubscriptionExpired(student)) {
      student.subscriptionStartDate = new Date();
    }

    await student.save();
    res.json({
      message: `Student ${student.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      status: student.status,
      approved: student.approved,
      subscriptionStartDate: student.subscriptionStartDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a student
// @route   DELETE /api/admin/students/:id
// @access  Private (super admin only)
const deleteStudent = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only super admin can delete students' });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    await student.deleteOne();
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update student last payment date (subscription start)
// @route   PUT /api/admin/students/:id/payment-date
// @access  Private (admin only)
const updateStudentPaymentDate = async (req, res) => {
  try {
    const { lastPaymentDate } = req.body;

    if (!lastPaymentDate) {
      return res.status(400).json({ message: 'Payment date is required' });
    }

    const parsedDate = new Date(lastPaymentDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.subscriptionStartDate = parsedDate;
    await student.save();

    res.json({
      message: 'Payment date updated successfully',
      subscriptionStartDate: student.subscriptionStartDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send notification to students
// @route   POST /api/admin/students/notify
// @access  Private (admin only, superadmin can send to all)
const sendNotification = async (req, res) => {
  try {
    const { title, message, studentIds } = req.body;
    const adminId = req.user.id;
    const admin = req.user;
    const now = new Date();

    // Validate
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    let targetStudentIds = normalizeStudentIds(studentIds);

    // If sending to all students, check if superadmin
    if (!studentIds || studentIds.length === 0) {
      if (admin.role !== 'superadmin') {
        return res.status(403).json({ message: 'Only super admin can send notifications to all students' });
      }
      
      // Get all active students (and include legacy student records without a status field)
      const allStudents = await User.find({
        role: 'student',
        status: { $ne: 'inactive' }
      }).select('_id');
      targetStudentIds = allStudents.map(s => s._id);
    } else {
      if (!isSuperAdminUser(admin)) {
        const outOfScopeStudent = targetStudentIds.find(
          (studentId) => !ensureStudentInScopeForAdmin(admin, studentId)
        );
        if (outOfScopeStudent) {
          return res.status(403).json({ message: 'You can only notify your students' });
        }
      }

      // Resolve and sanitize selected student IDs to real student records only.
      const selectedStudents = await User.find({
        _id: { $in: targetStudentIds },
        role: 'student'
      }).select('_id');
      targetStudentIds = selectedStudents.map((s) => s._id);
    }

    // Deduplicate targets and guard empty target lists early with a useful message.
    targetStudentIds = [...new Set(targetStudentIds.map((id) => String(id)))];
    if (targetStudentIds.length === 0) {
      return res.status(400).json({ message: 'No valid target students found for this notification' });
    }

    let fallbackUsed = false;

    // Store as in-app notifications so students can see them on the dashboard activity feed
    if (targetStudentIds.length > 0) {
      const notificationActivities = targetStudentIds.map((studentId) => ({
        student: studentId,
        type: 'notification',
        text: title,
        detail: message,
        description: title,
        metadata: { message, sentBy: adminId, sentAt: now.toISOString() },
        createdAt: now
      }));

      try {
        await Activity.insertMany(notificationActivities);
      } catch (insertError) {
        // Fallback for environments still running older Activity schema enum definitions.
        fallbackUsed = true;
        const fallbackActivities = targetStudentIds.map((studentId) => ({
          student: studentId,
          type: 'achievement',
          text: title,
          detail: message,
          description: title,
          metadata: { message, sentBy: adminId, sentAt: now.toISOString(), isNotification: true },
          createdAt: now
        }));
        await Activity.insertMany(fallbackActivities);
        console.warn('Notification insert used fallback activity type:', insertError.message);
      }
    }

    // Web push via Firebase Cloud Messaging (optional; skipped when Firebase Admin is not configured).
    const targetStudents = await User.find({
      _id: { $in: targetStudentIds },
      role: 'student'
    }).select('fcmTokens');

    const pushTokens = [
      ...new Set(
        targetStudents.flatMap((student) =>
          Array.isArray(student.fcmTokens) ? student.fcmTokens.map((token) => String(token || '').trim()) : []
        ).filter(Boolean)
      )
    ];

    const pushDelivery = await sendPushNotificationMulticast({
      tokens: pushTokens,
      title,
      body: message,
      data: {
        type: 'admin_notification',
        sentAt: now.toISOString()
      }
    });

    if (pushDelivery.invalidTokens?.length) {
      await User.updateMany(
        { fcmTokens: { $in: pushDelivery.invalidTokens } },
        { $pull: { fcmTokens: { $in: pushDelivery.invalidTokens } } }
      );
    }

    console.log(`Notification sent to ${targetStudentIds.length} students:`, { title, message });

    res.json({ 
      message: `Notification sent to ${targetStudentIds.length} students successfully`,
      count: targetStudentIds.length,
      delivery: 'in-app dashboard activity + FCM web push (when configured)',
      fallbackUsed,
      pushDelivery
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all students for dropdown (both admin roles)
// @route   GET /api/admin/students/list
// @access  Private (admin only)
const getStudentList = async (req, res) => {
  try {
    const students = await User.find(applyStudentScopeFilter(req.user, { role: 'student' }))
      .select('name email program')
      .sort({ name: 1 });
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student progress report
// @route   GET /api/admin/students/:studentId/progress
// @access  Private (admin only)
const getStudentProgress = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { timeRange = '30' } = req.query; // days

    if (!ensureStudentInScopeForAdmin(req.user, studentId)) {
      return res.status(403).json({ message: 'You can only view progress for your students' });
    }

    // Verify student exists
    const student = await User.findById(studentId).select('name email program trustedDevices');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Calculate date range (or allow full history)
    const normalizedTimeRange = String(timeRange).trim().toLowerCase();
    const testResultQuery = { student: studentId };

    if (normalizedTimeRange !== 'all') {
      const days = parseInt(normalizedTimeRange, 10);
      if (!Number.isFinite(days) || days <= 0) {
        return res.status(400).json({ message: 'Invalid timeRange. Use a positive number of days or "all".' });
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      testResultQuery.date = { $gte: startDate, $lte: endDate };
    }

    // Get test results within time range
    const testResults = await TestResult.find(testResultQuery).sort({ date: 1 });

    // Calculate overall stats
    const totalTests = testResults.length;
    const averageScore = totalTests > 0 
      ? Math.round(testResults.reduce((sum, t) => sum + t.percentage, 0) / totalTests) 
      : 0;
    const bestScore = totalTests > 0 
      ? Math.max(...testResults.map(t => t.percentage)) 
      : 0;
    const totalQuestions = testResults.reduce((sum, t) => sum + t.totalQuestions, 0);
    const totalCorrect = testResults.reduce((sum, t) => sum + t.score, 0);

    // Calculate weak areas by category
    const categoryStats = {};
    testResults.forEach(result => {
      if (result.answers) {
        result.answers.forEach(answer => {
          if (answer.category) {
            if (!categoryStats[answer.category]) {
              categoryStats[answer.category] = { total: 0, correct: 0 };
            }
            categoryStats[answer.category].total += 1;
            if (answer.isCorrect) {
              categoryStats[answer.category].correct += 1;
            }
          }
        });
      }
    });

    const weakAreas = Object.entries(categoryStats)
      .map(([category, stats]) => ({
        category,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        attempts: stats.total
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5); // Top 5 weakest

    // Format trend data for chart
    const trendData = testResults.map(t => ({
      date: t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: t.percentage
    }));

    res.json({
      student: {
        name: student.name,
        email: student.email,
        program: student.program || 'NCLEX-RN',
        trustedDevices: Array.isArray(student.trustedDevices)
          ? [...student.trustedDevices]
              .sort((a, b) => new Date(b?.lastUsedAt || 0).getTime() - new Date(a?.lastUsedAt || 0).getTime())
              .map((d) => ({
                recordId: d?._id || null,
                deviceId: d?.deviceId || '',
                label: d?.label || 'Unknown Device',
                verifiedAt: d?.verifiedAt || null,
                lastUsedAt: d?.lastUsedAt || null
              }))
          : []
      },
      stats: {
        totalTests,
        averageScore,
        bestScore,
        totalQuestions,
        totalCorrect,
        overallAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
      },
      weakAreas,
      trendData,
      testResults: testResults.map(t => ({
        _id: t._id,
        testName: t.testName,
        date: t.date,
        score: t.score,
        totalQuestions: t.totalQuestions,
        percentage: t.percentage,
        timeTaken: t.timeTaken,
        passed: t.passed
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get full test result for review (both admin roles)
// @route   GET /api/admin/test-results/:resultId
// @access  Private (admin only)
const getTestResultForReview = async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.resultId);
    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }

    if (!ensureStudentInScopeForAdmin(req.user, testResult.student)) {
      return res.status(403).json({ message: 'You can only review results for your students' });
    }

    res.json(testResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all study materials
// @route   GET /api/admin/content/materials
// @access  Private (admin only)
const getStudyMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find()
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name');
    res.json(materials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new study material
// @route   POST /api/admin/content/materials
// @access  Private (admin only)
// Helper: Notify all active students when a study material is created or updated.
// Sends in-app activity notification, FCM push notification, and email (all fire-and-forget).
const notifyStudentsMaterialUpdate = async ({ materialTitle, materialDescription, materialCategory, action }) => {
  try {
    const activeStudents = await User.find({
      role: 'student',
      status: { $ne: 'inactive' }
    }).select('_id name email fcmTokens');

    if (!activeStudents.length) return;

    const now = new Date();
    const notificationTitle = action === 'added'
      ? 'New Study Material Available'
      : 'Study Material Updated';
    const notificationMessage = `"${materialTitle}" has been ${action}. Log in to check it out!`;

    // 1. In-app activity notifications
    const activityDocs = activeStudents.map((student) => ({
      student: student._id,
      type: 'notification',
      text: notificationTitle,
      detail: notificationMessage,
      description: `${materialTitle} (${materialCategory})`,
      metadata: {
        message: notificationMessage,
        materialTitle,
        materialCategory,
        action,
        sentAt: now.toISOString(),
        isNotification: true
      },
      createdAt: now
    }));

    try {
      await Activity.insertMany(activityDocs);
    } catch (insertErr) {
      // Fallback for older Activity schema enum definitions
      const fallbackDocs = activeStudents.map((student) => ({
        student: student._id,
        type: 'achievement',
        text: notificationTitle,
        detail: notificationMessage,
        description: `${materialTitle} (${materialCategory})`,
        metadata: {
          message: notificationMessage,
          materialTitle,
          materialCategory,
          action,
          sentAt: now.toISOString(),
          isNotification: true
        },
        createdAt: now
      }));
      await Activity.insertMany(fallbackDocs);
      console.warn('Material notification insert used fallback activity type:', insertErr.message);
    }

    // 2. FCM push notifications
    const pushTokens = [
      ...new Set(
        activeStudents.flatMap((s) =>
          Array.isArray(s.fcmTokens) ? s.fcmTokens.map((t) => String(t || '').trim()) : []
        ).filter(Boolean)
      )
    ];

    if (pushTokens.length > 0) {
      const pushDelivery = await sendPushNotificationMulticast({
        tokens: pushTokens,
        title: notificationTitle,
        body: notificationMessage,
        data: {
          type: 'study_material_update',
          action,
          materialTitle,
          materialCategory,
          sentAt: now.toISOString()
        }
      });

      // Clean up invalid FCM tokens
      if (pushDelivery.invalidTokens?.length) {
        await User.updateMany(
          { fcmTokens: { $in: pushDelivery.invalidTokens } },
          { $pull: { fcmTokens: { $in: pushDelivery.invalidTokens } } }
        );
      }
    }

    // 3. Email notifications (batched to avoid SMTP rate limits)
    const BATCH_SIZE = 5;
    const BATCH_DELAY_MS = 2000; // 2 seconds between batches
    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < activeStudents.length; i += BATCH_SIZE) {
      const batch = activeStudents.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((student) =>
          sendStudyMaterialUpdateEmail({
            to: student.email,
            name: student.name,
            materialTitle,
            materialDescription: materialDescription || '',
            materialCategory: materialCategory || 'Study Guide',
            action
          })
        )
      );
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value?.sent) sentCount++;
        else failCount++;
      });

      // Delay between batches (skip delay for the last batch)
      if (i + BATCH_SIZE < activeStudents.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`Material update email results: ${sentCount}/${activeStudents.length} sent, ${failCount} failed`);

    console.log(`Study material notification sent to ${activeStudents.length} students: ${materialTitle} (${action})`);
  } catch (err) {
    console.error('Error in notifyStudentsMaterialUpdate:', err.message);
  }
};

const createStudyMaterial = async (req, res) => {
  try {
    const { title, description, category, fileUrl, fileType, backupUrl, notifyStudents } = req.body;
    const normalizedType = String(fileType || '').trim().toLowerCase();
    if (normalizedType && normalizedType !== 'pdf') {
      return res.status(400).json({ message: 'Only PDF materials are allowed' });
    }

    const material = new StudyMaterial({
      title,
      description,
      category,
      fileUrl,
      backupUrl: backupUrl || '',
      fileType: 'pdf',
      uploadedBy: req.user.id
    });

    await material.save();

    // Notify students in the background if requested
    if (notifyStudents) {
      notifyStudentsMaterialUpdate({
        materialTitle: title,
        materialDescription: description,
        materialCategory: category,
        action: 'added'
      });
    }

    res.status(201).json(material);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a study material
// @route   PUT /api/admin/content/materials/:id
// @access  Private (admin only)
const updateStudyMaterial = async (req, res) => {
  try {
    const { notifyStudents } = req.body;
    const normalizedType = String(req.body?.fileType || '').trim().toLowerCase();
    if (normalizedType && normalizedType !== 'pdf') {
      return res.status(400).json({ message: 'Only PDF materials are allowed' });
    }
    const updates = { ...req.body, fileType: 'pdf' };
    // Remove notifyStudents from the DB update payload
    delete updates.notifyStudents;

    const material = await StudyMaterial.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Notify students in the background if requested
    if (notifyStudents) {
      notifyStudentsMaterialUpdate({
        materialTitle: material.title,
        materialDescription: material.description,
        materialCategory: material.category,
        action: 'updated'
      });
    }

    res.json(material);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a study material
// @route   DELETE /api/admin/content/materials/:id
// @access  Private (admin only)
const deleteStudyMaterial = async (req, res) => {
  try {
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    await material.deleteOne();
    res.json({ message: 'Material deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Upload a file (for study materials, success stories, etc.)
// @route   POST /api/admin/content/upload
// @access  Private (admin only)
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const originalName = req.file.originalname || 'file';
    const ext = path.extname(originalName);
    const extType = ext.replace('.', '').toLowerCase();
    const mimetype = String(req.file.mimetype || '').toLowerCase();
    const isPdf = extType === 'pdf' && (!mimetype || mimetype === 'application/pdf');
    const isImage = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extType)
      && (!mimetype || mimetype.startsWith('image/'));

    console.log(`📤 Upload request: ${originalName} (${mimetype}, ${req.file.size} bytes)`);

    if (!isPdf && !isImage) {
      return res.status(400).json({ message: 'Only PDF and image files are allowed' });
    }

    const fileType = isPdf ? 'pdf' : 'image';
    const category = req.body?.category || 'general';
    console.log(`📁 File type: ${fileType}, Category: ${category}`);

    // ─── Always save to MongoDB first (guaranteed persistent backup) ───
    let mongoFileUrl = null;
    let mongoImageId = null;
    try {
      const imageId = Image.generateImageId();
      const base64Data = req.file.buffer.toString('base64');

      const savedImage = await Image.create({
        imageId,
        filename: originalName,
        mimeType: isPdf ? 'application/pdf' : (mimetype || `image/${extType}`),
        data: base64Data,
        size: req.file.size,
        uploadedBy: req.user?._id || null,
        category: isPdf ? (category || 'study-material') : category,
        altText: req.body?.altText || '',
      });

      mongoFileUrl = `/api/images/${imageId}`;
      mongoImageId = imageId;
      console.log(`✅ ${fileType === 'pdf' ? 'PDF' : 'Image'} saved to MongoDB: ${mongoFileUrl} (${savedImage._id})`);
    } catch (mongoError) {
      console.error(`❌ MongoDB ${fileType} storage failed:`, mongoError.message);
      console.error('   Stack:', mongoError.stack?.split('\n').slice(0, 3).join('\n'));
    }

    // ─── Also upload to Cloudinary (cloud CDN, faster delivery) ───
    if (cloudinaryConfigured) {
      try {
        const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
        const publicId = `nclex-keys/${fileType}s/${Date.now()}-${base}`;

        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              public_id: publicId,
              resource_type: isPdf ? 'raw' : 'image',
              folder: `nclex-keys/${fileType}s`,
              overwrite: true,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });

        console.log(`✅ File uploaded to Cloudinary: ${uploadResult.secure_url}`);

        return res.json({
          fileUrl: uploadResult.secure_url,
          backupUrl: mongoFileUrl,       // MongoDB backup URL in case Cloudinary link breaks
          fileName: originalName,
          fileType,
          storage: 'cloudinary',
          mongoImageId,
        });
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, using MongoDB URL:', cloudinaryError.message);
        // Fall through — we still have MongoDB
      }
    }

    // ─── Cloudinary failed or not configured — use MongoDB URL ───
    if (mongoFileUrl) {
      return res.json({
        fileUrl: mongoFileUrl,
        fileName: originalName,
        fileType,
        storage: 'mongodb',
        imageId: mongoImageId,
      });
    }

    // ─── Last resort: local disk (both Cloudinary AND MongoDB failed) ───
    console.log('⚠️ Both Cloudinary and MongoDB failed, falling back to local disk...');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${Date.now()}-${base}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    const localFileUrl = `/api/uploads/${fileName}`;

    console.log(`⚠️ File saved to local disk (last resort): ${localFileUrl}`);

    res.json({
      fileUrl: localFileUrl,
      fileName: originalName,
      fileType,
      storage: 'local-fallback',
      warning: 'Both Cloudinary and MongoDB storage failed. File saved to local disk as last resort.',
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

// @desc    Calibrate IRT parameters for questions
// @route   POST /api/admin/calibrate-irt
// @access  Private (super admin only)
const calibrateIRT = async (req, res) => {
  try {
    const questions = await Question.find({ timesUsed: { $gt: 20 } });
    
    // In production, use a proper IRT calibration library
    // This is a simplified placeholder
    for (const q of questions) {
      if (q.timesUsed > 20) {
        const successRate = q.correctAttempts / q.timesUsed;
        
        // Rough difficulty estimate (logit)
        q.irtDifficulty = Math.log(successRate / (1 - successRate));
        
        // Rough discrimination (simplified)
        q.irtDiscrimination = 0.5 + Math.random(); // Placeholder
        
        await q.save();
      }
    }
    
    res.json({ message: `Calibrated ${questions.length} questions` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const Instructor = require('../models/Instructor');

// @desc    Get all instructors
// @route   GET /api/admin/instructors
// @access  Private (super admin only)
const getInstructors = async (req, res) => {
  try {
    const instructors = await Instructor.find().sort({ createdAt: -1 });
    res.json(instructors);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create a new instructor
// @route   POST /api/admin/instructors
// @access  Private (super admin only)
const createInstructor = async (req, res) => {
  try {
    const instructor = new Instructor({
      ...req.body,
      createdBy: req.user.id
    });
    await instructor.save();
    res.status(201).json(instructor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Toggle instructor status (activate/deactivate)
// @route   PUT /api/admin/instructors/:id/toggle-status
// @access  Private (super admin only)
const toggleInstructorStatus = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    
    instructor.status = instructor.status === 'active' ? 'inactive' : 'active';
    await instructor.save();
    
    res.json({ 
      message: `Instructor ${instructor.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      status: instructor.status 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an instructor
// @route   DELETE /api/admin/instructors/:id
// @access  Private (super admin only)
const deleteInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }
    await instructor.deleteOne();
    res.json({ message: 'Instructor deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private (super admin only)
const getSystemLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    const filter = {};
    if (level) filter.level = level;
    
    const logs = await SystemLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email role');
    
    const total = await SystemLog.countDocuments(filter);
    
    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const Feedback = require('../models/Feedback');

// @desc    Get all feedback
// @route   GET /api/admin/feedback
// @access  Private (super admin only)
const getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .sort({ createdAt: -1 })
      .populate('student', 'name email');
    res.json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update feedback status/reply
// @route   PUT /api/admin/feedback/:id
// @access  Private (super admin only)
const updateFeedback = async (req, res) => {
  try {
    const { status, reply } = req.body;
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }
    
    if (status) feedback.status = status;
    if (reply) {
      feedback.reply = reply;
      feedback.repliedBy = req.user.id;
      feedback.repliedAt = new Date();
      feedback.status = 'replied';
    }
    
    await feedback.save();
    res.json(feedback);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/admin/feedback/:id
// @access  Private (super admin only)
const deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.json({ message: 'Feedback deleted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Approve a regular admin
// @route   PUT /api/admin/approve/:adminId
// @access  Private (super admin only)
const approveAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.approved = true;
    await admin.save();

    res.json({ message: 'Admin approved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all admin users (superadmins and admins)
// @route   GET /api/admin/users/admins
// @access  Private (superadmin only)
const getAllAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } })
      .select('name email role status approved accessCode createdAt managedStudents')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear one student's trusted device history
// @route   DELETE /api/admin/students/:id/devices
// @access  Private (admin only)
const clearStudentDeviceHistory = async (req, res) => {
  try {
    if (!ensureStudentInScopeForAdmin(req.user, req.params.id)) {
      return res.status(403).json({ message: 'You can only manage your students' });
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    student.trustedDevices = [];
    await student.save();

    res.json({ message: 'Student device history cleared successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Remove one trusted device for a student
// @route   DELETE /api/admin/students/:id/devices/:deviceRecordId
// @access  Private (admin only)
const removeStudentDevice = async (req, res) => {
  try {
    const { id, deviceRecordId } = req.params;

    if (!ensureStudentInScopeForAdmin(req.user, id)) {
      return res.status(403).json({ message: 'You can only manage your students' });
    }

    const student = await User.findById(id);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    const beforeCount = Array.isArray(student.trustedDevices) ? student.trustedDevices.length : 0;
    student.trustedDevices = (student.trustedDevices || []).filter((device) => String(device?._id || '') !== String(deviceRecordId));

    if (student.trustedDevices.length === beforeCount) {
      return res.status(404).json({ message: 'Device record not found' });
    }

    await student.save();
    return res.json({ message: 'Student device removed successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};


// @desc    Get current managed student scope for one admin
// @route   GET /api/admin/users/:adminId/student-scope
// @access  Private (superadmin only)
const getAdminStudentScope = async (req, res) => {
  try {
    const admin = await User.findById(req.params.adminId)
      .select('name email role managedStudents');

    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const assignedIds = getScopedStudentIdsForAdmin(admin);
    const students = await User.find({ role: 'student' })
      .select('name email program status')
      .sort({ name: 1 });

    res.json({
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      },
      assignedStudentIds: assignedIds,
      students
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update managed student scope for one admin
// @route   PUT /api/admin/users/:adminId/student-scope
// @access  Private (superadmin only)
const updateAdminStudentScope = async (req, res) => {
  try {
    const admin = await User.findById(req.params.adminId).select('role managedStudents');
    if (!admin || admin.role !== 'admin') {
      return res.status(404).json({ message: 'Admin not found' });
    }

    const nextStudentIds = normalizeStudentIds(req.body?.studentIds);
    if (nextStudentIds.length > 0) {
      const validStudentCount = await User.countDocuments({
        _id: { $in: nextStudentIds },
        role: 'student'
      });

      if (validStudentCount !== nextStudentIds.length) {
        return res.status(400).json({ message: 'One or more selected students are invalid' });
      }
    }

    admin.managedStudents = nextStudentIds;
    await admin.save();

    res.json({
      message: 'Tutor student scope updated successfully',
      adminId: admin._id,
      assignedCount: nextStudentIds.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get recent questions for dashboard widget
// @route   GET /api/admin/questions/recent
// @access  Private (admin only)
const getRecentQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('questionText type category subcategory createdAt');

    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update an instructor
// @route   PUT /api/admin/instructors/:id
// @access  Private (super admin only)
const updateInstructor = async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    res.json(instructor);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete an admin user
// @route   DELETE /api/admin/users/:adminId
// @access  Private (superadmin only)
const deleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;
    const admin = await User.findById(adminId);

    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (String(admin._id) === String(req.user.id || req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    if (admin.role === 'superadmin') {
      const superAdminCount = await User.countDocuments({ role: 'superadmin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot delete the last super admin' });
      }
    }

    await admin.deleteOne();
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get current admin settings
// @route   GET /api/admin/settings
// @access  Private (admin only)
// ─── Question Flags Management ───
const getQuestionFlags = async (req, res) => {
  try {
    const QuestionFlag = require('../models/QuestionFlag');
    const { resolved, page = 1, limit = 25 } = req.query;
    const filter = {};
    if (resolved === 'true') filter.resolved = true;
    else if (resolved === 'false') filter.resolved = false;

    const [flags, total] = await Promise.all([
      QuestionFlag.find(filter)
        .populate('questionId', 'questionText type category subcategory questionId')
        .populate('studentId', 'name email')
        .populate('resolvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      QuestionFlag.countDocuments(filter),
    ]);

    res.json({ flags, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Error fetching question flags:', error);
    res.status(500).json({ message: 'Failed to fetch question flags' });
  }
};

const resolveQuestionFlag = async (req, res) => {
  try {
    const QuestionFlag = require('../models/QuestionFlag');
    const { adminNote } = req.body;
    const flag = await QuestionFlag.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user._id,
        adminNote: adminNote || '',
      },
      { new: true }
    );
    if (!flag) return res.status(404).json({ message: 'Flag not found' });
    res.json({ message: 'Flag resolved', flag });
  } catch (error) {
    console.error('Error resolving flag:', error);
    res.status(500).json({ message: 'Failed to resolve flag' });
  }
};

const getAdminSettings = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id)
      .select('name email role accessCode adminDeviceLogins trustedDevices');

    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    const deviceLogins = Array.isArray(admin.adminDeviceLogins)
      ? [...admin.adminDeviceLogins].sort(
          (a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime()
        )
      : [];

    res.json({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      canEditAccessCode: false,
      hasAccessCode: Boolean(admin.accessCode),
      deviceLogins
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update current admin name
// @route   PUT /api/admin/settings/profile
// @access  Private (admin only)
const updateAdminProfileSettings = async (req, res) => {
  try {
    const nextName = String(req.body?.name || '').replace(/\s+/g, ' ').trim();
    if (nextName.length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters long' });
    }

    const admin = await User.findById(req.user.id);
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    admin.name = nextName;
    await admin.save();

    res.json({
      message: 'Name updated successfully',
      name: admin.name
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update current admin password
// @route   PUT /api/admin/settings/password
// @access  Private (admin only)
const updateAdminPasswordSettings = async (req, res) => {
  try {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }

    const admin = await User.findById(req.user.id);
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    const currentMatches = await admin.comparePassword(currentPassword);
    if (!currentMatches) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const sameAsCurrent = await admin.comparePassword(newPassword);
    if (sameAsCurrent) {
      return res.status(400).json({ message: 'New password must be different from current password' });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Clear current admin device login records
// @route   DELETE /api/admin/settings/devices
// @access  Private (admin only)
const clearAdminDeviceSettings = async (req, res) => {
  try {
    const admin = await User.findById(req.user.id);
    if (!admin || !['admin', 'superadmin'].includes(admin.role)) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    admin.adminDeviceLogins = [];
    await admin.save();

    res.json({ message: 'Device login records cleared successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get active exam support conversations
// @route   GET /api/admin/exam-support/conversations
// @access  Private (super admin only)
const getExamSupportConversations = async (req, res) => {
  try {
    const pipeline = [
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: { student: '$student', sessionId: '$sessionId' },
          lastMessage: { $first: '$message' },
          lastSenderRole: { $first: '$senderRole' },
          lastSenderName: { $first: '$senderName' },
          lastAt: { $first: '$createdAt' },
          studentName: { $first: '$studentName' },
          unreadAdminCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$senderRole', 'student'] }, { $eq: ['$isReadByAdmin', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastAt: -1 } },
      { $limit: 200 }
    ];

    const rows = await ExamSupportMessage.aggregate(pipeline);

    res.json(rows.map((row) => ({
      studentId: row?._id?.student,
      sessionId: row?._id?.sessionId,
      studentName: row?.studentName || 'Student',
      lastMessage: row?.lastMessage || '',
      lastSenderRole: row?.lastSenderRole || '',
      lastSenderName: row?.lastSenderName || '',
      lastAt: row?.lastAt,
      unreadAdminCount: row?.unreadAdminCount || 0
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get exam support messages for one conversation
// @route   GET /api/admin/exam-support/messages
// @access  Private (super admin only)
const getExamSupportMessagesAdmin = async (req, res) => {
  try {
    const studentId = String(req.query?.studentId || '').trim();
    const sessionId = String(req.query?.sessionId || '').trim();
    if (!studentId || !sessionId) {
      return res.status(400).json({ message: 'studentId and sessionId are required' });
    }

    const messages = await ExamSupportMessage.find({ student: studentId, sessionId })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    await ExamSupportMessage.updateMany(
      { student: studentId, sessionId, senderRole: 'student', isReadByAdmin: false },
      { $set: { isReadByAdmin: true } }
    );

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send exam support message as superadmin
// @route   POST /api/admin/exam-support/messages
// @access  Private (super admin only)
const sendExamSupportMessageAdmin = async (req, res) => {
  try {
    const studentId = String(req.body?.studentId || '').trim();
    const sessionId = String(req.body?.sessionId || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!studentId || !sessionId || !message) {
      return res.status(400).json({ message: 'studentId, sessionId and message are required' });
    }

    const student = await User.findById(studentId).select('name');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const senderRole = 'superadmin';
    const senderName = req.user?.name || 'Super Admin';

    const created = await ExamSupportMessage.create({
      student: studentId,
      studentName: student.name || 'Student',
      sessionId,
      senderRole,
      senderName,
      message,
      isReadByStudent: false,
      isReadByAdmin: true
    });

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Upload Counts: daily, monthly, yearly ───
const getUploadCounts = async (req, res) => {
  try {
    const Question = require('../models/Question');
    const now = new Date();

    // Start of today (midnight)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Start of this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of this year
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Also get last 30 days daily breakdown for the mini chart
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [todayCount, monthCount, yearCount, totalDrafts, totalPublished, last30Days, adminBreakdown] = await Promise.all([
      // Today (published only)
      Question.countDocuments({
        createdAt: { $gte: startOfDay },
        isDraft: { $ne: true },
      }),
      // This month (published only)
      Question.countDocuments({
        createdAt: { $gte: startOfMonth },
        isDraft: { $ne: true },
      }),
      // This year (published only)
      Question.countDocuments({
        createdAt: { $gte: startOfYear },
        isDraft: { $ne: true },
      }),
      // Total drafts
      Question.countDocuments({ isDraft: true }),
      // Total published
      Question.countDocuments({ isDraft: { $ne: true } }),
      // Daily breakdown for last 30 days (published only)
      Question.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            isDraft: { $ne: true },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Per-admin breakdown: today, this month, this year, total
      Question.aggregate([
        {
          $match: { uploadedBy: { $exists: true, $ne: null } },
        },
        {
          $facet: {
            today: [
              { $match: { createdAt: { $gte: startOfDay }, isDraft: { $ne: true } } },
              { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
            ],
            thisMonth: [
              { $match: { createdAt: { $gte: startOfMonth }, isDraft: { $ne: true } } },
              { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
            ],
            thisYear: [
              { $match: { createdAt: { $gte: startOfYear }, isDraft: { $ne: true } } },
              { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
            ],
            total: [
              { $match: { isDraft: { $ne: true } } },
              { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
            ],
          },
        },
      ]),
    ]);

    // Build daily map for easy lookup
    const dailyMap = {};
    last30Days.forEach((d) => {
      dailyMap[d._id] = d.count;
    });

    // Fill in missing days with 0
    const dailyBreakdown = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyBreakdown.push({
        date: key,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: dailyMap[key] || 0,
      });
    }

    // Build per-admin stats map: { adminId: { today, thisMonth, thisYear, total } }
    const perAdminStats = {};
    if (adminBreakdown && adminBreakdown.length > 0) {
      const facet = adminBreakdown[0];
      const mergeFacet = (arr) => {
        (arr || []).forEach((entry) => {
          const id = String(entry._id);
          if (!perAdminStats[id]) perAdminStats[id] = { today: 0, thisMonth: 0, thisYear: 0, total: 0 };
        });
      };
      // Pre-create all entries
      mergeFacet(facet.today);
      mergeFacet(facet.thisMonth);
      mergeFacet(facet.thisYear);
      mergeFacet(facet.total);
      // Fill counts
      (facet.today || []).forEach((e) => { perAdminStats[String(e._id)].today = e.count; });
      (facet.thisMonth || []).forEach((e) => { perAdminStats[String(e._id)].thisMonth = e.count; });
      (facet.thisYear || []).forEach((e) => { perAdminStats[String(e._id)].thisYear = e.count; });
      (facet.total || []).forEach((e) => { perAdminStats[String(e._id)].total = e.count; });
    }

    res.json({
      today: todayCount,
      thisMonth: monthCount,
      thisYear: yearCount,
      totalPublished,
      totalDrafts,
      dailyBreakdown,
      perAdminStats,
    });
  } catch (error) {
    console.error('Error fetching upload counts:', error);
    res.status(500).json({ message: 'Failed to fetch upload counts' });
  }
};

// ─── Recalculate all test scores with updated SATA scoring ───
const recalculateTestScores = async (req, res) => {
  try {
    const TestResult = require('../models/testResult');
    const Question = require('../models/Question');

    const results = await TestResult.find({
      status: { $in: ['completed', 'exited'] },
    }).lean();

    if (!results.length) {
      return res.json({ message: 'No test results found to recalculate.', updated: 0 });
    }

    const questionIds = new Set();
    for (const result of results) {
      if (Array.isArray(result.answers)) {
        for (const ans of result.answers) {
          if (ans.questionId) questionIds.add(String(ans.questionId));
        }
      }
    }

    const questions = await Question.find({
      _id: { $in: Array.from(questionIds) },
    }).lean();
    const questionMap = new Map();
    for (const q of questions) {
      questionMap.set(String(q._id), q);
    }

    const norm = (v) => {
      if (!v) return '';
      const s = String(v).trim().toUpperCase();
      if (/^[A-Z]$/.test(s)) return s;
      const m = s.match(/^(\d+)$/);
      if (m && parseInt(m[1], 10) >= 1 && parseInt(m[1], 10) <= 26) return String.fromCharCode(64 + parseInt(m[1], 10));
      return s;
    };

    const resolveToLetter = (val, opts) => {
      if (!val || !Array.isArray(opts)) return null;
      const trimmed = String(val).trim();
      for (let i = 0; i < opts.length; i++) {
        if (String(opts[i] || '').trim().toLowerCase() === trimmed.toLowerCase()) {
          return String.fromCharCode(65 + i);
        }
      }
      return null;
    };

    const parseToArray = (answer, opts) => {
      if (!answer) return [];
      if (Array.isArray(answer)) return answer.map(v => resolveToLetter(v, opts) || norm(v)).filter(Boolean);
      const s = String(answer).trim();
      if (s.includes(',')) return s.split(',').map(v => { const r = resolveToLetter(v.trim(), opts); return r || norm(v.trim()); }).filter(Boolean);
      if (/^[A-Za-z]+$/.test(s) && s.length <= 26) return s.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
      if (s.includes(';')) return s.split(';').map(v => { const r = resolveToLetter(v.trim(), opts); return r || norm(v.trim()); }).filter(Boolean);
      const r = resolveToLetter(s, opts);
      return r ? [r] : (norm(s) ? [norm(s)] : []);
    };

    const reEvaluate = (ans, q) => {
      if (!ans || !q) return { earnedMarks: ans.earnedMarks ?? 0, totalMarks: ans.totalMarks ?? 1, isCorrect: ans.isCorrect };
      const type = ans.type || q.type;
      const correctAnswer = ans.correctAnswer || q.correctAnswer;
      const opts = ans.options || q.options || [];

      if (type === 'sata') {
        const userArr = [...new Set(parseToArray(ans.userAnswer, opts))];
        const correctArr = [...new Set(parseToArray(correctAnswer, opts))];
        const totalMarks = correctArr.length || 1;
        const correctPicked = userArr.filter(c => correctArr.includes(c)).length;
        const wrongPicked = userArr.filter(c => !correctArr.includes(c)).length;
        const earnedMarks = Math.max(0, correctPicked - wrongPicked);
        const isCorrect = earnedMarks >= totalMarks ? true : (earnedMarks > 0 ? 'partial' : false);
        return { earnedMarks, totalMarks, isCorrect };
      }

      return { earnedMarks: ans.earnedMarks ?? 0, totalMarks: ans.totalMarks ?? 1, isCorrect: ans.isCorrect };
    };

    let updated = 0;
    let changed = 0;

    for (const result of results) {
      if (!Array.isArray(result.answers) || !result.answers.length) continue;

      let earnedTotal = 0;
      let possibleTotal = 0;
      let answersChanged = false;

      for (let i = 0; i < result.answers.length; i++) {
        const ans = result.answers[i];
        const q = questionMap.get(String(ans.questionId));
        const oldEarned = ans.earnedMarks ?? 0;
        const oldTotal = ans.totalMarks ?? 1;

        const evaluation = reEvaluate(ans, q);
        result.answers[i].earnedMarks = evaluation.earnedMarks;
        result.answers[i].totalMarks = evaluation.totalMarks;
        result.answers[i].isCorrect = evaluation.isCorrect;

        earnedTotal += evaluation.earnedMarks;
        possibleTotal += evaluation.totalMarks;

        if (evaluation.earnedMarks !== oldEarned || evaluation.totalMarks !== oldTotal) {
          answersChanged = true;
        }
      }

      if (!answersChanged) continue;

      const percentage = possibleTotal > 0 ? Math.round((earnedTotal / possibleTotal) * 100) : 0;
      const passed = possibleTotal > 0 && (earnedTotal / possibleTotal) >= 0.7;

      await TestResult.updateOne(
        { _id: result._id },
        {
          $set: {
            answers: result.answers,
            earnedPoints: Number(earnedTotal.toFixed(2)),
            totalPoints: Math.round(possibleTotal),
            percentage,
            passed,
            score: Number(earnedTotal.toFixed(2)),
          },
        }
      );
      updated++;
      changed++;
    }

    res.json({
      message: `Recalculated ${updated} test result(s). ${changed} had score changes.`,
      total: results.length,
      updated,
      changed,
    });
  } catch (error) {
    console.error('Error recalculating test scores:', error);
    res.status(500).json({ message: 'Failed to recalculate test scores' });
  }
};

module.exports = {
  getAdminStats,
  getUploadCounts,
  exportQuestions,
  getQuestions,
  getQuestionById,
  bulkDeleteQuestions,
  getRecentQuestions,
  deleteQuestion,
  updateQuestion,
  createQuestion,
  bulkImportQuestions,
  importFromUrl,
  checkDuplicate,
  getStudents,
  createStudentByAdmin,
  createAdminTest,
  toggleStudentStatus,
  updateStudentPaymentDate,
  sendNotification,
  deleteStudent,
  getStudentList,
  getStudentProgress,
  getTestResultForReview,
  getStudyMaterials,
  createStudyMaterial,
  updateStudyMaterial,
  deleteStudyMaterial,
  uploadFile,
  getInstructors,
  createInstructor,
  updateInstructor,
  toggleInstructorStatus,
  deleteInstructor,
  getSystemLogs,
  getFeedback,
  updateFeedback,
  deleteFeedback,
  getExamSupportConversations,
  getExamSupportMessagesAdmin,
  sendExamSupportMessageAdmin,
  approveAdmin,
  getAllAdmins,
  getAdminStudentScope,
  updateAdminStudentScope,
  deleteAdmin,
  getAdminSettings,
  getQuestionFlags,
  resolveQuestionFlag,
  updateAdminProfileSettings,
  updateAdminPasswordSettings,
  clearAdminDeviceSettings,
  clearStudentDeviceHistory,
  removeStudentDevice,
  recalculateTestScores,
};
