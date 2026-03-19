const User = require('../models/user');
const TestResult = require('../models/testResult');
const Activity = require('../models/Activity');
const Test = require('../models/Test');
const Question = require('../models/Question');
const StudyMaterial = require('../models/StudyMaterial');
const Feedback = require('../models/Feedback');
const ExamSupportMessage = require('../models/ExamSupportMessage');
const { sendExamSupportUsageEmail } = require('../services/emailService');

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

    // Track seen and incorrect questions
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

      // Handle incorrect questions
      if (!result.isCorrect) {
        const existing = user.incorrectQuestions.find(
          item => item.questionId.toString() === qid
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
      } else {
        // If answered correctly, remove from incorrect questions if present
        user.incorrectQuestions = user.incorrectQuestions.filter(
          item => item.questionId.toString() !== qid
        );
      }
    }

    await user.save();

    const questionIds = [...new Set(results.map((r) => String(r.questionId)).filter(Boolean))];
    const questionDocs = await Question.find({ _id: { $in: questionIds } })
      .select('_id type category subcategory questionText options rationale rationaleImageUrl hotspotImageUrl hotspotTargets clozeTemplate clozeBlanks');
    const questionMap = new Map(questionDocs.map((q) => [String(q._id), q]));

    const enrichedAnswers = results.map((result) => {
      const q = questionMap.get(String(result.questionId));
      return {
        ...result,
        type: result.type || q?.type,
        category: result.category || q?.category,
        subcategory: result.subcategory || q?.subcategory,
        questionText: result.questionText || q?.questionText,
        options: result.options || q?.options,
        rationale: result.rationale || q?.rationale,
        rationaleImageUrl: result.rationaleImageUrl || q?.rationaleImageUrl,
        hotspotImageUrl: result.hotspotImageUrl || q?.hotspotImageUrl,
        hotspotTargets: result.hotspotTargets || q?.hotspotTargets,
        clozeTemplate: result.clozeTemplate || q?.clozeTemplate,
        clozeBlanks: result.clozeBlanks || q?.clozeBlanks
      };
    });

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

    const buildCountsFromRows = (rows) => rows.reduce((acc, row) => {
      const category = row?._id?.category;
      const subcategory = row?._id?.subcategory;
      if (!category || !subcategory) return acc;

      if (!acc.countsByCategorySubcategory[category]) {
        acc.countsByCategorySubcategory[category] = {};
      }

      acc.countsByCategorySubcategory[category][subcategory] = row.count;
      acc.countsBySubcategory[subcategory] = (acc.countsBySubcategory[subcategory] || 0) + row.count;
      return acc;
    }, { countsByCategorySubcategory: {}, countsBySubcategory: {} });

    const groupStage = {
      $group: {
        _id: {
          category: '$category',
          subcategory: '$subcategory'
        },
        count: { $sum: 1 }
      }
    };

    const totalRows = await Question.aggregate([groupStage]);
    const totalCounts = buildCountsFromRows(totalRows);
    const usedRows = customUsedIds.length > 0
      ? await Question.aggregate([{ $match: { _id: { $in: customUsedIds } } }, groupStage])
      : [];
    const omittedRows = customOmittedIds.length > 0
      ? await Question.aggregate([{ $match: { _id: { $in: customOmittedIds } } }, groupStage])
      : [];
    const usedCounts = buildCountsFromRows(usedRows);
    const omittedCounts = buildCountsFromRows(omittedRows);

    res.json({
      countsByCategorySubcategory: totalCounts.countsByCategorySubcategory,
      countsBySubcategory: totalCounts.countsBySubcategory,
      totalCountsByCategorySubcategory: totalCounts.countsByCategorySubcategory,
      totalCountsBySubcategory: totalCounts.countsBySubcategory,
      usedCountsByCategorySubcategory: usedCounts.countsByCategorySubcategory,
      usedCountsBySubcategory: usedCounts.countsBySubcategory,
      omittedCountsByCategorySubcategory: omittedCounts.countsByCategorySubcategory,
      omittedCountsBySubcategory: omittedCounts.countsBySubcategory
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
    const { subcategories, selections, questionCount, timed, tutorMode } = req.body;
    const parsedSelections = Array.isArray(selections)
      ? selections.filter((item) => item?.category && item?.subcategory)
      : [];

    let query = {};
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
      options: q.options,
      rationaleImageUrl: q.rationaleImageUrl,
      hotspotImageUrl: q.hotspotImageUrl,
      hotspotTargets: q.hotspotTargets,
      clozeTemplate: q.clozeTemplate,
      clozeBlanks: q.clozeBlanks,
      category: q.category,
      subcategory: q.subcategory,
      ...(q.type === 'case-study'
        ? {
            scenario: q.scenario,
            sections: Array.isArray(q.sections) ? q.sections : [],
            questions: Array.isArray(q.questions) ? q.questions : []
          }
        : {}),
      ...(tutorMode && { correctAnswer: q.correctAnswer, rationale: q.rationale })
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

// @desc    Get student dashboard stats
// @route   GET /api/student/dashboard/stats
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const studentId = req.user.id;
    const testResults = await TestResult.find({ student: studentId }).select('percentage');

    const totalTests = testResults.length;
    const avgScore = totalTests
      ? Math.round((testResults.reduce((sum, item) => sum + Number(item.percentage || 0), 0) / totalTests) * 10) / 10
      : 0;
    const bestScore = totalTests
      ? Math.max(...testResults.map((item) => Number(item.percentage || 0)))
      : 0;

    res.json({ totalTests, avgScore, bestScore });
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
    
    const questions = user.incorrectQuestions.map(item => ({
      ...item.questionId._doc,
      attemptCount: item.attemptCount,
      lastAttempted: item.lastAttempted
    }));
    
    res.json(questions);
  } catch (error) {
    console.error(error);
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
    
    const isCorrect = question.correctAnswer === answer;
    
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
      .select('date percentage answers');

    // Score trend (last 10 tests)
    const trend = testResults.slice(-10).map(t => ({
      date: t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: t.percentage
    }));

    // Aggregate weak areas by category
    const categoryStats = {};

    testResults.forEach(result => {
      if (result.answers && Array.isArray(result.answers)) {
        result.answers.forEach(answer => {
          // For now, we don't have category in answers, so we'll use questionText as a proxy
          // In a real implementation, you'd store category during test creation
          const cat = answer.category || 'Unknown';
          
          if (!categoryStats[cat]) {
            categoryStats[cat] = { total: 0, correct: 0 };
          }
          categoryStats[cat].total += 1;
          if (answer.isCorrect) {
            categoryStats[cat].correct += 1;
          }
        });
      }
    });

    const weakAreas = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      accuracy: Math.round((stats.correct / stats.total) * 100)
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

const isCATAnswerCorrect = (question, answer) => {
  if (!question) return false;
  const expected = question.correctAnswer;

  if (Array.isArray(expected) || Array.isArray(answer)) {
    const expectedArr = Array.isArray(expected) ? expected : [expected];
    const answerArr = Array.isArray(answer) ? answer : [answer];

    // SATA answers should be order-insensitive; most other array answers are order-sensitive.
    if (question.type === 'sata') {
      const a = expectedArr.map(normalizeCATValue).sort();
      const b = answerArr.map(normalizeCATValue).sort();
      return JSON.stringify(a) === JSON.stringify(b);
    }

    const a = expectedArr.map(normalizeCATValue);
    const b = answerArr.map(normalizeCATValue);
    return JSON.stringify(a) === JSON.stringify(b);
  }

  if (typeof expected === 'object' || typeof answer === 'object') {
    return JSON.stringify(expected) === JSON.stringify(answer);
  }

  return normalizeCATValue(expected) === normalizeCATValue(answer);
};

// @desc    Start a CAT session
// @route   POST /api/student/cat/start
// @access  Private
const startCATSession = async (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Get all active questions with IRT parameters
      const questions = await Question.find({
        irtDiscrimination: { $exists: true },
        irtDifficulty: { $exists: true }
      }).lean();
    
    if (questions.length < 75) {
      return res.status(400).json({ 
        message: 'Insufficient calibrated questions for CAT. Need at least 75.' 
      });
    }
    
    // Create CAT engine
    const engine = new CATEngine({
      passingStandard: 0.0, // θ_cut
      minItems: 75,
      maxItems: 265,
      targetSE: 0.3
    });
    
    // Get first item (start with medium difficulty)
    const firstItem = await engine.selectNextItem(0, questions, []);
    
    // Create session record
    const session = {
      studentId,
      startTime: new Date(),
      administered: [],
      responses: [],
      theta: 0,
      se: Infinity,
      engine: {
        minItems: 75,
        maxItems: 265,
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

      // Record response (score by correctness, not by truthiness of submitted value)
      const isCorrect = isCATAnswerCorrect(question, answer);
      session.administered.push(questionId);
      session.responses.push(isCorrect ? 1 : 0);
    
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
      const testResult = new TestResult({
        student: studentId,
        testName: 'CAT Adaptive Test',
        date: new Date(),
        score: session.responses.filter(r => r === 1).length,
        totalQuestions: session.administered.length,
        timeTaken: (new Date() - session.startTime) / 60000,
        percentage: Math.round((session.responses.filter(r => r === 1).length / 
                               session.administered.length) * 100),
        passed,
        theta: session.theta,
        se: session.se,
        answers: administeredItems.map((item, i) => ({
          questionId: item._id,
          userAnswer: session.responses[i] ? 'correct' : 'incorrect',
          isCorrect: session.responses[i] === 1,
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
  sendExamSupportMessage
};
