const express = require('express');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();

const RETENTION_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getRetentionExpiry = (deletedAt) =>
  deletedAt ? new Date(deletedAt.getTime() + RETENTION_DAYS * DAY_IN_MS) : null;

const cleanupExpiredQuestions = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_IN_MS);
  const expiredQuestions = await Question.find({
    deletedAt: { $ne: null, $lt: cutoff }
  }).select('_id');

  if (!expiredQuestions.length) {
    return;
  }

  const expiredIds = expiredQuestions.map((q) => q._id);
  await Answer.deleteMany({ question: { $in: expiredIds } });
  await Question.deleteMany({ _id: { $in: expiredIds } });
};

// All admin routes require authentication and admin role
router.use(protect);
router.use(admin);

// Get logged in users count
router.get('/logged-in-users', async (req, res) => {
  try {
    const loggedInCount = await User.countDocuments({ isLoggedIn: true });
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    res.json({
      success: true,
      loggedInUsers: loggedInCount,
      totalUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('username email isLoggedIn lastLogin createdAt')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create question
router.post('/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer, category } = req.body;

    if (!question || !options || options.length !== 4 || correctAnswer === undefined) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const newQuestion = await Question.create({
      question,
      options,
      correctAnswer,
      category: category || 'General'
    });

    res.status(201).json({ success: true, question: newQuestion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all questions (with correct answers for admin)
router.get('/questions', async (req, res) => {
  try {
    await cleanupExpiredQuestions();
    const questions = await Question.find().sort({ createdAt: -1 });
    const formatted = questions.map((q) => {
      const doc = q.toObject();
      doc.retentionExpiresAt = getRetentionExpiry(q.deletedAt);
      return doc;
    });
    res.json({ success: true, questions: formatted });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single question
router.get('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update question
router.put('/questions/:id', async (req, res) => {
  try {
    const { question, options, correctAnswer, category } = req.body;

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        question,
        options,
        correctAnswer,
        category
      },
      { new: true, runValidators: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ message: 'Question not found' });
    }

    res.json({ success: true, question: updatedQuestion });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Soft delete (archive) question
router.delete('/questions/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.deletedAt) {
      return res.status(400).json({ message: 'Question already scheduled for deletion' });
    }

    question.deletedAt = new Date();
    await question.save();

    res.json({
      success: true,
      message: `Question archived. Analytics will remain visible for ${RETENTION_DAYS} days.`,
      retentionExpiresAt: getRetentionExpiry(question.deletedAt)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Permanently delete archived question and history
router.delete('/questions/:id/permanent', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (!question.deletedAt) {
      return res
        .status(400)
        .json({ message: 'Question must be archived before permanent deletion' });
    }

    await Answer.deleteMany({ question: question._id });
    await question.deleteOne();

    res.json({ success: true, message: 'Question history removed permanently' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics for all questions
router.get('/analytics', async (req, res) => {
  try {
    await cleanupExpiredQuestions();
    const cutoff = new Date(Date.now() - RETENTION_DAYS * DAY_IN_MS);
    const questions = await Question.find({
      $or: [{ deletedAt: null }, { deletedAt: { $gte: cutoff } }]
    });
    const analytics = [];

    for (const question of questions) {
      const totalAnswers = await Answer.countDocuments({ question: question._id });
      const correctAnswers = await Answer.countDocuments({
        question: question._id,
        isCorrect: true
      });
      const incorrectAnswers = totalAnswers - correctAnswers;

      // Get option-wise distribution
      const optionStats = [];
      for (let i = 0; i < 4; i++) {
        const count = await Answer.countDocuments({
          question: question._id,
          selectedOption: i
        });
        optionStats.push({
          option: question.options[i],
          count,
          percentage: totalAnswers > 0 ? ((count / totalAnswers) * 100).toFixed(2) : 0
        });
      }

      analytics.push({
        questionId: question._id,
        question: question.question,
        deletedAt: question.deletedAt,
        retentionExpiresAt: getRetentionExpiry(question.deletedAt),
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        accuracy: totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(2) : 0,
        optionStats
      });
    }

    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics for a specific question
router.get('/analytics/:questionId', async (req, res) => {
  try {
    await cleanupExpiredQuestions();
    const question = await Question.findById(req.params.questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    const totalAnswers = await Answer.countDocuments({ question: question._id });
    const correctAnswers = await Answer.countDocuments({
      question: question._id,
      isCorrect: true
    });
    const incorrectAnswers = totalAnswers - correctAnswers;

    // Get option-wise distribution
    const optionStats = [];
    for (let i = 0; i < 4; i++) {
      const count = await Answer.countDocuments({
        question: question._id,
        selectedOption: i
      });
      optionStats.push({
        option: question.options[i],
        count,
        percentage: totalAnswers > 0 ? ((count / totalAnswers) * 100).toFixed(2) : 0
      });
    }

    // Get user-wise performance
    const userAnswers = await Answer.find({ question: question._id })
      .populate('user', 'username email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      analytics: {
        questionId: question._id,
        question: question.question,
        deletedAt: question.deletedAt,
        retentionExpiresAt: getRetentionExpiry(question.deletedAt),
        correctAnswer: question.options[question.correctAnswer],
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        accuracy: totalAnswers > 0 ? ((correctAnswers / totalAnswers) * 100).toFixed(2) : 0,
        optionStats,
        userAnswers
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all results
router.get('/results', async (req, res) => {
  try {
    const allAnswers = await Answer.find()
      .populate('user', 'username email')
      .populate('question', 'question options correctAnswer')
      .sort({ createdAt: -1 });

    res.json({ success: true, results: allAnswers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

