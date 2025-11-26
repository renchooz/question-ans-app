const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedOption: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  isCorrect: {
    type: Boolean,
    required: true
  }
}, {
  timestamps: true
});

// Index to prevent duplicate answers from same user for same question
answerSchema.index({ user: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);

