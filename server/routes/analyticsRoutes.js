const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getUsageByType,
  getSuccessByCategory,
  getDifficultyDistribution,
  getDailyTrend,
  getMostUsedQuestions,
  getCategoryStats,
  getClientNeedsStats
} = require('../controllers/analyticsController');

router.get('/usage-by-type', protect, adminOnly, getUsageByType);
router.get('/success-by-category', protect, adminOnly, getSuccessByCategory);
router.get('/difficulty-distribution', protect, adminOnly, getDifficultyDistribution);
router.get('/daily-trend', protect, adminOnly, getDailyTrend);
router.get('/most-used', protect, adminOnly, getMostUsedQuestions);
router.get('/category-stats', protect, adminOnly, getCategoryStats);
router.get('/client-needs-stats', protect, adminOnly, getClientNeedsStats);

module.exports = router;