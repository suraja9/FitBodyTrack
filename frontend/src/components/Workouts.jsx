import React, { useState, useEffect } from 'react';
import WorkoutForm from './WorkoutForm';
import { workoutsAPI } from '../services/api';

const Workouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      const response = await workoutsAPI.getWorkouts();
      setWorkouts(response.data);
    } catch (error) {
      setError('Failed to fetch workouts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkout = async (workoutData) => {
    try {
      const response = await workoutsAPI.createWorkout(workoutData);
      setWorkouts([response.data, ...workouts]);
      setShowForm(false);
      setError('');
    } catch (error) {
      setError('Failed to add workout');
    }
  };

  const handleUpdateWorkout = async (workoutData) => {
    try {
      const response = await workoutsAPI.updateWorkout(editingWorkout._id, workoutData);
      setWorkouts(workouts.map(w => w._id === editingWorkout._id ? response.data : w));
      setEditingWorkout(null);
      setError('');
    } catch (error) {
      setError('Failed to update workout');
    }
  };

  const handleDeleteWorkout = async (id) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      try {
        await workoutsAPI.deleteWorkout(id);
        setWorkouts(workouts.filter(w => w._id !== id));
        setError('');
      } catch (error) {
        setError('Failed to delete workout');
      }
    }
  };

  const getTotalCalories = () => {
    return workouts.reduce((total, workout) => total + workout.calories, 0);
  };

  const getTotalDuration = () => {
    return workouts.reduce((total, workout) => total + workout.duration, 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if workout was likely auto-calculated based on common MET values
  const isLikelyCalculated = (workout) => {
    if (!workout.weight || !workout.duration) return false;
    
    const metValues = {
      running: 9.8,
      walking: 3.8,
      cycling: 7.5,
      pushups: 8.0
    };
    
    const metValue = metValues[workout.type.toLowerCase()];
    if (!metValue) return false;
    
    const calculatedCalories = Math.round(metValue * workout.weight * (workout.duration / 60));
    return Math.abs(calculatedCalories - workout.calories) < 2; // Allow for small rounding differences
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading workouts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Workouts</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your workout sessions with automatic calorie calculation
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Total Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Total Calories
              </h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {getTotalCalories()}
              </p>
              <p className="mt-1 text-sm text-gray-500">calories burned</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Total Duration
              </h3>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {getTotalDuration()}
              </p>
              <p className="mt-1 text-sm text-gray-500">minutes</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Total Workouts
              </h3>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {workouts.length}
              </p>
              <p className="mt-1 text-sm text-gray-500">sessions logged</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Workout Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          {showForm ? 'Cancel' : 'Add New Workout'}
        </button>
      </div>

      {/* Add Workout Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Workout</h3>
          <WorkoutForm
            onSubmit={handleAddWorkout}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Edit Workout Form */}
      {editingWorkout && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Workout</h3>
          <WorkoutForm
            workout={editingWorkout}
            onSubmit={handleUpdateWorkout}
            onCancel={() => setEditingWorkout(null)}
          />
        </div>
      )}

      {/* Workouts List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Your Workouts
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {workouts.length} workout{workouts.length !== 1 ? 's' : ''} logged
          </p>
        </div>
        
        {workouts.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-gray-500">No workouts logged yet. Add your first workout to get started!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {workouts.map((workout) => (
              <li key={workout._id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-blue-600 truncate capitalize">
                        {workout.type}
                      </p>
                      <div className="ml-2 flex-shrink-0 flex space-x-2">
                        <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {workout.calories} cal
                        </p>
                        {isLikelyCalculated(workout) && (
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            Auto-calc
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex sm:space-x-4">
                        <p className="flex items-center text-sm text-gray-500">
                          Duration: {workout.duration} minutes
                        </p>
                        {workout.weight && (
                          <p className="flex items-center text-sm text-gray-500">
                            {isLikelyCalculated(workout) ? 
                              `Calories calculated using ${workout.weight} kg (from Progress)` :
                              `Weight: ${workout.weight} kg`
                            }
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          {formatDate(workout.date)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => setEditingWorkout(workout)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteWorkout(workout._id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Workouts;