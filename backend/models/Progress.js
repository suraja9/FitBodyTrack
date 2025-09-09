const mongoose = require('mongoose');

const progressSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    weight: {
      type: Number,
      required: [true, 'Weight is required'],
      min: [20, 'Weight must be at least 20 kg'],
      max: [500, 'Weight must be less than 500 kg'],
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    // Additional measurements (optional)
    bodyFat: {
      type: Number,
      min: [0, 'Body fat percentage cannot be negative'],
      max: [100, 'Body fat percentage cannot exceed 100'],
    },
    muscleMass: {
      type: Number,
      min: [0, 'Muscle mass cannot be negative'],
    },
    // Measurements in centimeters
    measurements: {
      chest: { type: Number, min: 0 },
      waist: { type: Number, min: 0 },
      hips: { type: Number, min: 0 },
      arms: { type: Number, min: 0 },
      thighs: { type: Number, min: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries by user and date
progressSchema.index({ userId: 1, date: -1 });

// Index for date-only queries
progressSchema.index({ date: -1 });

// Static method to get latest entry for a user
progressSchema.statics.getLatestEntry = async function(userId) {
  return await this.findOne({ userId }).sort({ date: -1 });
};

// Static method to get progress history for a user
progressSchema.statics.getHistory = async function(userId, limit = 30) {
  return await this.find({ userId })
    .sort({ date: -1 })
    .limit(limit);
};

// Instance method to calculate weight change from previous entry
progressSchema.methods.getWeightChange = async function() {
  const previousEntry = await this.constructor.findOne({
    userId: this.userId,
    date: { $lt: this.date }
  }).sort({ date: -1 });

  if (!previousEntry) {
    return {
      change: 0,
      percentage: 0,
      isFirst: true
    };
  }

  const change = this.weight - previousEntry.weight;
  const percentage = ((change / previousEntry.weight) * 100);

  return {
    change: parseFloat(change.toFixed(1)),
    percentage: parseFloat(percentage.toFixed(1)),
    isFirst: false,
    previousWeight: previousEntry.weight,
    previousDate: previousEntry.date
  };
};

// Virtual for BMI calculation (requires height to be set)
progressSchema.virtual('bmi').get(function() {
  // This would need user height from user profile
  // For now, return null - can be implemented when height is available
  return null;
});

// Pre-save middleware to prevent duplicate entries on the same date
progressSchema.pre('save', async function(next) {
  if (this.isNew) {
    const startOfDay = new Date(this.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(this.date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingEntry = await this.constructor.findOne({
      userId: this.userId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });

    if (existingEntry) {
      const error = new Error('Progress entry already exists for this date');
      error.name = 'DuplicateEntryError';
      return next(error);
    }
  }
  next();
});

// Ensure virtual fields are included in JSON output
progressSchema.set('toJSON', { virtuals: true });
progressSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Progress', progressSchema);