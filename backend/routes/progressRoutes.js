const express = require('express');
const router = express.Router();
const {
  getProgress,
  addProgress,
  deleteProgress,
} = require('../controllers/progressController');

const { protect } = require('../middleware/authMiddleware');

router.route('/').get(protect, getProgress).post(protect, addProgress);
router.route('/:id').delete(protect, deleteProgress);

module.exports = router;