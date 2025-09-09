const express = require('express');
const router = express.Router();
const {
  getNutrition,
  searchFood,
  addNutrition,
  deleteNutrition,
  getDailySummary,
} = require('../controllers/nutritionController');

const { protect } = require('../middleware/authMiddleware');

// Main nutrition routes
router.route('/').get(protect, getNutrition).post(protect, addNutrition);
router.route('/:id').delete(protect, deleteNutrition);

// Food search route (moved before summary to avoid conflicts)
router.route('/search').get(protect, searchFood);

// Daily summary route
router.route('/summary/:date').get(protect, getDailySummary);

module.exports = router;