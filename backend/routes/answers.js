const express = require('express');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Submit answer
router.post('/', protect, async (req, res) => {
  try {
    const { questionId, selectedOption } = req.body;

    // Get question to check correct answer
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Check if user already answered this question
    const existingAnswer = await Answer.findOne({
      user: req.user.id,
      question: questionId
    });

    if (existingAnswer) {
      return res.status(400).json({ message: 'You have already answered this question' });
    }

    // Check if answer is correct
    const isCorrect = question.correctAnswer === selectedOption;

    // Create answer
    const answer = await Answer.create({
      user: req.user.id,
      question: questionId,
      selectedOption,
      isCorrect
    });

    res.status(201).json({
      success: true,
      answer: {
        id: answer._id,
        isCorrect,
        correctAnswer: question.correctAnswer
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already answered this question' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Get user's answers
router.get('/my-answers', protect, async (req, res) => {
  try {
    const answers = await Answer.find({ user: req.user.id })
      .populate('question', 'question options correctAnswer')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, answers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

