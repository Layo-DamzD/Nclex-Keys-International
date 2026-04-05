const TestResult = require('../models/testResult');
const Question = require('../models/Question');
const User = require('../models/user');

// @desc    Get question usage by type
// @route   GET /api/admin/analytics/usage-by-type
// @access  Private (admin only)
const getUsageByType = async (req, res) => {
  try {
    const answerUsage = await TestResult.aggregate([
      { $unwind: '$answers' },
      {
        $project: {
          normalizedType: {
            $trim: {
              input: {
                $toString: {
                  $ifNull: ['$answers.type', '']
                }
              }
            }
          }
        }
      },
      { $match: { normalizedType: { $nin: ['', 'null', 'undefined'] } } },
      { $group: { _id: '$normalizedType', count: { $sum: 1 } } }
    ]);

    let result = answerUsage
      .filter((item) => item._id)
      .map((item) => ({ type: item._id, count: item.count }));

    // Fallback: if no recorded attempts yet, show available question counts by type
    if (result.length === 0) {
      const questionCounts = await Question.aggregate([
        {
          $project: {
            normalizedType: {
              $trim: {
                input: {
                  $toString: {
                    $ifNull: ['$type', '']
                  }
                }
              }
            }
          }
        },
        { $match: { normalizedType: { $nin: ['', 'null', 'undefined'] } } },
        { $group: { _id: '$normalizedType', count: { $sum: 1 } } }
      ]);
      result = questionCounts
        .filter((item) => item._id)
        .map((item) => ({ type: item._id, count: item.count }));
    }

    // Last fallback: count answers with missing type so chart is never blank when there is usage.
    if (result.length === 0) {
      const unknownTypeUsage = await TestResult.aggregate([
        { $unwind: '$answers' },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      if (unknownTypeUsage[0]?.count) {
        result = [{ type: 'unknown', count: unknownTypeUsage[0].count }];
      }
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get success rate by category
// @route   GET /api/admin/analytics/success-by-category
// @access  Private (admin only)
const getSuccessByCategory = async (req, res) => {
  try {
    const testResults = await TestResult.find().populate('answers.questionId');
    const categoryStats = {};

    testResults.forEach(result => {
      if (result.answers) {
        result.answers.forEach(answer => {
          if (answer.questionId) {
            const category = answer.questionId.category || 'Uncategorized';
            if (!categoryStats[category]) {
              categoryStats[category] = { total: 0, correct: 0 };
            }
            categoryStats[category].total += 1;
            if (answer.isCorrect) {
              categoryStats[category].correct += 1;
            }
          }
        });
      }
    });

    const result = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      successRate: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
      attempts: stats.total
    }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get difficulty distribution
// @route   GET /api/admin/analytics/difficulty-distribution
// @access  Private (admin only)
const getDifficultyDistribution = async (req, res) => {
  try {
    const questions = await Question.find();
    const difficultyData = {
      easy: 0,
      medium: 0,
      hard: 0
    };

    questions.forEach(q => {
      if (difficultyData[q.difficulty] !== undefined) {
        difficultyData[q.difficulty] += 1;
      }
    });

    const result = Object.entries(difficultyData)
      .filter(([_, count]) => count > 0)
      .map(([difficulty, count]) => ({ difficulty, count }));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get daily usage trend
// @route   GET /api/admin/analytics/daily-trend
// @access  Private (admin only)
const getDailyTrend = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const testResults = await TestResult.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const dailyData = {};
    
    // Initialize all days
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = 0;
    }

    testResults.forEach(result => {
      const dateStr = result.date.toISOString().split('T')[0];
      if (dailyData[dateStr] !== undefined) {
        dailyData[dateStr] += result.totalQuestions || 0;
      }
    });

    const result = Object.entries(dailyData)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get most used questions
// @route   GET /api/admin/analytics/most-used
// @access  Private (admin only)
const getMostUsedQuestions = async (req, res) => {
  try {
    const usageAgg = await TestResult.aggregate([
      { $unwind: '$answers' },
      { $match: { 'answers.questionId': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$answers.questionId',
          questionText: { $first: '$answers.questionText' },
          type: { $first: '$answers.type' },
          timesUsed: { $sum: 1 },
          correctCount: {
            $sum: { $cond: [{ $eq: ['$answers.isCorrect', true] }, 1, 0] }
          }
        }
      },
      { $sort: { timesUsed: -1 } },
      { $limit: 10 }
    ]);

    let result = usageAgg.map((q) => ({
      _id: q._id,
      questionText: q.questionText || 'Question',
      type: q.type || 'unknown',
      timesUsed: q.timesUsed || 0,
      successRate: q.timesUsed > 0 ? Math.round((q.correctCount / q.timesUsed) * 100) : 0
    }));

    // Fallback if no test-result answer usage exists yet
    if (result.length === 0) {
      const questions = await Question.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('questionText type timesUsed correctAttempts');

      result = questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        type: q.type,
        timesUsed: q.timesUsed || 0,
        successRate: q.timesUsed > 0 ? Math.round((q.correctAttempts / q.timesUsed) * 100) : 0
      }));
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get detailed category statistics
// @route   GET /api/admin/analytics/category-stats
// @access  Private (admin only)
const getCategoryStats = async (req, res) => {
  try {
    const questions = await Question.find();
    const testResults = await TestResult.find().populate('answers.questionId');
    
    const categoryStats = {};

    // Dynamically build categories from actual DB data
    // This ensures admin and student views always show the same categories
    questions.forEach(q => {
      const cat = q.category || 'Uncategorized';
      if (!categoryStats[cat]) {
        categoryStats[cat] = {
          totalQuestions: 0,
          totalUsage: 0,
          correctAttempts: 0,
          subcategories: {}
        };
      }
      categoryStats[cat].totalQuestions += 1;
      
      const sub = q.subcategory || 'Uncategorized';
      if (!categoryStats[cat].subcategories[sub]) {
        categoryStats[cat].subcategories[sub] = {
          count: 0,
          usage: 0,
          correct: 0
        };
      }
      categoryStats[cat].subcategories[sub].count += 1;
    });

    // Aggregate usage data from test results
    testResults.forEach(result => {
      if (result.answers) {
        result.answers.forEach(answer => {
          if (answer.questionId) {
            const q = answer.questionId;
            const cat = q?.category || 'Uncategorized';
            if (categoryStats[cat]) {
              categoryStats[cat].totalUsage += 1;
              if (answer.isCorrect) {
                categoryStats[cat].correctAttempts += 1;
              }

              const sub = q?.subcategory || 'Uncategorized';
              if (categoryStats[cat].subcategories[sub]) {
                categoryStats[cat].subcategories[sub].usage += 1;
                if (answer.isCorrect) {
                  categoryStats[cat].subcategories[sub].correct += 1;
                }
              }
            }
          }
        });
      }
    });

    // Format response — only include categories with questions
    const result = {};
    Object.entries(categoryStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, stats]) => {
        if (stats.totalQuestions > 0) {
          const subcategories = Object.entries(stats.subcategories)
            .filter(([_, subStats]) => subStats.count > 0)
            .map(([name, subStats]) => ({
              name,
              count: subStats.count,
              usage: subStats.usage,
              successRate: subStats.usage > 0 
                ? Math.round((subStats.correct / subStats.usage) * 100) 
                : 0
            }))
            .sort((a, b) => b.count - a.count);

          result[category] = {
            totalQuestions: stats.totalQuestions,
            totalUsage: stats.totalUsage,
            successRate: stats.totalUsage > 0 
              ? Math.round((stats.correctAttempts / stats.totalUsage) * 100) 
              : 0,
            subcategoryCount: subcategories.length,
            subcategories
          };
        }
      });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getUsageByType,
  getSuccessByCategory,
  getDifficultyDistribution,
  getDailyTrend,
  getMostUsedQuestions,
  getCategoryStats
};
