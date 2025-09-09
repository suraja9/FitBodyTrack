import axios from 'axios';

const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-url.com/api' 
  : '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 second timeout
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (userData) => api.post('/auth/login', userData),
  getProfile: () => api.get('/auth/me'),
};

// Workouts API
export const workoutsAPI = {
  getWorkouts: () => api.get('/workouts'),
  createWorkout: (workoutData) => api.post('/workouts', workoutData),
  updateWorkout: (id, workoutData) => api.put(`/workouts/${id}`, workoutData),
  deleteWorkout: (id) => api.delete(`/workouts/${id}`),
};

// Enhanced Nutrition API
export const nutritionAPI = {
  // Get nutrition entries with optional date filtering
  getNutrition: (date) => {
    const params = date ? { params: { date } } : {};
    return api.get('/nutrition', params);
  },
  
  // Search for food items with improved error handling
  searchFood: (query) => {
    if (!query || query.length < 2) {
      return Promise.reject(new Error('Query must be at least 2 characters'));
    }
    
    return api.get('/nutrition/search', {
      params: { query: encodeURIComponent(query.trim()) },
      timeout: 8000, // Longer timeout for external API
    });
  },
  
  // Add nutrition entry with validation
  addNutrition: (nutritionData) => {
    // Client-side validation
    if (!nutritionData.food || !nutritionData.food.trim()) {
      return Promise.reject(new Error('Food name is required'));
    }
    
    if (!nutritionData.calories || isNaN(nutritionData.calories) || nutritionData.calories < 0) {
      return Promise.reject(new Error('Valid calories value is required'));
    }
    
    // Ensure all numeric fields are properly formatted
    const cleanedData = {
      ...nutritionData,
      food: nutritionData.food.trim(),
      calories: Number(nutritionData.calories),
      protein: Number(nutritionData.protein) || 0,
      carbs: Number(nutritionData.carbs) || 0,
      fat: Number(nutritionData.fat) || 0,
      date: nutritionData.date || new Date().toISOString().split('T')[0],
    };
    
    return api.post('/nutrition', cleanedData);
  },
  
  // Delete nutrition entry
  deleteNutrition: (id) => {
    if (!id) {
      return Promise.reject(new Error('Entry ID is required'));
    }
    return api.delete(`/nutrition/${id}`);
  },
  
  // Get daily summary for a specific date
  getDailySummary: (date) => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return api.get(`/nutrition/summary/${targetDate}`);
  },
  
  // Get nutrition data for a date range
  getNutritionRange: (startDate, endDate) => {
    return api.get('/nutrition/range', {
      params: { startDate, endDate }
    });
  },
  
  // Batch operations for multiple entries
  addMultipleNutrition: (nutritionEntries) => {
    return api.post('/nutrition/batch', { entries: nutritionEntries });
  },
};

// Progress API
export const progressAPI = {
  getProgress: () => api.get('/progress'),
  addProgress: (progressData) => api.post('/progress', progressData),
  deleteProgress: (id) => api.delete(`/progress/${id}`),
};

// Analytics API
export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  // New advanced analytics endpoints
  getCaloriesData: () => api.get('/analytics/calories'),
  getMacrosData: () => api.get('/analytics/macros'),
  getWeightTrend: () => api.get('/analytics/weight-trend'),
  getForecast: () => api.get('/analytics/forecast'),
};

// Utility functions for nutrition calculations
export const nutritionUtils = {
  // Calculate total daily nutrition from entries array
  calculateDailyTotals: (nutritionEntries) => {
    return nutritionEntries.reduce((totals, entry) => ({
      calories: totals.calories + (entry.calories || 0),
      protein: totals.protein + (entry.protein || 0),
      carbs: totals.carbs + (entry.carbs || 0),
      fat: totals.fat + (entry.fat || 0),
      entries: totals.entries + 1,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 });
  },
  
  // Calculate macro percentages
  calculateMacroPercentages: (protein, carbs, fat) => {
    const total = protein + carbs + fat;
    if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
    
    return {
      protein: Math.round((protein / total) * 100),
      carbs: Math.round((carbs / total) * 100),
      fat: Math.round((fat / total) * 100),
    };
  },
  
  // Calculate calories from macros
  calculateCaloriesFromMacros: (protein, carbs, fat) => {
    return (protein * 4) + (carbs * 4) + (fat * 9);
  },
  
  // Validate nutrition entry
  validateNutritionEntry: (entry) => {
    const errors = [];
    
    if (!entry.food || !entry.food.trim()) {
      errors.push('Food name is required');
    }
    
    if (!entry.calories || isNaN(entry.calories) || entry.calories < 0) {
      errors.push('Valid calories value is required');
    }
    
    if (entry.protein && (isNaN(entry.protein) || entry.protein < 0)) {
      errors.push('Protein must be a positive number');
    }
    
    if (entry.carbs && (isNaN(entry.carbs) || entry.carbs < 0)) {
      errors.push('Carbs must be a positive number');
    }
    
    if (entry.fat && (isNaN(entry.fat) || entry.fat < 0)) {
      errors.push('Fat must be a positive number');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  },
  
  // Format date for API calls
  formatDateForAPI: (date) => {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    return date;
  },
  
  // Get quick date options
  getQuickDateOptions: () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return {
      today: today.toISOString().split('T')[0],
      yesterday: yesterday.toISOString().split('T')[0],
      weekAgo: weekAgo.toISOString().split('T')[0],
    };
  },
};

export default api;