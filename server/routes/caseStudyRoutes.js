const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getCaseStudies,
  getCaseStudy,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy
} = require('../controllers/caseStudyController');

router.route('/')
  .get(protect, adminOnly, getCaseStudies)
  .post(protect, adminOnly, createCaseStudy);

router.route('/:id')
  .get(protect, adminOnly, getCaseStudy)
  .put(protect, adminOnly, updateCaseStudy)
  .delete(protect, adminOnly, deleteCaseStudy);

module.exports = router;