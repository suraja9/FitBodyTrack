const mongoose = require('mongoose');

const WorkoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: [true, 'Please specify workout type'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Please specify duration in minutes'],
    min: 1
  },
  weight: {
    type: Number,
    min: 1
  },
  calories: {
    type: Number,
    min: 1
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient analytics queries
WorkoutSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Workout', WorkoutSchema);