const Test = require('../models/Test');
const User = require('../models/user');

// @desc    Create a new test
// @route   POST /api/admin/tests
// @access  Private (admin only)
const createTest = async (req, res) => {
  try {
    const { title, description, category, questions, duration, passingScore, assignmentType, assignedStudents, proctored = false } = req.body;

    const test = new Test({
      title,
      description,
      category,
      questions,
      duration,
      passingScore,
      assignmentType,
      assignedStudents: assignmentType === 'individual' ? assignedStudents : [],
      createdBy: req.user.id,
      proctored: Boolean(proctored)
    });

    await test.save();
    res.status(201).json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all tests (admin view)
// @route   GET /api/admin/tests
// @access  Private (admin only)
const getTests = async (req, res) => {
  try {
    const tests = await Test.find()
      .populate('questions', 'questionText type')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get a single test
// @route   GET /api/admin/tests/:id
// @access  Private (admin only)
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id)
      .populate('questions')
      .populate('assignedStudents', 'name email');
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a test
// @route   PUT /api/admin/tests/:id
// @access  Private (admin only)
const updateTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.json(test);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a test
// @route   DELETE /api/admin/tests/:id
// @access  Private (admin only)
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    await test.deleteOne();
    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get students for assignment (admin only)
// @route   GET /api/admin/students
// @access  Private (admin only)
const getStudents = async (req, res) => {
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

module.exports = {
  createTest,
  getTests,
  getTest,
  updateTest,
  deleteTest,
  getStudents
};