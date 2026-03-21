const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createTest,
  getTests,
  getTest,
  updateTest,
  deleteTest,
  getStudents
} = require('../controllers/testController');

router.route('/')
  .get(protect, adminOnly, getTests)
  .post(protect, adminOnly, createTest);

router.get('/students', protect, adminOnly, getStudents);

router.route('/:id')
  .get(protect, adminOnly, getTest)
  .put(protect, adminOnly, updateTest)
  .delete(protect, adminOnly, deleteTest);

module.exports = router;