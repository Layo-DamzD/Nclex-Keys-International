const CaseStudy = require('../models/CaseStudy');

// @desc    Get all case studies
// @route   GET /api/admin/case-studies
// @access  Private (admin only)
const getCaseStudies = async (req, res) => {
  try {
    const caseStudies = await CaseStudy.find()
      .sort({ createdAt: -1 })
      .select('title type createdAt isActive');
    res.json(caseStudies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get single case study
// @route   GET /api/admin/case-studies/:id
// @access  Private (admin only)
const getCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    res.json(caseStudy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create case study
// @route   POST /api/admin/case-studies
// @access  Private (admin only)
const createCaseStudy = async (req, res) => {
  try {
    const caseStudy = new CaseStudy({
      ...req.body,
      createdBy: req.user.id
    });
    await caseStudy.save();
    res.status(201).json(caseStudy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update case study
// @route   PUT /api/admin/case-studies/:id
// @access  Private (admin only)
const updateCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    res.json(caseStudy);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete case study
// @route   DELETE /api/admin/case-studies/:id
// @access  Private (admin only)
const deleteCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }
    await caseStudy.deleteOne();
    res.json({ message: 'Case study deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCaseStudies,
  getCaseStudy,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy
};