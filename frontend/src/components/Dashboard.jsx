import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { workoutsAPI, nutritionAPI, progressAPI, analyticsAPI } from '../services/api';

// Chart.js imports for additional charts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
} from 'chart.js';
import { Line as ChartLine, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  ChartLegend
);

const Dashboard = ({ user }) => {
  const [workouts, setWorkouts] = useState([]);
  const [nutrition, setNutrition] = useState([]);
  const [progress, setProgress] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [advancedAnalytics, setAdvancedAnalytics] = useState({
    caloriesData: [],
    macrosData: [],
    weightTrendData: [],
    forecastData: null
  });
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllData();
    fetchAdvancedAnalytics();
  }, []);

  const fetchAllData = async () => {
    try {
      const [workoutsRes, nutritionRes, progressRes, analyticsRes] = await Promise.all([
        workoutsAPI.getWorkouts(),
        nutritionAPI.getNutrition(),
        progressAPI.getProgress(),
        analyticsAPI.overview()
      ]);
      
      setWorkouts(workoutsRes.data);
      setNutrition(nutritionRes.data);
      setProgress(progressRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      setError('Failed to fetch data');
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancedAnalytics = async () => {
    try {
      const [caloriesRes, macrosRes, weightTrendRes, forecastRes] = await Promise.all([
        analyticsAPI.getCaloriesData(),
        analyticsAPI.getMacrosData(),
        analyticsAPI.getWeightTrend(),
        analyticsAPI.getForecast()
      ]);

      setAdvancedAnalytics({
        caloriesData: caloriesRes.data,
        macrosData: macrosRes.data,
        weightTrendData: weightTrendRes.data,
        forecastData: forecastRes.data
      });
    } catch (error) {
      console.error('Advanced analytics fetch error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const getWeightChartData = () => {
    return progress
      .slice()
      .reverse()
      .slice(-7) // Last 7 entries for dashboard
      .map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: item.weight,
      }));
  };

  const getRecentActivity = () => {
    const recentWorkouts = workouts.slice(0, 3).map(w => ({ ...w, type: 'workout' }));
    const recentNutrition = nutrition.slice(0, 3).map(n => ({ ...n, type: 'nutrition' }));
    
    return [...recentWorkouts, ...recentNutrition]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getBadgeTooltip = (badge) => {
    const tooltips = {
      'first_workout': 'Complete your first workout',
      'ten_workouts': 'Complete 10 workouts total',
      'streak_7': 'Maintain a 7-day workout streak',
      'burn_5000': 'Burn 5,000+ calories from workouts',
      'log_7': 'Maintain a 7-day nutrition logging streak'
    };
    return tooltips[badge.key] || 'Complete this challenge';
  };

  // Chart.js configurations
  const caloriesChartData = {
    labels: advancedAnalytics.caloriesData.map(d => d.date),
    datasets: [
      {
        label: 'Calories Consumed',
        data: advancedAnalytics.caloriesData.map(d => d.consumed),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
      },
      {
        label: 'Calories Burned',
        data: advancedAnalytics.caloriesData.map(d => d.burned),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
      }
    ]
  };

  const macrosChartData = {
    labels: advancedAnalytics.macrosData.map(d => d.name),
    datasets: [
      {
        data: advancedAnalytics.macrosData.map(d => d.value),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 2,
      }
    ]
  };

  const weightTrendChartData = {
    labels: advancedAnalytics.weightTrendData.map(d => d.date),
    datasets: [
      {
        label: 'Weight (kg)',
        data: advancedAnalytics.weightTrendData.map(d => d.weight),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      },
    },
  };

  const macrosChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="text-center">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome back, {user.name}! Here's your fitness overview.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {/* Weekly Calories Burned */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900">
                Weekly Calories Burned
              </h3>
              <p className="mt-2 text-2xl font-bold text-blue-600">
                {analytics?.weeklyCaloriesBurned || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Last 7 days
              </p>
            </div>
          </div>
        </div>

        {/* Daily Calories Consumed */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900">
                Today's Calories In
              </h3>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {analytics?.todayCaloriesIn || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Consumed today
              </p>
            </div>
          </div>
        </div>

        {/* Current Weight */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900">
                Current Weight
              </h3>
              <p className="mt-2 text-2xl font-bold text-purple-600">
                {analytics?.currentWeight || '--'} kg
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Latest entry
              </p>
            </div>
          </div>
        </div>

        {/* Calorie Balance */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900">
                Calorie Balance
              </h3>
              <p className={`mt-2 text-2xl font-bold ${
                (analytics?.calorieBalanceToday || 0) > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {(analytics?.calorieBalanceToday || 0) > 0 ? '+' : ''}{analytics?.calorieBalanceToday || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                In vs Out (today)
              </p>
            </div>
          </div>
        </div>

        {/* Workout Streak */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900">
                Workout Streak
              </h3>
              <p className={`mt-2 text-2xl font-bold ${
                (analytics?.streaks?.workout || 0) >= 7 ? 'text-green-600' : 'text-orange-600'
              }`}>
                {analytics?.streaks?.workout || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Days in a row
              </p>
            </div>
          </div>
        </div>

        {/* Logging Streak */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="text-center">
              <h3 className="text-sm font-medium text-gray-900">
                Logging Streak
              </h3>
              <p className="mt-2 text-2xl font-bold text-indigo-600">
                {analytics?.streaks?.nutrition || 0}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Days in a row
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Advanced Analytics</h2>
        
        {analyticsLoading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading advanced analytics...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Calories In vs Out Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Calories In vs Out (7 Days)</h3>
              {advancedAnalytics.caloriesData.length > 0 ? (
                <div className="h-64">
                  <ChartLine data={caloriesChartData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No calorie data available for the past week
                </div>
              )}
            </div>

            {/* Macros Breakdown Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Macros Breakdown (7 Days)</h3>
              {advancedAnalytics.macrosData.some(d => d.value > 0) ? (
                <div className="h-64">
                  <Doughnut data={macrosChartData} options={macrosChartOptions} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No macro data available for the past week
                </div>
              )}
            </div>

            {/* Weight Trend Chart */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weight Trend (30 Days)</h3>
              {advancedAnalytics.weightTrendData.length > 0 ? (
                <div className="h-64">
                  <ChartLine data={weightTrendChartData} options={chartOptions} />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No weight data available for the past month
                </div>
              )}
            </div>

            {/* Forecast Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weight Forecast</h3>
              {advancedAnalytics.forecastData ? (
                <div className="space-y-4">
                  {advancedAnalytics.forecastData.prediction !== null ? (
                    <>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-purple-600">
                          {advancedAnalytics.forecastData.currentWeight} kg
                        </p>
                        <p className="text-sm text-gray-600">Current Weight</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <p className={`text-lg font-semibold ${
                            parseFloat(advancedAnalytics.forecastData.weeklyTrend) > 0 
                              ? 'text-red-600' 
                              : parseFloat(advancedAnalytics.forecastData.weeklyTrend) < 0 
                                ? 'text-green-600' 
                                : 'text-gray-600'
                          }`}>
                            {parseFloat(advancedAnalytics.forecastData.weeklyTrend) > 0 ? '+' : ''}
                            {advancedAnalytics.forecastData.weeklyTrend} kg
                          </p>
                          <p className="text-xs text-gray-500">Weekly Trend</p>
                        </div>
                        <div>
                          <p className={`text-lg font-semibold ${
                            parseFloat(advancedAnalytics.forecastData.monthlyTrend) > 0 
                              ? 'text-red-600' 
                              : parseFloat(advancedAnalytics.forecastData.monthlyTrend) < 0 
                                ? 'text-green-600' 
                                : 'text-gray-600'
                          }`}>
                            {parseFloat(advancedAnalytics.forecastData.monthlyTrend) > 0 ? '+' : ''}
                            {advancedAnalytics.forecastData.monthlyTrend} kg
                          </p>
                          <p className="text-xs text-gray-500">Monthly Trend</p>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800 text-center">
                          {advancedAnalytics.forecastData.message}
                        </p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-xs text-gray-500">
                          Based on {advancedAnalytics.forecastData.dataPoints} weight entries
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {advancedAnalytics.forecastData.message}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Unable to generate forecast</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Weight Trend Chart (Original) */}
        {progress.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Weight Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getWeightChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} kg`, 'Weight']} />
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

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          {getRecentActivity().length === 0 ? (
            <p className="text-gray-500 text-sm">No recent activity. Start logging your workouts and meals!</p>
          ) : (
            <ul className="space-y-3">
              {getRecentActivity().map((item, index) => (
                <li key={`${item.type}-${item._id}-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      item.type === 'workout' ? 'bg-blue-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {item.type === 'workout' ? item.type : item.food}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {item.calories} cal
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.type === 'workout' ? 'burned' : 'consumed'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Badges Section */}
      {analytics?.badges && (
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Badges</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {analytics.badges.map((badge) => (
              <div
                key={badge.key}
                className={`relative p-4 rounded-lg border-2 text-center transition-all ${
                  badge.earned
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
                title={badge.earned ? 'Earned!' : getBadgeTooltip(badge)}
              >
                <div className={`text-2xl mb-2 ${
                  badge.earned ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {badge.earned ? '✓' : '○'}
                </div>
                <p className="text-sm font-medium">
                  {badge.label}
                </p>
                {badge.earned && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{workouts.length}</p>
            <p className="text-sm text-gray-600">Total Workouts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{nutrition.length}</p>
            <p className="text-sm text-gray-600">Meals Logged</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{progress.length}</p>
            <p className="text-sm text-gray-600">Weight Entries</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;