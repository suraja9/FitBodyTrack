const mongoose = require('mongoose');

const nutritionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    food: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: [200, 'Food name cannot exceed 200 characters'],
    },
    calories: {
      type: Number,
      required: [true, 'Calories are required'],
      min: [0, 'Calories cannot be negative'],
      max: [10000, 'Calories seem unrealistically high'],
    },
    protein: {
      type: Number,
      default: 0,
      min: [0, 'Protein cannot be negative'],
      max: [1000, 'Protein amount seems unrealistic'],
    },
    carbs: {
      type: Number,
      default: 0,
      min: [0, 'Carbs cannot be negative'],
      max: [1000, 'Carbs amount seems unrealistic'],
    },
    fat: {
      type: Number,
      default: 0,
      min: [0, 'Fat cannot be negative'],
      max: [1000, 'Fat amount seems unrealistic'],
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Additional metadata for better tracking
    serving_size: {
      type: String,
      default: '1 serving',
    },
    brand: {
      type: String,
      trim: true,
    },
    // Track if this was from search API or manual entry
    source: {
      type: String,
      enum: ['manual', 'openfoodfacts', 'other'],
      default: 'manual',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient date-based queries by user
nutritionSchema.index({ userId: 1, date: 1 });

// Index for date-only queries (for daily summaries)
nutritionSchema.index({ date: 1 });

// Index for efficient analytics queries
nutritionSchema.index({ userId: 1, date: -1 });

// Virtual for total macros (useful for calculations)
nutritionSchema.virtual('totalMacros').get(function() {
  return this.protein + this.carbs + this.fat;
});

// Virtual for macro percentages
nutritionSchema.virtual('macroPercentages').get(function() {
  const total = this.totalMacros;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  
  return {
    protein: Math.round((this.protein / total) * 100),
    carbs: Math.round((this.carbs / total) * 100),
    fat: Math.round((this.fat / total) * 100),
  };
});

// Static method to get daily summary for a user
nutritionSchema.statics.getDailySummary = async function(userId, date) {
  const startDate = new Date(date);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  const result = await this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalCalories: { $sum: '$calories' },
        totalProtein: { $sum: '$protein' },
        totalCarbs: { $sum: '$carbs' },
        totalFat: { $sum: '$fat' },
        entryCount: { $sum: 1 }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      entries: 0
    };
  }
  
  const summary = result[0];
  return {
    calories: summary.totalCalories,
    protein: summary.totalProtein,
    carbs: summary.totalCarbs,
    fat: summary.totalFat,
    entries: summary.entryCount
  };
};

// Instance method to calculate calorie breakdown from macros
nutritionSchema.methods.getCalorieBreakdown = function() {
  return {
    protein: this.protein * 4, // 4 kcal per gram
    carbs: this.carbs * 4,     // 4 kcal per gram
    fat: this.fat * 9,         // 9 kcal per gram
    total: (this.protein * 4) + (this.carbs * 4) + (this.fat * 9)
  };
};

// Pre-save middleware to validate macro-calorie consistency
nutritionSchema.pre('save', function(next) {
  // Calculate calories from macros
  const calculatedCalories = (this.protein * 4) + (this.carbs * 4) + (this.fat * 9);
  
  // If there's a significant difference (more than 20%), warn but don't block
  if (calculatedCalories > 0) {
    const difference = Math.abs(this.calories - calculatedCalories);
    const percentageDiff = (difference / this.calories) * 100;
    
    if (percentageDiff > 20) {
      console.warn(`Nutrition entry has inconsistent calorie/macro data: 
        Reported: ${this.calories} kcal, 
        Calculated from macros: ${calculatedCalories} kcal`);
    }
  }
  
  next();
});

// Ensure virtual fields are included in JSON output
nutritionSchema.set('toJSON', { virtuals: true });
nutritionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Nutrition', nutritionSchema);