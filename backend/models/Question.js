const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Please provide a question'],
      trim: true
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: function(v) {
          return v.length === 4;
        },
        message: 'Question must have exactly 4 options'
      }
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Please provide the correct answer index'],
      min: 0,
      max: 3
    },
    chapter: {
      type: String,
      default: 'General'
    },
    category: {
      type: String,
      default: 'General'
    },
    deletedAt: {
      type: Date,
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Question', questionSchema);

