const Nutrition = require('../models/Nutrition');
const axios = require('axios');

// @desc    Get nutrition entries
// @route   GET /api/nutrition
// @access  Private
const getNutrition = async (req, res) => {
  try {
    let query = { userId: req.user.id };
    
    // If date parameter is provided, filter by that date
    if (req.query.date) {
      const startDate = new Date(req.query.date);
      const endDate = new Date(req.query.date);
      endDate.setHours(23, 59, 59, 999);
      
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }
    
    const nutrition = await Nutrition.find(query).sort({ date: -1 });
    res.status(200).json(nutrition);
  } catch (error) {
    console.error('Get nutrition error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search food items from OpenFoodFacts API
// @route   GET /api/nutrition/search
// @access  Private
const searchFood = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    if (query.length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }

    // Call OpenFoodFacts API with improved parameters
    const response = await axios.get(`https://world.openfoodfacts.org/cgi/search.pl`, {
      params: {
        search_terms: query,
        json: 1,
        page_size: 15,
        search_simple: 1,
        action: 'process',
        fields: 'product_name,brands,nutriments,serving_size,quantity'
      },
      timeout: 8000,
      headers: {
        'User-Agent': 'FitBodyTrack-Nutrition/1.0'
      }
    });

    if (!response.data || !response.data.products) {
      return res.status(404).json({ message: 'No food items found' });
    }

    // Parse and simplify the results with better filtering
    const simplifiedResults = response.data.products
      .filter(product => {
        // More robust filtering
        const hasName = product.product_name && product.product_name.trim().length > 0;
        const hasNutriments = product.nutriments;
        const hasCalories = hasNutriments && (
          product.nutriments['energy-kcal_100g'] ||
          product.nutriments['energy_100g']
        );
        
        return hasName && hasNutriments && hasCalories;
      })
      .slice(0, 10)
      .map(product => {
        const nutriments = product.nutriments;
        
        // Extract calories with fallbacks
        let calories = Math.round(nutriments['energy-kcal_100g'] || 0);
        if (!calories && nutriments['energy_100g']) {
          calories = Math.round(nutriments['energy_100g'] / 4.184); // Convert kJ to kcal
        }

        return {
          name: product.product_name.trim(),
          calories: calories,
          protein: Math.round(nutriments.proteins_100g || 0),
          carbs: Math.round(nutriments.carbohydrates_100g || 0),
          fat: Math.round(nutriments.fat_100g || 0),
          brand: product.brands ? product.brands.split(',')[0].trim() : '',
          serving_size: product.serving_size || '100g',
          // Additional context for user
          quantity: product.quantity || ''
        };
      })
      .filter(item => item.calories > 0); // Final filter to ensure we have calorie data

    res.status(200).json(simplifiedResults);
  } catch (error) {
    console.error('Food search error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({ 
        message: 'Search request timed out. Please try again or enter nutrition data manually.',
        offline: true 
      });
    }
    
    if (error.response && error.response.status >= 500) {
      return res.status(503).json({ 
        message: 'Food database temporarily unavailable. Please enter nutrition data manually.',
        offline: true 
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to search food items. Please try again or enter nutrition data manually.',
      offline: true 
    });
  }
};

// @desc    Add nutrition entry
// @route   POST /api/nutrition
// @access  Private
const addNutrition = async (req, res) => {
  try {
    const { food, calories, date, protein, carbs, fat } = req.body;

    // Validation
    if (!food || !food.trim()) {
      return res.status(400).json({ message: 'Food name is required' });
    }

    if (!calories || isNaN(calories) || calories < 0) {
      return res.status(400).json({ message: 'Valid calories value is required' });
    }

    // Ensure macros are valid numbers
    const validatedProtein = isNaN(protein) ? 0 : Math.max(0, Number(protein));
    const validatedCarbs = isNaN(carbs) ? 0 : Math.max(0, Number(carbs));
    const validatedFat = isNaN(fat) ? 0 : Math.max(0, Number(fat));

    const nutrition = await Nutrition.create({
      food: food.trim(),
      calories: Number(calories),
      protein: validatedProtein,
      carbs: validatedCarbs,
      fat: validatedFat,
      date: date ? new Date(date) : new Date(),
      userId: req.user.id,
    });

    res.status(201).json(nutrition);
  } catch (error) {
    console.error('Add nutrition error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete nutrition entry
// @route   DELETE /api/nutrition/:id
// @access  Private
const deleteNutrition = async (req, res) => {
  try {
    const nutrition = await Nutrition.findById(req.params.id);

    if (!nutrition) {
      return res.status(404).json({ message: 'Nutrition entry not found' });
    }

    // Check for user
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Make sure the logged in user matches the nutrition user
    if (nutrition.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await Nutrition.findByIdAndDelete(req.params.id);

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    console.error('Delete nutrition error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get daily nutrition summary
// @route   GET /api/nutrition/summary/:date
// @access  Private
const getDailySummary = async (req, res) => {
  try {
    const { date } = req.params;
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const nutrition = await Nutrition.find({
      userId: req.user.id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    const summary = nutrition.reduce((totals, item) => ({
      calories: totals.calories + (item.calories || 0),
      protein: totals.protein + (item.protein || 0),
      carbs: totals.carbs + (item.carbs || 0),
      fat: totals.fat + (item.fat || 0),
      entries: totals.entries + 1
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, entries: 0 });

    res.status(200).json(summary);
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNutrition,
  searchFood,
  addNutrition,
  deleteNutrition,
  getDailySummary,
};