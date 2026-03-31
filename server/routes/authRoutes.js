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
  resetAdminPasswordWithOtp,
  sendStudentSignupOtp,
  verifyOtpAndRegisterStudent
} = require('../controllers/authController');
const { protect, superAdminOnly } = require('../middleware/authMiddleware');
const User = require('../models/user');

// DEBUG: Check admin account status (temporary - remove after debugging)
router.post('/admin/debug-check', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('[DEBUG] Checking admin account for:', email);
    
    const user = await User.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
    
    if (!user) {
      return res.json({ 
        found: false, 
        message: 'No admin account found with this email',
        email: email 
      });
    }
    
    res.json({
      found: true,
      email: user.email,
      name: user.name,
      role: user.role,
      approved: user.approved,
      status: user.status,
      hasAccessCode: !!user.accessCode,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Student routes
router.post('/student/register', registerStudent);
router.post('/student/login', loginStudent);
router.post('/student/verify-face', verifyStudentFace);
router.post('/student/verify-public-test-email', verifyPublicTestEmail);
router.post('/student/send-otp', sendStudentSignupOtp);
router.post('/student/verify-otp-and-register', verifyOtpAndRegisterStudent);
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
