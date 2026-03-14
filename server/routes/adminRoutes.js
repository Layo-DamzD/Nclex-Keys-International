const express = require('express');
const router = express.Router();
const { protect, adminOnly, superAdminOnly } = require('../middleware/authMiddleware');
const {
  getAdminStats,
  exportQuestions,
  getQuestions,
  getQuestionById,
  bulkDeleteQuestions,
  getRecentQuestions,
  deleteQuestion,
  createQuestion,
  updateQuestion,
  bulkImportQuestions,
  getStudents,
  createAdminTest,
  toggleStudentStatus,
  sendNotification,
  deleteStudent,
  getStudentList,
  getStudentProgress,
  clearStudentDeviceHistory,
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
  updateAdminProfileSettings,
  updateAdminPasswordSettings,
  clearAdminDeviceSettings
} = require('../controllers/adminController');
const {
  getLandingPageConfig,
  saveLandingPageConfig
} = require('../controllers/landingPageController');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Keep these intentionally high to avoid clipping long rationale imports/uploads.
< codex/fix-review-function-for-admin-and-students-r6oxeg
    fieldSize: 300 * 1024 * 1024,
    fileSize: 500 * 1024 * 1024


    fieldSize: 300 * 1024 * 1024,
    fileSize: 500 * 1024 * 1024
0
    fieldSize: 300 * 1024 * 1024,
    fileSize: 500 * 1024 * 1024

    fieldSize: 50 * 1024 * 1024,
    fileSize: 200 * 1024 * 1024
 main
  }
});

// Dashboard stats
router.get('/stats', protect, adminOnly, getAdminStats);

// Question routes
router.get('/questions/export', protect, adminOnly, exportQuestions);
router.get('/questions/recent', protect, adminOnly, getRecentQuestions);
router.get('/questions', protect, adminOnly, getQuestions);
router.get('/questions/:id', protect, adminOnly, getQuestionById);
router.post('/questions/bulk-delete', protect, adminOnly, bulkDeleteQuestions);
router.delete('/questions/:id', protect, adminOnly, deleteQuestion);
router.post('/questions', protect, adminOnly, createQuestion);
router.put('/questions/:id', protect, adminOnly, updateQuestion);
router.post('/questions/bulk-import', protect, adminOnly, upload.single('file'), bulkImportQuestions);

// Student management routes
router.get('/students', protect, adminOnly, getStudents);
router.put('/students/:id/toggle-status', protect, superAdminOnly, toggleStudentStatus);
router.delete('/students/:id', protect, superAdminOnly, deleteStudent);
router.post('/students/notify', protect, adminOnly, sendNotification);

// Test routes
router.post('/tests', protect, adminOnly, createAdminTest);

// Landing page routes (super admin only)
router.get('/landing-page/:pageKey', protect, superAdminOnly, getLandingPageConfig);
router.put('/landing-page/:pageKey', protect, superAdminOnly, saveLandingPageConfig);

// Progress report routes
router.get('/students/list', protect, adminOnly, getStudentList);
router.get('/students/:studentId/progress', protect, adminOnly, getStudentProgress);
router.delete('/students/:id/devices', protect, adminOnly, clearStudentDeviceHistory);
router.get('/test-results/:resultId', protect, adminOnly, getTestResultForReview);

// Content management routes
router.get('/content/materials', protect, adminOnly, getStudyMaterials);
router.post('/content/materials', protect, adminOnly, createStudyMaterial);
router.put('/content/materials/:id', protect, adminOnly, updateStudyMaterial);
router.delete('/content/materials/:id', protect, adminOnly, deleteStudyMaterial);
router.post('/content/upload', protect, adminOnly, upload.single('file'), uploadFile);

// Instructor routes (super admin only)
router.get('/instructors', protect, superAdminOnly, getInstructors);
router.post('/instructors', protect, superAdminOnly, createInstructor);
router.put('/instructors/:id', protect, superAdminOnly, updateInstructor);
router.put('/instructors/:id/toggle-status', protect, superAdminOnly, toggleInstructorStatus);
router.delete('/instructors/:id', protect, superAdminOnly, deleteInstructor);

router.get('/logs', protect, superAdminOnly, getSystemLogs);

router.get('/feedback', protect, superAdminOnly, getFeedback);
router.put('/feedback/:id', protect, superAdminOnly, updateFeedback);
router.delete('/feedback/:id', protect, superAdminOnly, deleteFeedback);
router.get('/exam-support/conversations', protect, adminOnly, getExamSupportConversations);
router.get('/exam-support/messages', protect, adminOnly, getExamSupportMessagesAdmin);
router.post('/exam-support/messages', protect, adminOnly, sendExamSupportMessageAdmin);

router.put('/approve/:adminId', protect, superAdminOnly, approveAdmin);
router.get('/users/admins', protect, superAdminOnly, getAllAdmins);
router.get('/users/:adminId/student-scope', protect, superAdminOnly, getAdminStudentScope);
router.put('/users/:adminId/student-scope', protect, superAdminOnly, updateAdminStudentScope);
router.delete('/users/:adminId', protect, superAdminOnly, deleteAdmin);
router.get('/settings', protect, adminOnly, getAdminSettings);
router.put('/settings/profile', protect, adminOnly, updateAdminProfileSettings);
router.put('/settings/password', protect, adminOnly, updateAdminPasswordSettings);
router.delete('/settings/devices', protect, adminOnly, clearAdminDeviceSettings);

module.exports = router;
