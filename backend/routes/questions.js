const express = require('express');
const Question = require('../models/Question');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Get all questions (for users)
router.get('/', protect, async (req, res) => {
  try {
    const questions = await Question.find({
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    }).select('-correctAnswer');
    res.json({ success: true, questions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single question (for users)
router.get('/:id', protect, async (req, res) => {
  try {
    const question = await Question.findOne({
      _id: req.params.id,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }]
    }).select('-correctAnswer');
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ success: true, question });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

