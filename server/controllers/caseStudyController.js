const CaseStudy = require('../models/CaseStudy');
const Question = require('../models/Question');

const normalizeCaseStudyQuestions = (questions, category, subcategory) =>
  (Array.isArray(questions) ? questions : []).map((q) => ({
    ...q,
    category,
    subcategory
  }));

// Map CaseStudy type to the linked Question's caseStudyType field
// so tests know whether it's layered, bowtie, or trend
const CASE_STUDY_TYPE_MAP = {
  '6-question': 'layered',
  'matrix': 'matrix',
  'bowtie': 'bowtie',
  'trend': 'trend',
};

// Sanitize questions before syncing to linked Question document.
// The Question model has rowText: { required: true } on matrixRows, but the
// CaseStudy model does not.  Empty placeholder rows (from the editor defaults)
// must be stripped so the linked Question save doesn't blow up with validation.
const sanitizeQuestionsForLinkedDoc = (questions) =>
  (Array.isArray(questions) ? questions : []).map((q) => {
    const sanitized = { ...q };
    // Only keep matrix rows that actually have text
    if (Array.isArray(sanitized.matrixRows)) {
      sanitized.matrixRows = sanitized.matrixRows
        .filter((r) => r.rowText && r.rowText.trim())
        .map((r) => ({ ...r, rowText: r.rowText.trim() }));
    }
    return sanitized;
  });

const buildLinkedQuestionPayload = (caseStudyDoc) => ({
  type: 'case-study',
  category: caseStudyDoc.category,
  subcategory: caseStudyDoc.subcategory,
  clientNeed: caseStudyDoc.clientNeed || '',
  clientNeedSubcategory: caseStudyDoc.clientNeedSubcategory || '',
  questionText: caseStudyDoc.title,
  rationale: caseStudyDoc.scenario,
  difficulty: 'medium',
  scenario: caseStudyDoc.scenario,
  sections: Array.isArray(caseStudyDoc.sections) ? caseStudyDoc.sections : [],
  questions: sanitizeQuestionsForLinkedDoc(caseStudyDoc.questions),
  caseStudyId: caseStudyDoc._id,
  caseStudyType: CASE_STUDY_TYPE_MAP[caseStudyDoc.type] || 'layered'
});

// @desc    Get all case studies
// @route   GET /api/admin/case-studies
// @access  Private (admin only)
const getCaseStudies = async (req, res) => {
  try {
    const caseStudies = await CaseStudy.find()
      .sort({ createdAt: -1 })
      .select('title type category subcategory createdAt isActive linkedQuestionId scenario questions');

    // Backfill: fix any linked questions missing caseStudyType
    // This runs silently in the background to repair existing data
    const backfillPromises = caseStudies
      .filter(cs => cs.linkedQuestionId)
      .map(async (cs) => {
        try {
          const linked = await Question.findById(cs.linkedQuestionId).select('caseStudyType').lean();
          if (linked && !linked.caseStudyType) {
            const mappedType = CASE_STUDY_TYPE_MAP[cs.type] || 'layered';
            await Question.findByIdAndUpdate(cs.linkedQuestionId, { caseStudyType: mappedType });
          }
        } catch (e) { /* silent backfill - don't block the response */ }
      });
    if (backfillPromises.length) {
      Promise.all(backfillPromises).catch(() => {});
    }

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
    if (!payload.title || !payload.category || !payload.subcategory) {
      return res.status(400).json({ message: 'Title, category, and subcategory are required' });
    }
    // Scenario is required for 6-question and matrix, optional for trend and bowtie
    if (!['trend', 'bowtie'].includes(payload.type) && !payload.scenario) {
      return res.status(400).json({ message: 'Scenario is required for this case study type' });
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

    // Only allow safe fields — never let frontend overwrite _id, linkedQuestionId,
    // createdBy, createdAt etc.
    const safeFields = [
      'title', 'category', 'subcategory', 'scenario', 'type', 'sections',
      'questions', 'isActive', 'clientNeed', 'clientNeedSubcategory'
    ];
    safeFields.forEach((field) => {
      if (field === 'category') caseStudy.category = nextCategory;
      else if (field === 'subcategory') caseStudy.subcategory = nextSubcategory;
      else if (field === 'questions') caseStudy.questions = nextQuestions;
      else if (req.body[field] !== undefined) caseStudy[field] = req.body[field];
    });
    await caseStudy.save();

    // Sync linked Question — wrapped in try/catch so a validation error
    // on the linked doc does NOT crash the whole case-study update.
    try {
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
    } catch (linkedError) {
      console.error('Linked question sync failed (case study saved without sync):', linkedError.message);
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
