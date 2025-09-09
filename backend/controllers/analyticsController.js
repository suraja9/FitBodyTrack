const mongoose = require('mongoose');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');
const Progress = require('../models/Progress');

// Helper function to calculate current streak
const currentStreak = (docs) => {
  if (!docs || docs.length === 0) return 0;

  // Group documents by date (normalized to midnight)
  const dateMap = new Map();
  docs.forEach(doc => {
    const date = new Date(doc.date);
    const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, []);
    }
    dateMap.get(dateKey).push(doc);
  });

  // Start from today and count backwards
  let streak = 0;
  const today = new Date();
  let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  while (true) {
    const dateKey = currentDate.toISOString();
    if (dateMap.has(dateKey)) {
      streak++;
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

const getOverview = async (req, res) => {
  try {
    const userId = req.user.id;

    // Date calculations
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    // Fetch all data in parallel
    const [
      weeklyWorkouts,
      todayWorkouts,
      todayNutrition,
      allWorkouts,
      allNutrition,
      latestProgress
    ] = await Promise.all([
      // Weekly workouts for calorie burn
      Workout.find({
        userId,
        date: { $gte: weekAgo }
      }).select('calories date'),

      // Today's workouts for balance calculation
      Workout.find({
        userId,
        date: { $gte: todayStart, $lte: todayEnd }
      }).select('calories date'),

      // Today's nutrition for calorie intake
      Nutrition.find({
        userId,
        date: { $gte: todayStart, $lte: todayEnd }
      }).select('calories date'),

      // All workouts for streak and badge calculations
      Workout.find({ userId }).select('date calories').sort({ date: -1 }),

      // All nutrition for streak calculations
      Nutrition.find({ userId }).select('date').sort({ date: -1 }),

      // Latest weight entry
      Progress.findOne({ userId }).sort({ date: -1 }).select('weight')
    ]);

    // Calculate metrics
    const weeklyCaloriesBurned = weeklyWorkouts.reduce((sum, workout) => sum + (workout.calories || 0), 0);
    const todayCaloriesIn = todayNutrition.reduce((sum, nutrition) => sum + (nutrition.calories || 0), 0);
    const todayWorkoutCalories = todayWorkouts.reduce((sum, workout) => sum + (workout.calories || 0), 0);
    const currentWeight = latestProgress ? latestProgress.weight : null;
    const calorieBalanceToday = todayCaloriesIn - todayWorkoutCalories;

    // Calculate streaks
    const workoutStreak = currentStreak(allWorkouts);
    const nutritionStreak = currentStreak(allNutrition);

    // Calculate total metrics for badges
    const totalWorkouts = allWorkouts.length;
    const totalWorkoutCalories = allWorkouts.reduce((sum, workout) => sum + (workout.calories || 0), 0);

    // Define badges with rules
    const badges = [
      {
        key: 'first_workout',
        label: 'First Workout',
        earned: totalWorkouts >= 1
      },
      {
        key: 'ten_workouts',
        label: '10 Workouts',
        earned: totalWorkouts >= 10
      },
      {
        key: 'streak_7',
        label: '7-Day Workout Streak',
        earned: workoutStreak >= 7
      },
      {
        key: 'burn_5000',
        label: 'Calorie Burner (5,000+)',
        earned: totalWorkoutCalories >= 5000
      },
      {
        key: 'log_7',
        label: '7-Day Logging Streak',
        earned: nutritionStreak >= 7
      }
    ];

    res.json({
      weeklyCaloriesBurned,
      todayCaloriesIn,
      currentWeight,
      calorieBalanceToday,
      streaks: {
        workout: workoutStreak,
        nutrition: nutritionStreak
      },
      badges
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      message: 'Failed to fetch analytics overview',
      error: error.message
    });
  }
};

// Get daily calories in vs out for the past week
const getCaloriesData = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get daily workout calories (burned)
    const workoutData = await Workout.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          totalBurned: { $sum: "$calories" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
      }
    ]);

    // Get daily nutrition calories (consumed)
    const nutritionData = await Nutrition.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            day: { $dayOfMonth: "$date" }
          },
          totalConsumed: { $sum: "$calories" }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
      }
    ]);

    // Create a complete 7-day dataset
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const dateKey = {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate()
      };

      const workoutEntry = workoutData.find(w => 
        w._id.year === dateKey.year && 
        w._id.month === dateKey.month && 
        w._id.day === dateKey.day
      );

      const nutritionEntry = nutritionData.find(n => 
        n._id.year === dateKey.year && 
        n._id.month === dateKey.month && 
        n._id.day === dateKey.day
      );

      result.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        burned: workoutEntry ? workoutEntry.totalBurned : 0,
        consumed: nutritionEntry ? nutritionEntry.totalConsumed : 0
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Calories data error:', error);
    res.status(500).json({
      message: 'Failed to fetch calories data',
      error: error.message
    });
  }
};

// Get average macros breakdown for the past week
const getMacrosData = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const macrosData = await Nutrition.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          date: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: null,
          totalProtein: { $sum: "$protein" },
          totalCarbs: { $sum: "$carbs" },
          totalFat: { $sum: "$fat" }
        }
      }
    ]);

    if (!macrosData.length || macrosData[0].totalProtein + macrosData[0].totalCarbs + macrosData[0].totalFat === 0) {
      return res.json([
        { name: 'Protein', value: 0 },
        { name: 'Carbs', value: 0 },
        { name: 'Fat', value: 0 }
      ]);
    }

    const { totalProtein, totalCarbs, totalFat } = macrosData[0];
    const total = totalProtein + totalCarbs + totalFat;

    res.json([
      { name: 'Protein', value: Math.round((totalProtein / total) * 100) },
      { name: 'Carbs', value: Math.round((totalCarbs / total) * 100) },
      { name: 'Fat', value: Math.round((totalFat / total) * 100) }
    ]);

  } catch (error) {
    console.error('Macros data error:', error);
    res.status(500).json({
      message: 'Failed to fetch macros data',
      error: error.message
    });
  }
};

// Get weight trend data for the past month
const getWeightTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const weightData = await Progress.find({
      userId,
      date: { $gte: monthAgo }
    })
    .select('weight date')
    .sort({ date: 1 });

    const result = weightData.map(entry => ({
      date: entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: entry.weight
    }));

    res.json(result);

  } catch (error) {
    console.error('Weight trend error:', error);
    res.status(500).json({
      message: 'Failed to fetch weight trend data',
      error: error.message
    });
  }
};

// Get weight forecast prediction
const getForecast = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const weightData = await Progress.find({
      userId,
      date: { $gte: monthAgo }
    })
    .select('weight date')
    .sort({ date: 1 });

    if (weightData.length < 2) {
      return res.json({
        prediction: null,
        message: 'Need at least 2 weight entries to generate forecast'
      });
    }

    // Simple linear regression for weight prediction
    const n = weightData.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    weightData.forEach((entry, index) => {
      const x = index; // days from first entry
      const y = entry.weight;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    // Calculate slope (weight change per day)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    // Weekly and monthly predictions
    const currentWeight = weightData[weightData.length - 1].weight;
    const weeklyChange = slope * 7;
    const monthlyChange = slope * 30;
    
    let message = '';
    if (Math.abs(weeklyChange) < 0.1) {
      message = 'Your weight is staying stable';
    } else if (weeklyChange > 0) {
      message = `At this rate, you'll gain ${Math.abs(monthlyChange).toFixed(1)}kg in 1 month`;
    } else {
      message = `At this rate, you'll lose ${Math.abs(monthlyChange).toFixed(1)}kg in 1 month`;
    }

    res.json({
      currentWeight: currentWeight,
      weeklyTrend: weeklyChange.toFixed(2),
      monthlyTrend: monthlyChange.toFixed(2),
      message: message,
      dataPoints: weightData.length
    });

  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({
      message: 'Failed to generate forecast',
      error: error.message
    });
  }
};

module.exports = {
  getOverview,
  getCaloriesData,
  getMacrosData,
  getWeightTrend,
  getForecast
};