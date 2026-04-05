const express = require('express');
const router = express.Router();
const { protect, authOnly } = require('../middleware/authMiddleware');
const {
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
} = require('../controllers/studentController');

router.get('/dashboard/stats', protect, getDashboardStats);
router.get('/recent-tests', protect, getRecentTests);
router.get('/activity', protect, getRecentActivity);
router.post('/fcm-token', protect, registerFcmToken);
router.delete('/fcm-token', protect, unregisterFcmToken);
router.get('/available-tests', protect, getAvailableTests);
router.get('/categories', protect, getCategories);
router.get('/subcategory-counts', protect, getSubcategoryCounts);
router.get('/client-needs-counts', protect, getClientNeedsCounts);
router.get('/question-status-counts', protect, getQuestionStatusCounts);
router.post('/generate-test', protect, generateTest);
router.get('/incorrect-questions', protect, getIncorrectQuestions);
router.post('/redo-question', protect, redoQuestion);
router.get('/test-history', protect, getTestHistory);
router.post('/submit-test', protect, submitTest);
router.get('/test-result/:id', protect, getTestResult);
router.get('/test/:id', protect, getPreparedTest);
router.get('/study-materials', authOnly, getStudyMaterials);
router.get('/performance', protect, getPerformanceData);
router.get('/performance-detailed', protect, getPerformanceDataDetailed);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.post('/change-password', protect, changePassword);
router.get('/assigned-tests', protect, getAssignedTests);
router.post('/cat/start', protect, startCATSession);
router.post('/cat/answer', protect, submitCATAnswer);
router.get('/check-weekly-review', protect, checkWeeklyReview);
router.post('/mark-review-done', protect, markReviewDone);
router.get('/public-test-review-status', protect, getPublicTestReviewStatus);
router.post('/public-test-review-reviewed', protect, markPublicTestReviewReviewed);
router.post('/feedback', protect, submitStudentFeedback);
router.get('/exam-support/messages', protect, getExamSupportMessages);
router.post('/exam-support/messages', protect, sendExamSupportMessage);
router.post('/mark-welcome-seen', protect, markWelcomeSeen);

module.exports = router;
