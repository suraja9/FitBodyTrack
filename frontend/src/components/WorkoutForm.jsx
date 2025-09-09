import React, { useState, useEffect } from 'react';
import { progressAPI } from '../services/api';

// MET values for different workout types
const MET_VALUES = {
  running: 9.8,
  walking: 3.8,
  cycling: 7.5,
  pushups: 8.0
};

const WORKOUT_OPTIONS = [
  { value: '', label: 'Select workout type' },
  { value: 'running', label: 'Running' },
  { value: 'walking', label: 'Walking' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'pushups', label: 'Push-ups' },
  { value: 'other', label: 'Other (manual calories)' }
];

const WorkoutForm = ({ onSubmit, workout = null, onCancel }) => {
  const [formData, setFormData] = useState({
    type: workout?.type || '',
    duration: workout?.duration || '',
    calories: workout?.calories || '',
    date: workout?.date ? new Date(workout.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    customType: workout?.type && !['running', 'walking', 'cycling', 'pushups'].includes(workout.type) ? workout.type : ''
  });

  const [showWeightAlert, setShowWeightAlert] = useState(false);
  const [latestWeight, setLatestWeight] = useState(null);
  const [loadingWeight, setLoadingWeight] = useState(false);

  const { type, duration, calories, date, customType } = formData;

  // Fetch latest weight when component mounts or when we need auto-calculation
  useEffect(() => {
    const fetchLatestWeight = async () => {
      try {
        setLoadingWeight(true);
        const response = await progressAPI.getProgress();
        if (response.data && response.data.length > 0) {
          // Get the most recent weight entry
          const sortedProgress = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
          setLatestWeight(sortedProgress[0].weight);
        } else {
          setLatestWeight(null);
        }
      } catch (error) {
        console.error('Failed to fetch weight data:', error);
        setLatestWeight(null);
      } finally {
        setLoadingWeight(false);
      }
    };

    // Only fetch weight if we're not editing (for new workouts) or if editing and no calories provided
    if (!workout || (workout && !workout.calories)) {
      fetchLatestWeight();
    }
  }, [workout]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const workoutType = type === 'other' ? customType : type;
    let finalCalories = calories ? parseInt(calories) : null;

    // Check if we need auto-calculation and have the data for it
    const canAutoCalculate = type && MET_VALUES[type.toLowerCase()] && duration && !requiresManualCalories;
    
    if (!finalCalories && canAutoCalculate) {
      if (!latestWeight) {
        setShowWeightAlert(true);
        return;
      }
      
      // Calculate calories using MET formula
      const metValue = MET_VALUES[type.toLowerCase()];
      finalCalories = Math.round(metValue * latestWeight * (parseInt(duration) / 60));
    }

    // For 'other' workout types, calories must be provided manually
    if (type === 'other' && !calories) {
      alert('Please enter calories manually for custom workout types.');
      return;
    }

    try {
      const submitData = {
        type: workoutType,
        duration: parseInt(duration),
        calories: finalCalories,
        weight: latestWeight, // Include weight for backend reference
        date
      };

      await onSubmit(submitData);
      
      // Reset form if this is a new workout (not editing)
      if (!workout) {
        setFormData({
          type: '',
          duration: '',
          calories: '',
          date: new Date().toISOString().split('T')[0],
          customType: ''
        });
      }
    } catch (error) {
      console.error('Error submitting workout:', error);
      // Handle specific error types if needed
      if (error.response?.status === 400) {
        alert('Error: ' + (error.response.data.message || 'Invalid workout data'));
      } else {
        alert('Failed to save workout. Please try again.');
      }
    }
  };

  const canAutoCalculate = type && MET_VALUES[type.toLowerCase()] && duration && latestWeight;
  const showCustomTypeField = type === 'other';
  const requiresManualCalories = type === 'other';

  // Calculate preview calories for display
  const getPreviewCalories = () => {
    if (!canAutoCalculate || calories) return null;
    const metValue = MET_VALUES[type.toLowerCase()];
    return Math.round(metValue * latestWeight * (parseInt(duration || 0) / 60));
  };

  const previewCalories = getPreviewCalories();

  return (
    <div>
      {showWeightAlert && (
        <div className="mb-4 bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
          <div className="flex justify-between items-center">
            <span>
              Please add your current weight in the Progress section before logging workouts with automatic calorie calculation.
            </span>
            <button
              onClick={() => setShowWeightAlert(false)}
              className="text-orange-700 hover:text-orange-900"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {loadingWeight && (
        <div className="mb-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          Loading weight data for automatic calorie calculation...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Workout Type
          </label>
          <select
            name="type"
            value={type}
            onChange={onChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {WORKOUT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showCustomTypeField && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Custom Workout Type
            </label>
            <input
              type="text"
              name="customType"
              value={customType}
              onChange={onChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g. Swimming, Weightlifting, Yoga"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Duration (minutes)
          </label>
          <input
            type="number"
            name="duration"
            value={duration}
            onChange={onChange}
            required
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Calories Burned
            {canAutoCalculate && !requiresManualCalories && (
              <span className="text-xs text-green-600 ml-1">
                (Will be auto-calculated using {latestWeight}kg from Progress)
              </span>
            )}
            {!latestWeight && !requiresManualCalories && type && MET_VALUES[type.toLowerCase()] && (
              <span className="text-xs text-orange-600 ml-1">
                (Add weight in Progress for auto-calculation)
              </span>
            )}
          </label>
          <input
            type="number"
            name="calories"
            value={calories}
            onChange={onChange}
            required={requiresManualCalories}
            min="1"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={requiresManualCalories ? "Enter calories manually" : (previewCalories ? `Auto: ~${previewCalories} cal` : "Auto-calculated or enter manually")}
          />
          {canAutoCalculate && !requiresManualCalories && previewCalories && !calories && (
            <p className="mt-1 text-xs text-green-600">
              Will auto-calculate approximately {previewCalories} calories. Leave empty to use this, or enter a custom value.
            </p>
          )}
          {canAutoCalculate && !requiresManualCalories && !previewCalories && (
            <p className="mt-1 text-xs text-green-600">
              Leave empty for automatic calculation, or enter a custom value to override.
            </p>
          )}
          {requiresManualCalories && (
            <p className="mt-1 text-xs text-orange-600">
              Manual calorie entry required for custom workout types.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            name="date"
            value={date}
            onChange={onChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loadingWeight}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            {loadingWeight ? 'Loading...' : (workout ? 'Update Workout' : 'Add Workout')}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default WorkoutForm;