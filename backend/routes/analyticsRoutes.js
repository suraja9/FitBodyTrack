const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  getOverview,
  getCaloriesData,
  getMacrosData,
  getWeightTrend,
  getForecast
} = require('../controllers/analyticsController');

// Existing route
router.get('/overview', protect, getOverview);

// New advanced analytics routes
router.get('/calories', protect, getCaloriesData);
router.get('/macros', protect, getMacrosData);
router.get('/weight-trend', protect, getWeightTrend);
router.get('/forecast', protect, getForecast);

module.exports = router;