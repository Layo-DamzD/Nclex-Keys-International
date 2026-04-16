const CaseStudy = require('../models/CaseStudy');
const Question = require('../models/Question');

const normalizeCaseStudyQuestions = (questions, category, subcategory) =>
  (Array.isArray(questions) ? questions : []).map((q) => ({
    ...q,
    category,
    subcategory
  }));

const buildLinkedQuestionPayload = (caseStudyDoc) => ({
  type: 'case-study',
  category: caseStudyDoc.category,
  subcategory: caseStudyDoc.subcategory,
  questionText: caseStudyDoc.title,
  rationale: caseStudyDoc.scenario,
  difficulty: 'medium',
  scenario: caseStudyDoc.scenario,
  sections: Array.isArray(caseStudyDoc.sections) ? caseStudyDoc.sections : [],
  questions: Array.isArray(caseStudyDoc.questions) ? caseStudyDoc.questions : [],
  caseStudyId: caseStudyDoc._id
});

// @desc    Get all case studies
// @route   GET /api/admin/case-studies
// @access  Private (admin only)
const getCaseStudies = async (req, res) => {
  try {
    const caseStudies = await CaseStudy.find()
      .sort({ createdAt: -1 })
      .select('title type category subcategory createdAt isActive linkedQuestionId');
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
    const payload = { ...req.body };
    if (!payload.title || !payload.scenario || !payload.category || !payload.subcategory) {
      return res.status(400).json({ message: 'Title, scenario, category, and subcategory are required' });
    }
    if (!payload.type || !['6-question', 'bowtie', 'trend', 'matrix'].includes(payload.type)) {
      return res.status(400).json({ message: 'Valid case study type is required (6-question, bowtie, trend, or matrix)' });
    }

    payload.questions = normalizeCaseStudyQuestions(payload.questions, payload.category, payload.subcategory);

    const caseStudy = new CaseStudy({
      ...payload,
      createdBy: req.user.id
    });
    await caseStudy.save();

    try {
      const linkedQuestion = await Question.create(buildLinkedQuestionPayload(caseStudy));
      caseStudy.linkedQuestionId = linkedQuestion._id;
      await caseStudy.save();
    } catch (linkedError) {
      console.error('Linked question creation failed (case study saved without link):', linkedError.message);
      // Case study is still saved, just without a linked question
    }

    res.status(201).json(caseStudy);
  } catch (error) {
    console.error('Case study creation error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation error: ' + messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};

// @desc    Update case study
// @route   PUT /api/admin/case-studies/:id
// @access  Private (admin only)
const updateCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }

    const nextCategory = req.body.category || caseStudy.category;
    const nextSubcategory = req.body.subcategory || caseStudy.subcategory;
    const nextQuestions = normalizeCaseStudyQuestions(req.body.questions, nextCategory, nextSubcategory);

    Object.assign(caseStudy, {
      ...req.body,
      category: nextCategory,
      subcategory: nextSubcategory,
      questions: nextQuestions
    });
    await caseStudy.save();

    const linkedPayload = buildLinkedQuestionPayload(caseStudy);
    if (caseStudy.linkedQuestionId) {
      await Question.findByIdAndUpdate(caseStudy.linkedQuestionId, linkedPayload, { runValidators: true });
    } else {
      const existingLinked = await Question.findOne({ caseStudyId: caseStudy._id, type: 'case-study' });
      if (existingLinked) {
        await Question.findByIdAndUpdate(existingLinked._id, linkedPayload, { runValidators: true });
        caseStudy.linkedQuestionId = existingLinked._id;
      } else {
        const created = await Question.create(linkedPayload);
        caseStudy.linkedQuestionId = created._id;
      }
      await caseStudy.save();
    }

    res.json(caseStudy);
  } catch (error) {
    console.error('Case study update error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation error: ' + messages.join(', ') });
    }
    res.status(500).json({ message: 'Server error: ' + (error.message || 'Unknown error') });
  }
};
// @route   DELETE /api/admin/case-studies/:id
// @access  Private (admin only)
const deleteCaseStudy = async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    if (!caseStudy) {
      return res.status(404).json({ message: 'Case study not found' });
    }

    if (caseStudy.linkedQuestionId) {
      await Question.findByIdAndDelete(caseStudy.linkedQuestionId);
    } else {
      await Question.deleteMany({ caseStudyId: caseStudy._id, type: 'case-study' });
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
