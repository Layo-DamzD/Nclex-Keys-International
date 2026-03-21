const express = require('express');
const router = express.Router();
const {
  registerStudent,
  loginStudent,
  verifyStudentFace,
  verifyPublicTestEmail,
  registerAdmin,
  loginAdmin,
  verifyAdminSignupCode,
  approveAdmin,
  getMe,
  forgotPassword,    // <-- added
  resetPassword,     // <-- added
  forgotAdminPassword,
  resetAdminPassword,
  forgotAdminAccessCode,
  resetPasswordWithOtp,
  resetAdminPasswordWithOtp
} = require('../controllers/authController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');

// Student routes
router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/student/verify-face', verifyStudentFace);
router.post('/student/verify-public-test-email', verifyPublicTestEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password-otp', resetPasswordWithOtp);

// Admin routes
router.post('/admin/register', registerAdmin);
router.post('/admin/login', loginAdmin);
router.post('/admin/verify-signup-code', verifyAdminSignupCode);
router.post('/admin/forgot-password', forgotAdminPassword);
router.post('/admin/reset-password/:token', resetAdminPassword);
router.post('/admin/reset-password-otp', resetAdminPasswordWithOtp);
router.post('/admin/forgot-access-code', forgotAdminAccessCode);

// Protected routes
router.get('/me', protect, getMe);
router.put('/admin/approve/:adminId', protect, superAdminOnly, approveAdmin);

module.exports = router;
