const Question = require('../models/Question');
const TestResult = require('../models/testResult');
const User = require('../models/user');
const Test = require('../models/Test');
const StudyMaterial = require('../models/StudyMaterial');
const SystemLog = require('../models/SystemLog');
const Activity = require('../models/Activity');
const ExamSupportMessage = require('../models/ExamSupportMessage');
const { sendPushNotificationMulticast } = require('../services/firebaseAdmin');
const fs = require('fs');
const path = require('path');

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
// @access  Private (admin only)
const getAdminStats = async (req, res) => {
  try {
    const totalQuestions = await Question.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    
    // Calculate total usage (sum of all test attempts)
    const testResults = await TestResult.find();
    const totalUsage = testResults.reduce((sum, t) => sum + t.totalQuestions, 0);
    
    // Calculate average success rate
    const totalCorrect = testResults.reduce((sum, t) => sum + t.score, 0);
    const totalAnswered = testResults.reduce((sum, t) => sum + t.totalQuestions, 0);
    const successRate = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

    res.json({
      totalQuestions,
      totalStudents,
      totalUsage,
      successRate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export all questions as CSV
// @route   GET /api/admin/questions/export
// @access  Private (admin only)
const exportQuestions = async (req, res) => {
  try {
    const questions = await Question.find().lean();
    
    // Define CSV headers
    const headers = ['ID', 'Type', 'Category', 'Subcategory', 'Question', 'Options', 'Correct Answer', 'Rationale', 'Difficulty', 'Times Used', 'Correct %'];
    
    // Convert questions to CSV rows
    const rows = questions.map(q => [
      q._id.toString(),
      q.type,
      q.category,
      q.subcategory,
      `"${q.questionText.replace(/"/g, '""')}"`, // escape quotes
      q.options ? `"${q.options.join('; ').replace(/"/g, '""')}"` : '',
      Array.isArray(q.correctAnswer) ? q.correctAnswer.join('; ') : q.correctAnswer,
      `"${(q.rationale || '').replace(/"/g, '""')}"`,
      q.difficulty,
      q.timesUsed || 0,
      q.timesUsed > 0 ? Math.round((q.correctAttempts / q.timesUsed) * 100) + '%' : '0%'
    ]);

    // Build CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="questions.csv"');
    res.send(csvContent);
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
    const { category, subcategory, type, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (type) filter.type = type;

    const questions = await Question.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('questionText type category subcategory difficulty timesUsed correctAttempts incorrectAttempts');

    const total = await Question.countDocuments(filter);

    res.json({
      questions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
    const { type, category, subcategory, questionText, options, correctAnswer, rationale, difficulty, highlightStart, highlightEnd } = req.body;

    const question = new Question({
      type,
      category,
      subcategory,
      questionText,
      options,
      correctAnswer,
      rationale,
      difficulty,
      highlightStart,
      highlightEnd
    });

    await question.save();
    res.status(201).json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a question
// @route   PUT /api/admin/questions/:id
// @access  Private (admin only)
const updateQuestion = async (req, res) => {
  try {
    const updates = req.body;
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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

    const csvText = req.file.buffer.toString();
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length < 2) {
      return res.status(400).json({ message: 'CSV file is empty or invalid' });
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredHeaders = ['type', 'category', 'subcategory', 'questiontext'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      return res.status(400).json({ message: `Missing headers: ${missing.join(', ')}` });
    }

    const questions = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;

      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      // Basic validation
      if (!row.type || !row.category || !row.subcategory || !row.questiontext) {
        errors.push(`Row ${i + 1}: missing required fields`);
        continue;
      }

      // Parse options (semicolon separated)
      let options = [];
      if (row.options) {
        options = row.options.split(';').map(o => o.trim());
      }

      // Parse correctAnswer
      let correctAnswer = row.correctanswer || '';
      if (row.type === 'sata' && correctAnswer.includes(',')) {
        correctAnswer = correctAnswer.split(',').map(c => c.trim());
      }

      const question = {
        type: row.type,
        category: row.category,
        subcategory: row.subcategory,
        questionText: row.questiontext,
        options,
        correctAnswer,
        rationale: row.rationale || '',
        difficulty: row.difficulty || 'medium',
      };

      questions.push(question);
    }

    // Insert all valid questions
    if (questions.length > 0) {
      await Question.insertMany(questions);
    }

    res.json({
      imported: questions.length,
      errors: errors.length,
      errorDetails: errors
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
      assignmentType = 'individual',
      assignedStudents = []
    } = req.body;

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
      if (!Array.isArray(assignedStudents) || assignedStudents.length === 0) {
        return res.status(400).json({ message: 'Select at least one student' });
      }
      const validStudentCount = await User.countDocuments({
        _id: { $in: assignedStudents },
        role: 'student'
      });
      if (validStudentCount !== assignedStudents.length) {
        return res.status(400).json({ message: 'One or more selected students are invalid' });
      }
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
      assignmentType,
      assignedStudents: assignmentType === 'individual' ? assignedStudents : [],
      createdBy: req.user._id
    });

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
    const filter = { role: 'student' };
    
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
      .select('name email program status createdAt')
      .sort({ createdAt: -1 });

    res.json(students);
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
    student.status = student.status === 'active' ? 'inactive' : 'active';
    await student.save();

    res.json({ 
      message: `Student ${student.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      status: student.status 
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

// @desc    Send notification to students
// @route   POST /api/admin/students/notify
// @access  Private (admin only, superadmin can send to all)
const sendNotification = async (req, res) => {
  try {
    const { title, message, studentIds } = req.body;
    const adminId = req.user.id;
    const admin = await User.findById(adminId);
    const now = new Date();

    // Validate
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    let targetStudentIds = Array.isArray(studentIds) ? studentIds : [];

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
    const students = await User.find({ role: 'student' })
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

    // Verify student exists
    const student = await User.findById(studentId).select('name email program');
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
        program: student.program || 'NCLEX-RN'
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
const createStudyMaterial = async (req, res) => {
  try {
    const { title, description, category, fileUrl, fileType } = req.body;

    const material = new StudyMaterial({
      title,
      description,
      category,
      fileUrl,
      fileType,
      uploadedBy: req.user.id
    });

    await material.save();
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
    const material = await StudyMaterial.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
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

// @desc    Upload a file (for study materials)
// @route   POST /api/admin/content/upload
// @access  Private (admin only)
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const originalName = req.file.originalname || 'file';
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `${Date.now()}-${base}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, req.file.buffer);

    const fileUrl = `/api/uploads/${fileName}`;
    const extType = ext.replace('.', '').toLowerCase();
    const allowedTypes = new Set(['pdf', 'docx', 'pptx', 'mp4']);
    const fileType = allowedTypes.has(extType) ? extType : 'other';
    
    res.json({
      fileUrl,
      fileName: originalName,
      fileType
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
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
      .select('name email role status approved accessCode password createdAt')
      .sort({ createdAt: -1 });
    res.json(admins);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get active exam support conversations
// @route   GET /api/admin/exam-support/conversations
// @access  Private (admin only)
const getExamSupportConversations = async (req, res) => {
  try {
    const rows = await ExamSupportMessage.aggregate([
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
    ]);

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
// @access  Private (admin only)
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

// @desc    Send exam support message as admin/superadmin
// @route   POST /api/admin/exam-support/messages
// @access  Private (admin only)
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

    const senderRole = req.user?.role === 'superadmin' ? 'superadmin' : 'admin';
    const senderName = req.user?.name || (senderRole === 'superadmin' ? 'Super Admin' : 'Admin');

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

module.exports = {
  getAdminStats,
  exportQuestions,
  getQuestions,
  getRecentQuestions,
  deleteQuestion,
  updateQuestion,
  createQuestion,
  bulkImportQuestions,
  getStudents,
  createAdminTest,
  toggleStudentStatus,
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
  deleteAdmin,
  getAdminSettings,
  updateAdminProfileSettings,
  updateAdminPasswordSettings,
  clearAdminDeviceSettings
};
