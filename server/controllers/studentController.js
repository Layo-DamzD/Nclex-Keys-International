const User = require('../models/user');
const TestResult = require('../models/testResult');
const Activity = require('../models/Activity');
const Test = require('../models/Test');
const Question = require('../models/Question');
const StudyMaterial = require('../models/StudyMaterial');
const Feedback = require('../models/Feedback');
const ExamSupportMessage = require('../models/ExamSupportMessage');
const { sendExamSupportUsageEmail } = require('../services/emailService');
const { matchCategory, matchSubcategory, CATEGORIES, getCategoriesWithExtras, getClientNeedMatches, matchClientNeedCategory, normalizeClientNeedKey } = require('../constants/categories');

const MAX_FCM_TOKENS_PER_STUDENT = 8;

// @desc    Submit test results
// @route   POST /api/student/submit-test
// @access  Private
const submitTest = async (req, res) => {
  try {
    const { testName, results, totalQuestions, timeTaken, passed, isCustomTest = false, proctoring = null } = req.body;
    const studentId = req.user.id;

    const user = await User.findById(studentId);
    if (!Array.isArray(user.customTestUsedQuestions)) {
      user.customTestUsedQuestions = [];
    }
    if (!Array.isArray(user.customTestOmittedQuestions)) {
      user.customTestOmittedQuestions = [];
    }

    const isAnswered = (answer) => {
      if (answer === undefined || answer === null) return false;
      if (typeof answer === 'string') return answer.trim().length > 0;
      if (Array.isArray(answer)) return answer.length > 0;
      if (typeof answer === 'object') return Object.keys(answer).length > 0;
      return true;
    };

    // Pre-track seen questions and omitted questions (these don't depend on correctness evaluation)
    const questionIds = [...new Set(results.map((r) => String(r.questionId)).filter(Boolean))];

    for (const result of results) {
      const qid = result.questionId;
      const qidStr = String(qid);

      // Add to seenQuestions if not already there
      if (!user.seenQuestions.some((id) => String(id) === qidStr)) {
        user.seenQuestions.push(qid);
      }

      // Track Create Test analytics per student without removing global availability.
      if (isCustomTest && !user.customTestUsedQuestions.some((id) => String(id) === qidStr)) {
        user.customTestUsedQuestions.push(qid);
      }

      if (isCustomTest) {
        const omitted = !isAnswered(result?.userAnswer);
        const hasOmitted = user.customTestOmittedQuestions.some((id) => String(id) === qidStr);
        if (omitted && !hasOmitted) {
          user.customTestOmittedQuestions.push(qid);
        } else if (!omitted && hasOmitted) {
          user.customTestOmittedQuestions = user.customTestOmittedQuestions.filter((id) => String(id) !== qidStr);
        }
      }
    }

    // Fetch question docs for server-side evaluation
    const questionDocs = await Question.find({ _id: { $in: questionIds } })
      .select('_id type category subcategory questionText questionImageUrl options correctAnswer rationale rationaleImageUrl matrixRows matrixColumns hotspotImageUrl hotspotTargets clozeTemplate clozeBlanks');
    const questionMap = new Map(questionDocs.map((q) => [String(q._id), q]));

    // Server-side answer normalization helper (mirrors client-side normalizeToLetter)
    const serverNormalizeToLetter = (answer) => {
      if (answer === null || answer === undefined) return '';
      const str = String(answer).trim().toUpperCase();
      if (/^[A-Z]$/.test(str)) return str;
      const numMatch = str.match(/^(\d+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 1 && num <= 26) return String.fromCharCode(64 + num);
      }
      const optionMatch = str.match(/OPTION\s*(\d+)/i);
      if (optionMatch) {
        const num = parseInt(optionMatch[1], 10);
        if (num >= 1 && num <= 26) return String.fromCharCode(64 + num);
      }
      return str;
    };

    // Resolve a value to a letter by matching against options text (for text-based correctAnswers)
    const serverResolveToLetter = (val, options) => {
      const s = String(val ?? '').trim();
      if (!s) return null;
      const norm = serverNormalizeToLetter(s);
      if (/^[A-Z]$/.test(norm)) return norm;
      const num = parseInt(s, 10);
      if (num >= 1 && num <= 26 && String(num) === s) return String.fromCharCode(64 + num);
      // Match against option text
      if (Array.isArray(options)) {
        const lower = s.toLowerCase();
        for (let i = 0; i < options.length; i++) {
          if (options[i] && String(options[i]).trim().toLowerCase() === lower) {
            return String.fromCharCode(65 + i);
          }
        }
        // Partial match fallback
        for (let i = 0; i < options.length; i++) {
          if (options[i]) {
            const optLower = String(options[i]).toLowerCase();
            if (optLower.includes(lower) || lower.includes(optLower)) {
              return String.fromCharCode(65 + i);
            }
          }
        }
      }
      return null;
    };

    // Server-side answer evaluation (deterministic, does not trust client)
    const serverEvaluateAnswer = (result, q) => {
      const userAnswer = result.userAnswer;
      const correctAnswer = q?.correctAnswer;
      const type = result.type || q?.type;

      if (type === 'multiple-choice') {
        const normUser = serverNormalizeToLetter(userAnswer);
        const opts = q?.options || [];
        // Try letter match first, then text match
        const normCorrect = serverNormalizeToLetter(correctAnswer);
        let resolvedCorrect = normCorrect;
        if (!/^[A-Z]$/.test(normCorrect)) {
          const textMatch = serverResolveToLetter(correctAnswer, opts);
          if (textMatch) resolvedCorrect = textMatch;
        }
        return { isCorrect: normUser === resolvedCorrect && normUser !== '', earnedMarks: (normUser === resolvedCorrect && normUser !== '') ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'sata') {
        const opts = q?.options || [];
        const parseToArray = (answer, useTextMatch) => {
          if (!answer) return [];
          if (Array.isArray(answer)) return answer.map(v => useTextMatch ? (serverResolveToLetter(v, opts) || serverNormalizeToLetter(v)) : serverNormalizeToLetter(v)).filter(Boolean);
          const str = String(answer).trim();
          if (str.includes(',')) return str.split(',').map(v => {
            const resolved = serverResolveToLetter(v.trim(), opts);
            return resolved || serverNormalizeToLetter(v.trim());
          }).filter(Boolean);
          if (str.includes(';')) return str.split(';').map(v => {
            const resolved = serverResolveToLetter(v.trim(), opts);
            return resolved || serverNormalizeToLetter(v.trim());
          }).filter(Boolean);
          if (/^[A-Za-z]+$/.test(str) && str.length <= 26) return str.toUpperCase().split('').filter(c => /[A-Z]/.test(c));
          if (str.includes(' ')) return str.split(/\s+/).map(v => {
            const resolved = serverResolveToLetter(v.trim(), opts);
            return resolved || serverNormalizeToLetter(v.trim());
          }).filter(Boolean);
          const resolved = serverResolveToLetter(str, opts);
          return resolved ? [resolved] : (serverNormalizeToLetter(str) ? [serverNormalizeToLetter(str)] : []);
        };
        const userArr = [...new Set(Array.isArray(userAnswer) ? userAnswer.map(v => {
          const resolved = serverResolveToLetter(v, opts);
          return resolved || serverNormalizeToLetter(v);
        }).filter(Boolean) : parseToArray(userAnswer, true))];
        const correctArr = [...new Set(parseToArray(correctAnswer, true))];
        const totalMarks = Math.max(correctArr.length, 1);
        const correctPicked = userArr.filter(c => correctArr.includes(c)).length;
        const wrongPicked = userArr.filter(c => !correctArr.includes(c)).length;
        // Negative scoring: wrong picks deduct points (can go below 0)
        const earnedMarks = correctPicked - wrongPicked;
        let isCorrect = false;
        if (earnedMarks >= totalMarks) isCorrect = true;
        else if (earnedMarks > 0) isCorrect = 'partial';
        return { isCorrect, earnedMarks, totalMarks };
      }

      if (type === 'fill-blank') {
        if (!userAnswer || !correctAnswer) return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
        const acceptable = String(correctAnswer).split(';').map(a => a.trim().toLowerCase());
        const isCorrect = acceptable.includes(String(userAnswer).trim().toLowerCase());
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'highlight') {
        if (!userAnswer || !correctAnswer) return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
        const correctOptions = String(correctAnswer).split('|').map(a => a.trim().toLowerCase());
        const isCorrect = correctOptions.includes(String(userAnswer).trim().toLowerCase());
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'drag-drop') {
        const isCorrect = String(userAnswer || '') === String(correctAnswer || '');
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'matrix') {
        if (!userAnswer || !Array.isArray(userAnswer) || !Array.isArray(q?.matrixRows)) return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
        const isCorrect = q.matrixRows.every((row, i) => userAnswer[i] === row.correctColumn);
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'hotspot') {
        const isCorrect = String(userAnswer || '').trim() === String(correctAnswer || '').trim();
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'bowtie') {
        if (!userAnswer || !correctAnswer || typeof userAnswer !== 'object' || typeof correctAnswer !== 'object') return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
        const requiredKeys = ['condition', 'actionLeft', 'actionRight', 'parameterLeft', 'parameterRight'];
        const isCorrect = requiredKeys.every(key => String(userAnswer?.[key] || '').trim() === String(correctAnswer?.[key] || '').trim());
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      if (type === 'cloze-dropdown') {
        if (!userAnswer || !correctAnswer || typeof correctAnswer !== 'object') return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
        const expectedKeys = Object.keys(correctAnswer);
        if (!expectedKeys.length) return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
        const isCorrect = expectedKeys.every(key => String(userAnswer?.[key] || '').trim() === String(correctAnswer[key] || '').trim());
        return { isCorrect, earnedMarks: isCorrect ? 1 : 0, totalMarks: 1 };
      }

      // Fallback: use client-provided evaluation
      return { isCorrect: result.isCorrect || false, earnedMarks: result.earnedMarks ?? (result.isCorrect ? 1 : 0), totalMarks: result.totalMarks ?? 1 };
    };

    const enrichedAnswers = results.map((result) => {
      const q = questionMap.get(String(result.questionId));
      // Re-evaluate answer server-side using the correctAnswer from the database
      const evaluation = serverEvaluateAnswer(result, q);
      return {
        ...result,
        type: result.type || q?.type,
        category: result.category || q?.category,
        subcategory: result.subcategory || q?.subcategory,
        questionText: result.questionText || q?.questionText,
        questionImageUrl: result.questionImageUrl || q?.questionImageUrl,
        options: result.options || q?.options,
        correctAnswer: result.correctAnswer || q?.correctAnswer,
        rationale: result.rationale || q?.rationale,
        rationaleImageUrl: result.rationaleImageUrl || q?.rationaleImageUrl,
        hotspotImageUrl: result.hotspotImageUrl || q?.hotspotImageUrl,
        hotspotTargets: result.hotspotTargets || q?.hotspotTargets,
        clozeTemplate: result.clozeTemplate || q?.clozeTemplate,
        clozeBlanks: result.clozeBlanks || q?.clozeBlanks,
        matrixRows: result.matrixRows || q?.matrixRows,
        matrixColumns: result.matrixColumns || q?.matrixColumns,
        // Override client-provided evaluation with server-side evaluation
        isCorrect: evaluation.isCorrect,
        earnedMarks: evaluation.earnedMarks,
        totalMarks: evaluation.totalMarks,
      };
    });

    // Track incorrect questions using SERVER-EVALUATED results
    for (const enriched of enrichedAnswers) {
      const qid = enriched.questionId;
      if (enriched.isCorrect === true || enriched.isCorrect === 'partial') {
        // If answered correctly or partially, remove from incorrect questions if present
        user.incorrectQuestions = user.incorrectQuestions.filter(
          item => item.questionId.toString() !== String(qid)
        );
      } else {
        // Handle incorrect questions
        const existing = user.incorrectQuestions.find(
          item => item.questionId.toString() === String(qid)
        );
        if (existing) {
          existing.attemptCount += 1;
          existing.lastAttempted = new Date();
        } else {
          user.incorrectQuestions.push({
            questionId: qid,
            attemptCount: 1,
            lastAttempted: new Date()
          });
        }
      }
    }

    await user.save();

    const earnedScore = enrichedAnswers.reduce((sum, row) => (
      sum + Number(row?.earnedMarks ?? (row?.isCorrect === true ? 1 : 0))
    ), 0);
    const possibleScore = enrichedAnswers.reduce((sum, row) => (
      sum + Number(row?.totalMarks ?? 1)
    ), 0) || Math.max(Number(totalQuestions) || 0, 1);
    const computedPercentage = Math.round((earnedScore / possibleScore) * 100);

    // Save test result with full answer details
    const testResult = new TestResult({
      student: studentId,
      testName,
      date: new Date(),
      score: Number(earnedScore.toFixed(2)),
      totalQuestions,
      totalPoints: Math.round(possibleScore),
      earnedPoints: Number(earnedScore.toFixed(2)),
      timeTaken,
      percentage: computedPercentage,
      passed: typeof passed === 'boolean' ? passed : computedPercentage >= 70,
      answers: enrichedAnswers,
      proctoring
    });

    await testResult.save();

    // Create activity entry
    const activity = new Activity({
      student: studentId,
      type: 'test_completed',
      description: `Completed ${testName}`,
      metadata: { score: testResult.percentage, proctoring }
    });
    await activity.save();

    res.json({ message: 'Test submitted successfully', testResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get distinct categories from questions
// @route   GET /api/student/categories
// @access  Private
const getCategories = async (req, res) => {
  try {
    const categories = await Question.distinct('category');
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get question counts by subcategory for student custom tests
// @route   GET /api/student/subcategory-counts
// @access  Private
const getSubcategoryCounts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('customTestUsedQuestions customTestOmittedQuestions');
    const customUsedIds = user?.customTestUsedQuestions || [];
    const customOmittedIds = user?.customTestOmittedQuestions || [];

    // Fetch all questions and remap to canonical categories/subcategories
    const allQuestions = await Question.find({}, '_id category subcategory').lean();
    const usedQuestions = customUsedIds.length > 0
      ? await Question.find({ _id: { $in: customUsedIds } }, '_id category subcategory').lean()
      : [];
    const omittedQuestions = customOmittedIds.length > 0
      ? await Question.find({ _id: { $in: customOmittedIds } }, '_id category subcategory').lean()
      : [];

    // Build counts using canonical category/subcategory mapping
    // ONLY count questions that match canonical categories AND canonical subcategories
    const buildCounts = (questions) => {
      const acc = {
        countsByCategorySubcategory: {},
        countsBySubcategory: {},
        countsByCategory: {}
      };
      questions.forEach((q) => {
        const canonicalCat = matchCategory(q.category);
        const canonicalSub = matchSubcategory(canonicalCat, q.subcategory);

        // Skip if category is not in canonical list
        if (!CATEGORIES[canonicalCat]) return;
        // Skip if subcategory is not in canonical list for this category
        if (!CATEGORIES[canonicalCat].includes(canonicalSub)) return;

        acc.countsByCategorySubcategory[canonicalCat] = acc.countsByCategorySubcategory[canonicalCat] || {};
        acc.countsByCategorySubcategory[canonicalCat][canonicalSub] =
          (acc.countsByCategorySubcategory[canonicalCat][canonicalSub] || 0) + 1;

        acc.countsBySubcategory[canonicalSub] =
          (acc.countsBySubcategory[canonicalSub] || 0) + 1;

        acc.countsByCategory[canonicalCat] =
          (acc.countsByCategory[canonicalCat] || 0) + 1;
      });
      return acc;
    };

    const totalCounts = buildCounts(allQuestions);
    const usedCounts = buildCounts(usedQuestions);
    const omittedCounts = buildCounts(omittedQuestions);

    // Send canonical CATEGORIES structure (no extras) so frontend uses the same list
    const canonicalCategories = {};
    Object.entries(CATEGORIES).forEach(([cat, subs]) => {
      canonicalCategories[cat] = [...subs];
    });

    res.json({
      countsByCategorySubcategory: totalCounts.countsByCategorySubcategory,
      countsBySubcategory: totalCounts.countsBySubcategory,
      totalCountsByCategorySubcategory: totalCounts.countsByCategorySubcategory,
      totalCountsBySubcategory: totalCounts.countsBySubcategory,
      usedCountsByCategorySubcategory: usedCounts.countsByCategorySubcategory,
      usedCountsBySubcategory: usedCounts.countsBySubcategory,
      omittedCountsByCategorySubcategory: omittedCounts.countsByCategorySubcategory,
      omittedCountsBySubcategory: omittedCounts.countsBySubcategory,
      countsByCategory: totalCounts.countsByCategory,
      usedCountsByCategory: usedCounts.countsByCategory,
      omittedCountsByCategory: omittedCounts.countsByCategory,
      // Send canonical categories structure so frontend uses the same list
      categoriesWithExtras: canonicalCategories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Generate a custom test based on selected subcategories
// @route   POST /api/student/generate-test
// @access  Private
const generateTest = async (req, res) => {
  try {
    const { subcategories, selections, questionCount, timed, tutorMode, filterMode, clientNeedsSelections, includeTraditional, includeNextGen, difficulty } = req.body;
    
    let query = {};
    
    // Handle Client Needs filtering
    if (filterMode === 'clientNeeds' && Array.isArray(clientNeedsSelections) && clientNeedsSelections.length > 0) {
      // Build query for client needs - match either clientNeed or clientNeedSubcategory
      query.$or = clientNeedsSelections.map((item) => ({
        $or: [
          { clientNeed: item.clientNeed },
          { clientNeedSubcategory: item.clientNeedSubcategory },
          { clientNeedSubcategory: item.clientNeed } // Sometimes the client need IS the subcategory
        ]
      }));
    } else {
      // Standard category/subcategory filtering
      const parsedSelections = Array.isArray(selections)
        ? selections.filter((item) => item?.category && item?.subcategory)
        : [];

      if (parsedSelections.length > 0) {
        query.$or = parsedSelections.map((item) => ({
          category: item.category,
          subcategory: item.subcategory
        }));
      } else if (Array.isArray(subcategories) && subcategories.length > 0) {
        query.subcategory = { $in: subcategories };
      } else {
        return res.status(400).json({ message: 'Select at least one subcategory' });
      }
    }

    // Filter by question type (Traditional vs Next Gen)
    if (includeTraditional === true && includeNextGen === false) {
      query.isNextGen = { $ne: true };
    } else if (includeTraditional === false && includeNextGen === true) {
      query.isNextGen = true;
    }
    // If both are true or both are false, don't filter by isNextGen

    // Filter by difficulty (e.g., for Assessment mode which uses 'hard')
    if (difficulty) {
      query.difficulty = difficulty;
    }

    const matchingCount = await Question.countDocuments(query);
    if (matchingCount < questionCount) {
        return res.status(400).json({
        message: `Only ${matchingCount} questions match your selected categories/subcategories.`
      });
    }

    const questions = await Question.aggregate([
      { $match: query },
      { $sample: { size: questionCount } }
    ]);

    const formattedQuestions = questions.map((q) => ({
      _id: q._id,
      type: q.type,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl,
      options: q.options,
      rationaleImageUrl: q.rationaleImageUrl,
      hotspotImageUrl: q.hotspotImageUrl,
      hotspotTargets: q.hotspotTargets,
      clozeTemplate: q.clozeTemplate,
      clozeBlanks: q.clozeBlanks,
      category: q.category,
      subcategory: q.subcategory,
      clientNeed: q.clientNeed,
      clientNeedSubcategory: q.clientNeedSubcategory,
      isNextGen: q.isNextGen,
      ...(q.type === 'case-study'
        ? {
            scenario: q.scenario,
            sections: Array.isArray(q.sections) ? q.sections : [],
            questions: Array.isArray(q.questions) ? q.questions : []
          }
        : {}),
      // Always include correctAnswer so the client can evaluate answers at submit time.
      // Rationale is only shown in tutor mode or during review.
      ...(tutorMode ? { rationale: q.rationale } : {}),
      correctAnswer: q.correctAnswer
    }));

    res.json({
      questions: formattedQuestions,
      settings: { timed, tutorMode, totalQuestions: questionCount }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all available (prepared) tests for student
// @route   GET /api/student/available-tests
// @access  Private
const getAvailableTests = async (req, res) => {
  try {
    const studentId = req.user.id;
    const tests = await Test.find({
      isActive: true,
      $or: [
        { assignmentType: 'all' },
        { assignmentType: 'individual', assignedStudents: studentId }
      ]
    }).select('title description category questions duration passingScore assignmentType proctored');
    const formatted = tests.map(test => ({
      _id: test._id,
      title: test.title,
      description: test.description,
      category: test.category,
      questionCount: test.questions.length,
      duration: test.duration,
      passingScore: test.passingScore,
      proctored: Boolean(test.proctored)
    }));
    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single prepared test by ID, with full question details
// @route   GET /api/student/test/:id
// @access  Private
const getPreparedTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    const studentId = String(req.user.id);
    const isAllowed =
      test.assignmentType === 'all' ||
      (test.assignmentType === 'individual' &&
        Array.isArray(test.assignedStudents) &&
        test.assignedStudents.some((id) => String(id) === studentId));

    if (!isAllowed) {
      return res.status(403).json({ message: 'You are not assigned to this test' });
    }
    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to format time ago
const formatTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
};

/**
 * Shared helper: count questions by type (subjects vs client needs).
 * Used by both getDashboardStats and getQuestionStatusCounts so numbers
 * are ALWAYS consistent across the app.
 */
const countQuestionBank = async () => {
  const allQuestions = await Question.find(
    {},
    '_id category subcategory clientNeed clientNeedSubcategory'
  ).lean();

  const subjectIds = new Set();
  const clientNeedIds = new Set();

  for (const q of allQuestions) {
    const qId = String(q._id);
    const canonicalCat = matchCategory(q.category);
    const canonicalSub = canonicalCat ? matchSubcategory(canonicalCat, q.subcategory) : null;
    if (canonicalCat && CATEGORIES[canonicalCat] && CATEGORIES[canonicalCat].includes(canonicalSub)) {
      subjectIds.add(qId);
    }
    const cnMatches = getClientNeedMatches(q);
    if (cnMatches.size > 0) {
      clientNeedIds.add(qId);
    }
  }

  return {
    subjectCount: subjectIds.size,
    clientNeedCount: clientNeedIds.size,
    total: new Set([...subjectIds, ...clientNeedIds]).size
  };
};

// @desc    Get student dashboard stats
// @route   GET /api/student/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId).select('seenQuestions');
    const testResults = await TestResult.find({ student: studentId }).select('percentage');
    const qbCounts = await countQuestionBank();
    const totalQuestionBank = qbCounts.total;

    const totalTests = testResults.length;
    const avgScore = totalTests
      ? Math.round((testResults.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / totalTests) * 10) / 10
      : 0;
    const bestScore = totalTests
      ? Math.max(...testResults.map((item) => Number(item.percentage || 0)))
      : 0;
    const attemptedQuestions = Array.isArray(user?.seenQuestions) ? user.seenQuestions.length : 0;

    res.json({ totalTests, avgScore, bestScore, totalQuestionBank, attemptedQuestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get recent test results for student
// @route   GET /api/student/recent-tests
// @access  Private
const getRecentTests = async (req, res) => {
  try {
    const studentId = req.user.id;
    const recentTests = await TestResult.find({ student: studentId })
      .sort({ date: -1 })
      .limit(5)
      .select('testName date timeTaken percentage');
    res.json(recentTests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get recent activity for student
// @route   GET /api/student/activity
// @access  Private
const getRecentActivity = async (req, res) => {
  try {
    const studentId = req.user.id;
    const activities = await Activity.find({ student: studentId })
      .sort({ createdAt: -1 })
      .limit(10);

    const formatted = activities.map(act => {
      let icon = 'bell';
      let detail = '';
      const isNotification = act.type === 'notification' || act.metadata?.isNotification === true;
      switch (act.type) {
        case 'test_completed':
        case 'test':
          icon = 'question-circle';
          detail = `Score: ${act.metadata?.score || 0}%`;
          break;
        case 'video_watched':
        case 'video':
          icon = 'video';
          detail = act.metadata?.videoTitle || '';
          break;
        case 'progress_updated':
        case 'progress':
          icon = 'chart-line';
          detail = act.metadata?.improvement || '+5% improvement';
          break;
        case 'achievement':
          icon = isNotification ? 'bell' : 'award';
          detail = isNotification
            ? (act.metadata?.message || act.detail || '')
            : (act.metadata?.achievementName || '');
          break;
        case 'notification':
          icon = 'bell';
          detail = act.metadata?.message || act.detail || '';
          break;
      }
      return {
        id: String(act._id),
        type: isNotification ? 'notification' : act.type,
        rawType: act.type,
        isNotification,
        icon,
        text: act.description || act.text || 'Notification',
        time: formatTimeAgo(act.createdAt),
        detail: detail || act.detail || '',
        createdAt: act.createdAt
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all incorrect questions for student
// @route   GET /api/student/incorrect-questions
// @access  Private
const getIncorrectQuestions = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId)
      .populate('incorrectQuestions.questionId');
    
    if (!user || !user.incorrectQuestions) {
      return res.json([]);
    }
    
    const questions = user.incorrectQuestions
      .filter(item => item && item.questionId) // Filter out null/missing questions
      .map(item => ({
        _id: item.questionId._id,
        questionText: item.questionId.questionText,
        category: item.questionId.category,
        subcategory: item.questionId.subcategory,
        type: item.questionId.type,
        options: item.questionId.options,
        correctAnswer: item.questionId.correctAnswer,
        rationale: item.questionId.rationale,
        attemptCount: item.attemptCount || 1,
        lastAttempted: item.lastAttempted
      }));
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching incorrect questions:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Redo an incorrect question
// @route   POST /api/student/redo-question
// @access  Private
const redoQuestion = async (req, res) => {
  try {
    const { questionId, answer } = req.body;
    const studentId = req.user.id;
    
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Normalize both answers for comparison (handles "2" vs "B", "b" vs "B", etc.)
    const normalizeAnswer = (val) => {
      if (val === null || val === undefined) return '';
      const str = String(val).trim().toUpperCase();
      if (/^[A-Z]$/.test(str)) return str;
      const numMatch = str.match(/^(\d+)$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num >= 1 && num <= 26) return String.fromCharCode(64 + num);
      }
      return str;
    };
    const normalizedUser = normalizeAnswer(answer);
    const normalizedCorrect = normalizeAnswer(question.correctAnswer);
    const isCorrect = normalizedUser === normalizedCorrect && normalizedUser !== '';
    
    if (isCorrect) {
      await User.findByIdAndUpdate(studentId, {
        $pull: { incorrectQuestions: { questionId } }
      });
      res.json({ message: 'Correct!' });
    } else {
      await User.findOneAndUpdate(
        { _id: studentId, 'incorrectQuestions.questionId': questionId },
        { 
          $inc: { 'incorrectQuestions.$.attemptCount': 1 },
          $set: { 'incorrectQuestions.$.lastAttempted': new Date() }
        }
      );
      res.status(400).json({ message: 'Incorrect. Try again.' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student's test history
// @route   GET /api/student/test-history
// @access  Private
const getTestHistory = async (req, res) => {
  try {
    const studentId = req.user.id;
    const tests = await TestResult.find({ student: studentId })
      .sort({ date: -1 })
      .select('testName date score totalQuestions timeTaken percentage passed');
    res.json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single test result with full details (including questions/answers)
// @route   GET /api/student/test-result/:id
// @access  Private
const getTestResult = async (req, res) => {
  try {
    const testResult = await TestResult.findById(req.params.id);
    if (!testResult) {
      return res.status(404).json({ message: 'Test result not found' });
    }
    if (testResult.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(testResult);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all study materials for students
// @route   GET /api/student/study-materials
// @access  Private
const getStudyMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ isActive: true })
      .sort({ createdAt: -1 })
      .select('title description category fileUrl fileType icon');
    res.json(materials);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student performance data (trends and weak areas)
// @route   GET /api/student/performance
// @access  Private
const getPerformanceData = async (req, res) => {
  try {
    const studentId = req.user.id;

    const testResults = await TestResult.find({ student: studentId })
      .sort({ date: 1 })
      .select('date percentage answers score totalQuestions');

    // Score trend (last 10 tests)
    const trend = testResults.slice(-10).map(t => ({
      date: t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: t.percentage
    }));

    // Aggregate weak areas by category
    const categoryStats = {};

    // Question statistics
    let totalQuestions = 0;
    let usedQuestions = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalOmitted = 0;
    let totalCorrectOnReattempt = 0;

    testResults.forEach(result => {
      if (result.answers && Array.isArray(result.answers)) {
        result.answers.forEach(answer => {
          // Count questions
          totalQuestions += 1;
          usedQuestions += 1;

          const isAnswered = answer.userAnswer !== null &&
                            answer.userAnswer !== undefined &&
                            answer.userAnswer !== '' &&
                            !(Array.isArray(answer.userAnswer) && answer.userAnswer.length === 0);

          if (!isAnswered) {
            totalOmitted += 1;
          } else if (answer.isCorrect === true) {
            totalCorrect += 1;
          } else if (answer.isCorrect === 'partial') {
            // For partial SATA, count earned marks
            totalCorrect += answer.earnedMarks || 0;
            totalIncorrect += (answer.totalMarks || 1) - (answer.earnedMarks || 0);
          } else {
            totalIncorrect += 1;
          }

          // Category stats
          const cat = answer.category || answer.subcategory || 'Unknown';

          if (!categoryStats[cat]) {
            categoryStats[cat] = { total: 0, correct: 0 };
          }
          categoryStats[cat].total += 1;
          if (answer.isCorrect === true) {
            categoryStats[cat].correct += 1;
          }
        });
      }
    });

    const weakAreas = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    })).sort((a, b) => a.accuracy - b.accuracy);

    res.json({
      trend,
      weakAreas: weakAreas.length > 0 ? weakAreas : [
        { category: 'No data yet', accuracy: 0 }
      ],
      stats: {
        totalTests: testResults.length,
        averageScore: testResults.length > 0
          ? Math.round(testResults.reduce((sum, t) => sum + t.percentage, 0) / testResults.length)
          : 0,
        bestScore: testResults.length > 0
          ? Math.max(...testResults.map(t => t.percentage))
          : 0
      },
      questionStats: {
        totalQuestions,
        usedQuestions,
        unusedQuestions: 0, // This would require tracking all available questions
        totalCorrect,
        totalIncorrect,
        totalOmitted,
        totalCorrectOnReattempt
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get student profile
// @route   GET /api/student/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update student profile
// @route   PUT /api/student/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, program, examDate } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (program !== undefined) user.program = program;
    if (examDate !== undefined) user.examDate = examDate || null;

    await user.save();
    const updated = await User.findById(req.user.id).select('-password');
    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Change student password
// @route   POST /api/student/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get tests assigned to student
// @route   GET /api/student/assigned-tests
// @access  Private
const getAssignedTests = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    const tests = await Test.find({
      isActive: true,
      $or: [
        { assignmentType: 'all' },
        { assignmentType: 'individual', assignedStudents: studentId }
      ]
    }).select('title description category questions duration passingScore');
    
    res.json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// server/controllers/studentController.js - Add CAT endpoints

const CATEngine = require('../services/catEngine');

const normalizeCATValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return value;
};

// Resolve value to letter for CAT (handles text-based correctAnswers)
const resolveCATToLetter = (val, options) => {
  const s = String(val ?? '').trim();
  if (!s) return null;
  const upper = s.toUpperCase();
  if (/^[A-Z]$/.test(upper)) return upper;
  const num = parseInt(s, 10);
  if (num >= 1 && num <= 26 && String(num) === s) return String.fromCharCode(64 + num);
  if (Array.isArray(options)) {
    const lower = s.toLowerCase();
    for (let i = 0; i < options.length; i++) {
      if (options[i] && String(options[i]).trim().toLowerCase() === lower) {
        return String.fromCharCode(65 + i);
      }
    }
    for (let i = 0; i < options.length; i++) {
      if (options[i]) {
        const optLower = String(options[i]).toLowerCase();
        if (optLower.includes(lower) || lower.includes(optLower)) {
          return String.fromCharCode(65 + i);
        }
      }
    }
  }
  return upper.length === 1 && /[A-Z]/.test(upper) ? upper : null;
};

const evaluateCATAnswer = (question, answer) => {
  if (!question) return { isCorrect: false, earnedMarks: 0, totalMarks: 1 };
  const expected = question.correctAnswer;
  const opts = question.options || [];

  // ── SATA: partial credit + negative scoring ──
  // 1 correct option = 1 point. Wrong picks deduct 1 point each.
  if (question.type === 'sata') {
    const expectedArr = Array.isArray(expected) ? expected : [expected];
    const answerArr = Array.isArray(answer) ? answer : [answer];

    const correctSet = new Set(
      expectedArr
        .map(v => resolveCATToLetter(v, opts) || normalizeCATValue(v))
        .filter(Boolean)
        .map(v => String(v).toUpperCase())
    );
    const answerSet = new Set(
      answerArr
        .map(v => resolveCATToLetter(v, opts) || normalizeCATValue(v))
        .filter(Boolean)
        .map(v => String(v).toUpperCase())
    );

    const totalMarks = Math.max(correctSet.size, 1);
    let correctPicked = 0;
    let wrongPicked = 0;
    for (const a of answerSet) {
      if (correctSet.has(a)) correctPicked++;
      else wrongPicked++;
    }
    // earnedMarks can go negative (negative scoring for wrong picks)
    const earnedMarks = correctPicked - wrongPicked;
    let isCorrect = false;
    if (earnedMarks >= totalMarks) isCorrect = true;
    else if (earnedMarks > 0) isCorrect = 'partial';
    return { isCorrect, earnedMarks, totalMarks };
  }

  // ── Array answers (non-SATA) ──
  if (Array.isArray(expected) || Array.isArray(answer)) {
    const expectedArr = Array.isArray(expected) ? expected : [expected];
    const answerArr = Array.isArray(answer) ? answer : [answer];
    const a = expectedArr.map(normalizeCATValue).sort();
    const b = answerArr.map(normalizeCATValue).sort();
    const match = JSON.stringify(a) === JSON.stringify(b);
    return { isCorrect: match, earnedMarks: match ? 1 : 0, totalMarks: 1 };
  }

  // ── Object answers (cloze, bowtie, etc.) ──
  if (typeof expected === 'object' || typeof answer === 'object') {
    const match = JSON.stringify(expected) === JSON.stringify(answer);
    return { isCorrect: match, earnedMarks: match ? 1 : 0, totalMarks: 1 };
  }

  // ── MCQ / fill-blank / highlight / hotspot: 1 answer = 1 point ──
  const normExpected = normalizeCATValue(expected);
  const normAnswer = normalizeCATValue(answer);
  let match = normExpected === normAnswer;
  if (!match) {
    const letterA = resolveCATToLetter(expected, opts);
    const letterB = resolveCATToLetter(answer, opts);
    if (letterA && letterB) match = letterA === letterB;
  }
  return { isCorrect: match, earnedMarks: match ? 1 : 0, totalMarks: 1 };
};

// Backward-compatible alias (returns boolean for CAT engine IRT)
const isCATAnswerCorrect = (question, answer) => {
  return evaluateCATAnswer(question, answer).isCorrect === true;
};

// @desc    Start a CAT session
// @route   POST /api/student/cat/start
// @access  Private
const startCATSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    const testType = req.body?.testType || 'cat';
    
    // Get all active questions with IRT parameters
      const questions = await Question.find({
        irtDiscrimination: { $exists: true },
        irtDifficulty: { $exists: true }
      }).lean();
    
    if (questions.length < 85) {
      return res.status(400).json({
        message: 'Insufficient calibrated questions for CAT. Need at least 85.'
      });
    }
    
    // Create CAT engine
    const engine = new CATEngine({
      passingStandard: 0.0, // θ_cut
      minItems: 85,
      maxItems: 150,
      targetSE: 0.3
    });
    
    // Get first item (start with medium difficulty)
    const firstItem = await engine.selectNextItem(0, questions, []);
    
    // Create session record
    const session = {
      studentId,
      testType,
      startTime: new Date(),
      administered: [],
      responses: [],
      earnedMarks: [],
      totalMarks: [],
      theta: 0,
      se: Infinity,
      engine: {
        minItems: 85,
        maxItems: 150,
        targetSE: 0.3,
        passingStandard: 0.0
      }
    };
    
    // Store session in cache/db
    // For now, we'll use a simple in-memory store (in production, use Redis)
    catSessions.set(studentId, session);
    
    res.json({
      question: firstItem,
      questionNumber: 1,
      theta: 0,
      se: null
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit answer and get next CAT question
// @route   POST /api/student/cat/answer
// @access  Private
const submitCATAnswer = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { questionId, answer } = req.body;
    
    // Get session
    const session = catSessions.get(studentId);
    if (!session) {
      return res.status(404).json({ message: 'CAT session not found' });
    }
    
    // Get question
    const question = await Question.findById(questionId);
    
      if (!question) {
        return res.status(404).json({ message: 'Question not found' });
      }

      // Record response with marks-based scoring
      const evaluation = evaluateCATAnswer(question, answer);
      session.administered.push(questionId);
      // For CAT engine (IRT ability estimation), use binary response
      session.responses.push(evaluation.isCorrect === true ? 1 : 0);
      // For points-based scoring (display/results)
      if (!session.earnedMarks) session.earnedMarks = [];
      if (!session.totalMarks) session.totalMarks = [];
      session.earnedMarks.push(evaluation.earnedMarks);
      session.totalMarks.push(evaluation.totalMarks);
    
    // Recreate engine with session parameters
    const engine = new CATEngine({
      passingStandard: session.engine.passingStandard,
      minItems: session.engine.minItems,
      maxItems: session.engine.maxItems,
      targetSE: session.engine.targetSE
    });
    
    // Get all questions
      const allQuestions = await Question.find({
        irtDiscrimination: { $exists: true },
        irtDifficulty: { $exists: true }
      }).lean();
    
    // Re-estimate ability
      const administeredDocs = await Question.find({
        _id: { $in: session.administered }
      }).lean();
      const administeredMap = new Map(
        administeredDocs.map((item) => [String(item._id), item])
      );
      const administeredItems = session.administered
        .map((id) => administeredMap.get(String(id)))
        .filter(Boolean);
    
    session.theta = engine.estimateAbilityEAP(
      session.responses, 
      administeredItems
    );
    
    // Calculate standard error
    session.se = engine.calculateStandardError(session.theta, administeredItems);
    
    // Check if test should stop
    if (engine.shouldStop(session.theta, session.se, session.administered.length, 
                         session.responses, administeredItems)) {
      
      const passed = (session.theta - 1.96 * session.se) > session.engine.passingStandard;
      
      // Save test result
      const testName = session.testType === 'assessment' ? 'Assessment' : 'CAT Adaptive Test';
      const totalEarned = (session.earnedMarks || []).reduce((s, m) => s + m, 0);
      const totalPossible = (session.totalMarks || []).reduce((s, m) => s + m, 0);
      const percentage = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0;

      const testResult = new TestResult({
        student: studentId,
        testName,
        date: new Date(),
        score: totalEarned,
        totalQuestions: session.administered.length,
        totalPoints: totalPossible,
        earnedPoints: totalEarned,
        timeTaken: (new Date() - session.startTime) / 60000,
        percentage,
        passed,
        theta: session.theta,
        se: session.se,
        answers: administeredItems.map((item, i) => ({
          questionId: item._id,
          userAnswer: session.responses[i] ? 'correct' : 'incorrect',
          isCorrect: session.responses[i] === 1,
          earnedMarks: (session.earnedMarks || [])[i] ?? (session.responses[i] ? 1 : 0),
          totalMarks: (session.totalMarks || [])[i] ?? 1,
          correctAnswer: item.correctAnswer,
          questionText: item.questionText,
          options: item.options,
          type: item.type,
          rationale: item.rationale
        }))
      });
      
      await testResult.save();
      
      // Clear session
      catSessions.delete(studentId);
      
      return res.json({
        status: 'completed',
        result: testResult
      });
    }
    
    // Select next question
    const nextItem = await engine.selectNextItem(
      session.theta, 
      allQuestions, 
      session.administered
    );
    
    // Update session
    catSessions.set(studentId, session);
    
    res.json({
      question: nextItem,
      questionNumber: session.administered.length + 1,
      theta: session.theta,
      se: session.se,
      status: 'continue'
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Simple in-memory session store (use Redis in production)
const catSessions = new Map();

// @desc    Check if student needs weekly review
// @route   GET /api/student/check-weekly-review
// @access  Private
const checkWeeklyReview = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId).select('lastReview createdAt');
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const reviewIntervalMs = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const createdAtMs = user.createdAt ? new Date(user.createdAt).getTime() : now;
    const lastReviewMs = Number(user.lastReview) || 0;
    const referenceTime = Math.max(createdAtMs, lastReviewMs);
    const accountAgeMs = now - createdAtMs;

    // Prevent the popup for brand-new accounts and users with no test activity yet.
    if (accountAgeMs < reviewIntervalMs) {
      return res.json({ needsReview: false });
    }

    const hasCompletedAnyTest = await TestResult.exists({ student: studentId });
    if (!hasCompletedAnyTest) {
      return res.json({ needsReview: false });
    }

    // Weekly reminder after signup (7 days) and then every 7 days after dismissal/review.
    const needsReview = now - referenceTime >= reviewIntervalMs;
    
    res.json({ needsReview });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark weekly review as done
// @route   POST /api/student/mark-review-done
// @access  Private
const markReviewDone = async (req, res) => {
  try {
    const studentId = req.user.id;
    await User.findByIdAndUpdate(studentId, {
      lastReview: Date.now()
    });
    res.json({ message: 'Review marked as done' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get public test review status for popup flow
// @route   GET /api/student/public-test-review-status
// @access  Private
const getPublicTestReviewStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId).select('publicTestResult');
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const submittedAt = user?.publicTestResult?.submittedAt ? new Date(user.publicTestResult.submittedAt) : null;
    if (!submittedAt || Number.isNaN(submittedAt.getTime())) {
      return res.json({ hasReview: false, needsPrompt: false });
    }

    const reviewedAt = user?.publicTestResult?.reviewedAt ? new Date(user.publicTestResult.reviewedAt) : null;
    const isReviewed = Boolean(reviewedAt && !Number.isNaN(reviewedAt.getTime()));

    const latestPublicReview = await TestResult.findOne({
      student: studentId,
      testName: /public knowledge test/i
    })
      .sort({ date: -1, createdAt: -1 })
      .select('_id date testName percentage');

    return res.json({
      hasReview: true,
      needsPrompt: !isReviewed,
      reviewed: isReviewed,
      submittedAt,
      reviewedAt: isReviewed ? reviewedAt : null,
      percentage: Number(user?.publicTestResult?.percentage || 0),
      reviewResultId: latestPublicReview?._id || null
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark public test review as reviewed
// @route   POST /api/student/public-test-review-reviewed
// @access  Private
const markPublicTestReviewReviewed = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId).select('publicTestResult');
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const submittedAt = user?.publicTestResult?.submittedAt ? new Date(user.publicTestResult.submittedAt) : null;
    if (!submittedAt || Number.isNaN(submittedAt.getTime())) {
      return res.status(400).json({ message: 'No public test result to review' });
    }

    user.publicTestResult = {
      ...user.publicTestResult,
      reviewedAt: new Date()
    };
    await user.save();
    return res.json({ marked: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Register/update a student's web push (FCM) token
// @route   POST /api/student/fcm-token
// @access  Private
const registerFcmToken = async (req, res) => {
  try {
    const rawToken = String(req.body?.token || '').trim();
    if (!rawToken || rawToken.length < 20) {
      return res.status(400).json({ message: 'Valid FCM token is required' });
    }

    const user = await User.findById(req.user.id).select('role fcmTokens');
    if (!user || user.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!Array.isArray(user.fcmTokens)) {
      user.fcmTokens = [];
    }

    // Keep a token associated with a single student account at a time.
    await User.updateMany(
      { _id: { $ne: user._id }, fcmTokens: rawToken },
      { $pull: { fcmTokens: rawToken } }
    );

    const deduped = [
      rawToken,
      ...user.fcmTokens.filter((token) => token !== rawToken)
    ].slice(0, MAX_FCM_TOKENS_PER_STUDENT);

    user.fcmTokens = deduped;
    await user.save();

    res.json({
      message: 'FCM token registered',
      registered: true,
      tokenCount: user.fcmTokens.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Unregister a student's web push (FCM) token
// @route   DELETE /api/student/fcm-token
// @access  Private
const unregisterFcmToken = async (req, res) => {
  try {
    const rawToken = String(req.body?.token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    await User.findByIdAndUpdate(req.user.id, { $pull: { fcmTokens: rawToken } });
    res.json({ message: 'FCM token removed', removed: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Submit weekly student feedback
// @route   POST /api/student/feedback
// @access  Private
const submitStudentFeedback = async (req, res) => {
  try {
    const { message, rating } = req.body;
    const studentId = req.user.id;

    const user = await User.findById(studentId).select('name email');
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'Feedback message is required' });
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const feedback = await Feedback.create({
      student: user._id,
      studentName: user.name,
      studentEmail: user.email,
      message: String(message).trim(),
      rating: Math.round(numericRating),
      status: 'new'
    });

    // Mark popup as completed so it does not keep showing this week.
    await User.findByIdAndUpdate(studentId, { lastReview: Date.now() });

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get exam support chat messages for current student/session
// @route   GET /api/student/exam-support/messages
// @access  Private
const getExamSupportMessages = async (req, res) => {
  try {
    const studentId = req.user.id;
    const sessionId = String(req.query?.sessionId || '').trim();
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }

    const messages = await ExamSupportMessage.find({ student: studentId, sessionId })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    await ExamSupportMessage.updateMany(
      { student: studentId, sessionId, senderRole: { $in: ['admin', 'superadmin'] }, isReadByStudent: false },
      { $set: { isReadByStudent: true } }
    );

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Send exam support message as student
// @route   POST /api/student/exam-support/messages
// @access  Private
const sendExamSupportMessage = async (req, res) => {
  try {
    const studentId = req.user.id;
    const sessionId = String(req.body?.sessionId || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!sessionId || !message) {
      return res.status(400).json({ message: 'sessionId and message are required' });
    }

    const user = await User.findById(studentId).select('name email');
    if (!user) return res.status(404).json({ message: 'Student not found' });

    const priorStudentMessages = await ExamSupportMessage.countDocuments({
      student: studentId,
      sessionId,
      senderRole: 'student'
    });

    const created = await ExamSupportMessage.create({
      student: studentId,
      studentName: user.name || 'Student',
      sessionId,
      senderRole: 'student',
      senderName: user.name || 'Student',
      message,
      isReadByAdmin: false,
      isReadByStudent: true
    });

    if (priorStudentMessages === 0) {
      const emailResult = await sendExamSupportUsageEmail({
        studentName: user.name || 'Student',
        studentEmail: user.email || 'Unknown',
        sessionId,
        message
      });
      if (!emailResult?.sent) {
        console.warn('Exam support usage email was not sent:', emailResult?.reason || 'unknown_reason');
      }
    }

    res.status(201).json(created);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get detailed performance data with all answers for filtering
// @route   GET /api/student/performance-detailed
// @access  Private
const getPerformanceDataDetailed = async (req, res) => {
  try {
    const studentId = req.user.id;

    const testResults = await TestResult.find({ student: studentId })
      .sort({ date: 1 })
      .select('date percentage answers score totalQuestions');

    // Score trend (last 10 tests)
    const trend = testResults.slice(-10).map(t => ({
      date: t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: t.percentage
    }));

    // Aggregate all answers for filtering
    const allAnswers = [];
    const categoryStats = {};

    testResults.forEach(result => {
      if (result.answers && Array.isArray(result.answers)) {
        result.answers.forEach(answer => {
          allAnswers.push({
            ...answer.toObject ? answer.toObject() : answer,
            testDate: result.date,
            testId: result._id
          });

          // Category stats
          const cat = answer.category || answer.subcategory || 'Unknown';
          if (!categoryStats[cat]) {
            categoryStats[cat] = { total: 0, correct: 0 };
          }
          categoryStats[cat].total += 1;
          if (answer.isCorrect === true) {
            categoryStats[cat].correct += 1;
          }
        });
      }
    });

    const weakAreas = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    })).sort((a, b) => a.accuracy - b.accuracy);

    res.json({
      trend,
      weakAreas: weakAreas.length > 0 ? weakAreas : [
        { category: 'No data yet', accuracy: 0 }
      ],
      stats: {
        totalTests: testResults.length,
        averageScore: testResults.length > 0
          ? Math.round(testResults.reduce((sum, t) => sum + t.percentage, 0) / testResults.length)
          : 0,
        bestScore: testResults.length > 0
          ? Math.max(...testResults.map(t => t.percentage))
          : 0
      },
      allAnswers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get question counts by NCLEX Client Needs
// @route   GET /api/student/client-needs-counts
// @access  Private
const getClientNeedsCounts = async (req, res) => {
  try {
    // Aggregate counts by BOTH clientNeed and clientNeedSubcategory fields.
    // This mirrors how generateTest queries (it matches either field),
    // ensuring the displayed counts match the questions actually available.
    const questions = await Question.find(
      {
        $or: [
          { clientNeed: { $exists: true, $ne: null, $ne: '' } },
          { clientNeedSubcategory: { $exists: true, $ne: null, $ne: '' } }
        ]
      },
      'clientNeed clientNeedSubcategory isNextGen'
    ).lean();

    // Build counts keyed by normalised canonical client-need name.
    // Use matchClientNeedCategory to map each raw DB value to one of the
    // 16 predefined categories, then normalise with normalizeClientNeedKey
    // (identical to the frontend's normalizeKey) so the key matches exactly
    // what the frontend looks up.
    const countsByClientNeed = {};
    const ngnCountsByClientNeed = {};

    for (const q of questions) {
      // Collect ALL matched canonical categories for this question
      const matchedCNs = new Set();
      const rawValues = [];
      if (q.clientNeed && String(q.clientNeed).trim()) {
        rawValues.push(String(q.clientNeed).trim());
      }
      if (q.clientNeedSubcategory && String(q.clientNeedSubcategory).trim()) {
        rawValues.push(String(q.clientNeedSubcategory).trim());
      }
      for (const rv of rawValues) {
        const canonical = matchClientNeedCategory(rv);
        if (canonical) matchedCNs.add(canonical);
      }

      // Count under each matched canonical category (normalised key)
      for (const cn of matchedCNs) {
        const key = normalizeClientNeedKey(cn);
        countsByClientNeed[key] = (countsByClientNeed[key] || 0) + 1;
        if (q.isNextGen) {
          ngnCountsByClientNeed[key] = (ngnCountsByClientNeed[key] || 0) + 1;
        }
      }
    }

    res.json({
      countsByClientNeed,
      ngnCountsByClientNeed
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get question status counts (unused, incorrect, marked, omitted, correct)
// @route   GET /api/student/question-status-counts
// @access  Private
const getQuestionStatusCounts = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId);

    // Get all questions with fields needed to determine which "tab" they belong to
    const allQuestions = await Question.find(
      {},
      '_id category subcategory clientNeed clientNeedSubcategory isNextGen'
    ).lean();

    // Get status sets from user document
    const seenSet = new Set((user.seenQuestions || []).map(id => String(id)));
    const incorrectSet = new Set((user.incorrectQuestions || []).map(id => String(id)));
    const markedSet = new Set((user.markedQuestions || []).map(id => String(id)));
    const omittedSet = new Set((user.customTestOmittedQuestions || []).map(id => String(id)));

    // Helper: compute status counts for a given list of question IDs
    const computeCounts = (questionIds) => {
      const counts = { unused: 0, correct: 0, incorrect: 0, marked: 0, omitted: 0 };
      let ngnCounts = { unused: 0, correct: 0, incorrect: 0, marked: 0, omitted: 0 };

      for (const qId of questionIds) {
        if (markedSet.has(qId)) {
          counts.marked++;
        } else if (omittedSet.has(qId)) {
          counts.omitted++;
        } else if (incorrectSet.has(qId)) {
          counts.incorrect++;
        } else if (seenSet.has(qId)) {
          counts.correct++;
        } else {
          counts.unused++;
        }
      }
      return counts;
    };

    // Partition questions into subjects (canonical categories) vs client needs
    const subjectQuestionIds = [];
    const clientNeedQuestionIds = [];
    const subjectNgnIds = [];
    const clientNeedNgnIds = [];

    for (const q of allQuestions) {
      const qId = String(q._id);
      const canonicalCat = matchCategory(q.category);
      const canonicalSub = canonicalCat ? matchSubcategory(canonicalCat, q.subcategory) : null;
      const isCanonicalSubject = canonicalCat && CATEGORIES[canonicalCat] && CATEGORIES[canonicalCat].includes(canonicalSub);

      if (isCanonicalSubject) {
        subjectQuestionIds.push(qId);
        if (q.isNextGen) subjectNgnIds.push(qId);
      }

      // Only count as "client need" if at least one clientNeed/clientNeedSubcategory
      // value maps to one of the 16 predefined NCLEX Client Needs categories.
      const cnMatches = getClientNeedMatches(q);
      if (cnMatches.size > 0) {
        clientNeedQuestionIds.push(qId);
        if (q.isNextGen) clientNeedNgnIds.push(qId);
      }
    }

    // Some questions may belong to both (have both canonical category AND clientNeed).
    // That's fine — they show up in both tabs.

    const subjectCounts = computeCounts(subjectQuestionIds);
    const clientNeedCounts = computeCounts(clientNeedQuestionIds);
    const allCounts = computeCounts(allQuestions.map(q => String(q._id)));

    res.json({
      // Overall (kept for backward compat)
      unused: allCounts.unused,
      unusedNgn: 0,
      incorrect: allCounts.incorrect,
      incorrectNgn: 0,
      marked: allCounts.marked,
      markedNgn: 0,
      omitted: allCounts.omitted,
      omittedNgn: 0,
      correct: allCounts.correct,
      correctNgn: 0,
      total: allQuestions.length,
      // Tab-specific: subjects
      subjects: {
        ...subjectCounts,
        total: subjectQuestionIds.length
      },
      // Tab-specific: client needs
      clientNeeds: {
        ...clientNeedCounts,
        total: clientNeedQuestionIds.length
      }
    });
  } catch (error) {
    console.error('Error fetching question status counts:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Mark welcome celebration as seen
// @route   POST /api/student/mark-welcome-seen
// @access  Private
const markWelcomeSeen = async (req, res) => {
  try {
    const studentId = req.user.id;
    const user = await User.findById(studentId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.hasSeenWelcome = true;
    await user.save();
    res.json({ success: true, message: 'Welcome marked as seen' });
  } catch (error) {
    console.error('Error marking welcome as seen:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getDashboardStats,
  getRecentTests,
  getRecentActivity,
  registerFcmToken,
  unregisterFcmToken,
  getAvailableTests,
  getCategories,
  getSubcategoryCounts,
  generateTest,
  getIncorrectQuestions,
  redoQuestion,
  getTestHistory,
  submitTest,
  getTestResult,
  getPreparedTest,
  getStudyMaterials,
  getPerformanceData,
  getPerformanceDataDetailed,
  getProfile,
  updateProfile,
  changePassword,
  getAssignedTests,
  startCATSession,
  submitCATAnswer,
  checkWeeklyReview, 
  markReviewDone,
  getPublicTestReviewStatus,
  markPublicTestReviewReviewed,
  submitStudentFeedback,
  getExamSupportMessages,
  sendExamSupportMessage,
  getClientNeedsCounts,
  getQuestionStatusCounts,
  markWelcomeSeen
};
