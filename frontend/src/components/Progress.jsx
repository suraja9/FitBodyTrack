import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { progressAPI } from '../services/api';

const Progress = () => {
  const [progress, setProgress] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    weight: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await progressAPI.getProgress();
      setProgress(response.data);
    } catch (error) {
      setError('Failed to fetch progress data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await progressAPI.addProgress({
        ...formData,
        weight: parseFloat(formData.weight),
      });
      setProgress([response.data, ...progress]);
      setFormData({ weight: '', date: new Date().toISOString().split('T')[0] });
      setShowForm(false);
      setError('');
    } catch (error) {
      setError('Failed to add progress entry');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this progress entry?')) {
      try {
        await progressAPI.deleteProgress(id);
        setProgress(progress.filter(p => p._id !== id));
        setError('');
      } catch (error) {
        setError('Failed to delete progress entry');
      }
    }
  };

  const getChartData = () => {
    return progress
      .slice()
      .reverse()
      .slice(-30) // Last 30 entries
      .map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: item.weight,
        fullDate: item.date
      }));
  };

  const getCurrentWeight = () => {
    return progress.length > 0 ? progress[0].weight : 0;
  };

  const getWeightChange = () => {
    if (progress.length < 2) return 0;
    const current = progress[0].weight;
    const previous = progress[1].weight;
    return (current - previous).toFixed(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading progress data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Progress Tracking</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track your weight and see your progress over time
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Current Weight Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Current Weight
              </h3>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {getCurrentWeight()} kg
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Latest entry
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Change
              </h3>
              <p className={`mt-2 text-3xl font-bold ${getWeightChange() >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {getWeightChange() >= 0 ? '+' : ''}{getWeightChange()} kg
              </p>
              <p className="mt-1 text-sm text-gray-500">
                From last entry
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Weight Chart */}
      {progress.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Weight Trend (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]) {
                      return formatDate(payload[0].payload.fullDate);
                    }
                    return label;
                  }}
                  formatter={(value) => [`${value} kg`, 'Weight']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Add Weight Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Weight Entry'}
        </button>
      </div>

      {/* Add Weight Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Weight Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                required
                min="1"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="70.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Add Entry
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Progress List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Weight Entries
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {progress.length} entr{progress.length !== 1 ? 'ies' : 'y'} logged
          </p>
        </div>
        
        {progress.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-gray-500">No weight entries yet. Add your first weight record!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {progress.map((item) => (
              <li key={item._id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-medium text-purple-600">
                        {item.weight} kg
                      </p>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(item._id)}
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

export default Progress;