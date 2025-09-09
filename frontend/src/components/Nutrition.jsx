import React, { useState, useEffect, useRef } from 'react';
import { nutritionAPI } from '../services/api';

const Nutrition = () => {
  const [nutrition, setNutrition] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    food: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Food search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOffline, setSearchOffline] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    fetchNutrition(selectedDate);
  }, [selectedDate]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchNutrition = async (date) => {
    try {
      setLoading(true);
      setError('');
      const response = await nutritionAPI.getNutrition(date);
      setNutrition(response.data);
    } catch (error) {
      console.error('Fetch nutrition error:', error);
      setError('Failed to fetch nutrition data');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    setFormData(prev => ({ ...prev, date: newDate }));
  };

  const setQuickDate = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    const dateString = date.toISOString().split('T')[0];
    handleDateChange(dateString);
  };

  const searchFood = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchOffline(false);
      return;
    }

    try {
      setSearchLoading(true);
      setSearchOffline(false);
      const response = await nutritionAPI.searchFood(query);
      setSearchResults(response.data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Food search failed:', error);
      setSearchResults([]);
      setShowSearchResults(true);
      setSearchOffline(true);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFormData(prev => ({ ...prev, food: query }));

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchFood(query);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setSearchOffline(false);
    }
  };

  const selectFoodItem = (foodItem) => {
    setFormData(prev => ({
      ...prev,
      food: foodItem.name,
      calories: foodItem.calories.toString(),
      protein: foodItem.protein.toString(),
      carbs: foodItem.carbs.toString(),
      fat: foodItem.fat.toString(),
    }));
    setSearchQuery(foodItem.name);
    setShowSearchResults(false);
    setSearchResults([]);
    setSearchOffline(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await nutritionAPI.addNutrition({
        ...formData,
        calories: parseInt(formData.calories) || 0,
        protein: parseInt(formData.protein) || 0,
        carbs: parseInt(formData.carbs) || 0,
        fat: parseInt(formData.fat) || 0,
      });
      
      // Add to list if the entry is for the currently selected date
      const entryDate = new Date(response.data.date).toISOString().split('T')[0];
      if (entryDate === selectedDate) {
        setNutrition([response.data, ...nutrition]);
      }
      
      // Reset form
      setFormData({ 
        food: '', 
        calories: '', 
        protein: '', 
        carbs: '', 
        fat: '', 
        date: selectedDate 
      });
      setSearchQuery('');
      setShowForm(false);
      setShowSearchResults(false);
      setSearchOffline(false);
    } catch (error) {
      console.error('Add nutrition error:', error);
      setError('Failed to add nutrition entry');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this nutrition entry?')) {
      try {
        await nutritionAPI.deleteNutrition(id);
        setNutrition(nutrition.filter(n => n._id !== id));
        setError('');
      } catch (error) {
        console.error('Delete nutrition error:', error);
        setError('Failed to delete nutrition entry');
      }
    }
  };

  const getDailyCalories = () => {
    return nutrition.reduce((total, item) => total + (item.calories || 0), 0);
  };

  const getDailyMacros = () => {
    return nutrition.reduce((totals, item) => ({
      protein: totals.protein + (item.protein || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fat: totals.fat + (item.fat || 0)
    }), { protein: 0, carbs: 0, fat: 0 });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isToday = (date) => {
    return date === new Date().toISOString().split('T')[0];
  };

  const isYesterday = (date) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date === yesterday.toISOString().split('T')[0];
  };

  const getDateDisplayText = (date) => {
    if (isToday(date)) return "Today's Log";
    if (isYesterday(date)) return "Yesterday's Log";
    return `Log for ${formatDate(date)}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading nutrition data...</p>
        </div>
      </div>
    );
  }

  const dailyMacros = getDailyMacros();

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Nutrition Log</h1>
        <p className="mt-1 text-sm text-gray-600">
          Track your daily calorie and macronutrient intake
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
            onClick={() => setError('')}
          >
            <span className="text-red-500">&times;</span>
          </button>
        </div>
      )}

      {/* Date Selection */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {getDateDisplayText(selectedDate)}
            </h3>
            <p className="text-sm text-gray-500">
              Select a date to view nutrition entries
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Quick Date Buttons */}
            <button
              onClick={() => setQuickDate(0)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isToday(selectedDate)
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            
            <button
              onClick={() => setQuickDate(-1)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isYesterday(selectedDate)
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
              }`}
            >
              Yesterday
            </button>
            
            {/* Date Picker */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Daily Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-green-500">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900">Calories</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {getDailyCalories()}
            </p>
            <p className="text-xs text-gray-500">kcal</p>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-blue-500">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900">Protein</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {dailyMacros.protein}
            </p>
            <p className="text-xs text-gray-500">g</p>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-yellow-500">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900">Carbs</h3>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {dailyMacros.carbs}
            </p>
            <p className="text-xs text-gray-500">g</p>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg border-l-4 border-red-500">
          <div className="px-4 py-5 sm:p-6 text-center">
            <h3 className="text-sm font-medium text-gray-900">Fat</h3>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {dailyMacros.fat}
            </p>
            <p className="text-xs text-gray-500">g</p>
          </div>
        </div>
      </div>

      {/* Add Nutrition Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        >
          {showForm ? 'Cancel' : 'Add Food Entry'}
        </button>
      </div>

      {/* Add Nutrition Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add Food Entry</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Food Search */}
            <div className="relative" ref={searchInputRef}>
              <label className="block text-sm font-medium text-gray-700">
                Food Item *
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInputChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Search for foods (e.g. banana, chicken breast) or enter manually"
              />
              
              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg border border-gray-200 rounded-md max-h-60 overflow-auto">
                  {searchLoading ? (
                    <div className="px-4 py-3 text-gray-500 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                      Searching foods...
                    </div>
                  ) : searchOffline ? (
                    <div className="px-4 py-3 text-amber-600 bg-amber-50">
                      <div className="flex items-center">
                        <span className="text-amber-500 mr-2">⚠️</span>
                        <div>
                          <p className="text-sm font-medium">Couldn't fetch food data</p>
                          <p className="text-xs">Please enter nutrition values manually</p>
                        </div>
                      </div>
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((item, index) => (
                      <div
                        key={index}
                        onClick={() => selectFoodItem(item)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            {item.brand && (
                              <p className="text-xs text-gray-500">{item.brand}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-green-600">
                              {item.calories} kcal
                            </p>
                            <div className="flex space-x-2 text-xs text-gray-500">
                              <span>P:{item.protein}g</span>
                              <span>C:{item.carbs}g</span>
                              <span>F:{item.fat}g</span>
                            </div>
                            <p className="text-xs text-gray-400">per {item.serving_size}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-gray-500">
                      <p className="text-sm">No foods found</p>
                      <p className="text-xs">Try a different search term or enter manually</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Nutrition Fields */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Calories *
                </label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  required
                  min="0"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                  placeholder="250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={formData.protein}
                  onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  min="0"
                  step="0.1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={formData.carbs}
                  onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  min="0"
                  step="0.1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
                  placeholder="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={formData.fat}
                  onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                  min="0"
                  step="0.1"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  placeholder="10"
                />
              </div>
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Add Entry
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSearchQuery('');
                  setShowSearchResults(false);
                  setSearchOffline(false);
                  setFormData({ 
                    food: '', 
                    calories: '', 
                    protein: '', 
                    carbs: '', 
                    fat: '', 
                    date: selectedDate 
                  });
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Nutrition List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Food Entries
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {nutrition.length} entr{nutrition.length !== 1 ? 'ies' : 'y'} for {formatDate(selectedDate)}
          </p>
        </div>
        
        {nutrition.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg mb-2">No nutrition entries for this date</p>
            <p className="text-gray-400">Add your first food item to get started!</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {nutrition.map((item) => (
              <li key={item._id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-gray-900 truncate">
                        {item.food}
                      </h4>
                      <div className="ml-4 flex-shrink-0 flex flex-wrap gap-2">
                        <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                          {item.calories} kcal
                        </span>
                        {item.protein > 0 && (
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            P: {item.protein}g
                          </span>
                        )}
                        {item.carbs > 0 && (
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">
                            C: {item.carbs}g
                          </span>
                        )}
                        {item.fat > 0 && (
                          <span className="px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">
                            F: {item.fat}g
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <svg className="flex-shrink-0 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{formatDate(item.date)}</span>
                      {item.createdAt && item.createdAt !== item.date && (
                        <span className="ml-2 text-gray-400">
                          • Added {new Date(item.createdAt).toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleDelete(item._id)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium transition-colors focus:outline-none focus:underline"
                      aria-label={`Delete ${item.food} entry`}
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

      {/* Summary Footer */}
      {nutrition.length > 0 && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Daily Total:</span>
            <div className="flex space-x-4">
              <span className="font-medium text-green-700">{getDailyCalories()} kcal</span>
              <span className="font-medium text-blue-700">{dailyMacros.protein}g protein</span>
              <span className="font-medium text-yellow-700">{dailyMacros.carbs}g carbs</span>
              <span className="font-medium text-red-700">{dailyMacros.fat}g fat</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nutrition;