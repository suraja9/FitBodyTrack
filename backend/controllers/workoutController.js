const Workout = require('../models/Workout');
const Progress = require('../models/Progress'); // Add this import

// MET values for different workout types
const MET_VALUES = {
  running: 9.8,
  walking: 3.8,
  cycling: 7.5,
  pushups: 8.0
};

// Calculate calories using MET formula
const calculateCalories = (type, duration, weight) => {
  const metValue = MET_VALUES[type.toLowerCase()];
  if (!metValue || !weight || !duration) {
    return null;
  }
  return Math.round(metValue * weight * (duration / 60));
};

// Helper function to get latest weight from Progress
const getLatestWeight = async (userId) => {
  try {
    const latestProgress = await Progress.findOne({ userId })
      .sort({ date: -1 })
      .limit(1);
    return latestProgress ? latestProgress.weight : null;
  } catch (error) {
    console.error('Error fetching latest weight:', error);
    return null;
  }
};

// @desc    Get workouts
// @route   GET /api/workouts
// @access  Private
const getWorkouts = async (req, res) => {
  try {
    const workouts = await Workout.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(200).json(workouts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set workout
// @route   POST /api/workouts
// @access  Private
const setWorkout = async (req, res) => {
  try {
    const { type, duration, weight, calories, date } = req.body;

    if (!type || !duration) {
      return res.status(400).json({ message: 'Please add type and duration' });
    }

    let finalCalories = calories;
    let finalWeight = weight;

    // If no calories provided, try to auto-calculate
    if (!calories) {
      // If no weight provided, try to get latest weight from Progress
      if (!weight) {
        finalWeight = await getLatestWeight(req.user.id);
        if (!finalWeight) {
          return res.status(400).json({ 
            message: 'Please add your weight in the Progress section for automatic calorie calculation, or enter calories manually',
            type: 'NO_WEIGHT_DATA'
          });
        }
      }

      // Calculate calories
      const calculatedCalories = calculateCalories(type, duration, finalWeight);
      if (calculatedCalories) {
        finalCalories = calculatedCalories;
      } else {
        return res.status(400).json({ 
          message: 'Cannot auto-calculate calories for this workout type. Please enter calories manually.' 
        });
      }
    }

    // Ensure calories is provided either manually or calculated
    if (!finalCalories) {
      return res.status(400).json({ 
        message: 'Please provide calories or ensure you have weight data for automatic calculation' 
      });
    }

    const workout = await Workout.create({
      type,
      duration,
      weight: finalWeight,
      calories: finalCalories,
      date: date || Date.now(),
      userId: req.user.id,
    });

    res.status(201).json(workout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update workout
// @route   PUT /api/workouts/:id
// @access  Private
const updateWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(400).json({ message: 'Workout not found' });
    }

    // Check for user
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Make sure the logged in user matches the workout user
    if (workout.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    const { type, duration, weight, calories } = req.body;
    let updateData = { ...req.body };

    // If type, duration, or weight are being updated and no manual calories provided
    if ((type || duration || weight) && !calories) {
      const finalType = type || workout.type;
      const finalDuration = duration || workout.duration;
      let finalWeight = weight || workout.weight;
      
      // If no weight provided and none exists in workout, fetch from Progress
      if (!finalWeight) {
        finalWeight = await getLatestWeight(req.user.id);
        if (finalWeight) {
          updateData.weight = finalWeight;
        }
      }
      
      const calculatedCalories = calculateCalories(finalType, finalDuration, finalWeight);
      if (calculatedCalories) {
        updateData.calories = calculatedCalories;
      }
    }

    const updatedWorkout = await Workout.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true }
    );

    res.status(200).json(updatedWorkout);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete workout
// @route   DELETE /api/workouts/:id
// @access  Private
const deleteWorkout = async (req, res) => {
  try {
    const workout = await Workout.findById(req.params.id);

    if (!workout) {
      return res.status(400).json({ message: 'Workout not found' });
    }

    // Check for user
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Make sure the logged in user matches the workout user
    if (workout.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await Workout.findByIdAndDelete(req.params.id);

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getWorkouts,
  setWorkout,
  updateWorkout,
  deleteWorkout,
};