const Progress = require('../models/Progress');

// @desc    Get progress entries
// @route   GET /api/progress
// @access  Private
const getProgress = async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.user.id }).sort({ date: -1 });
    res.status(200).json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add progress entry
// @route   POST /api/progress
// @access  Private
const addProgress = async (req, res) => {
  try {
    const { weight, date } = req.body;

    if (!weight) {
      return res.status(400).json({ message: 'Please add weight' });
    }

    const progress = await Progress.create({
      weight,
      date: date || Date.now(),
      userId: req.user.id,
    });

    res.status(201).json(progress);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete progress entry
// @route   DELETE /api/progress/:id
// @access  Private
const deleteProgress = async (req, res) => {
  try {
    const progress = await Progress.findById(req.params.id);

    if (!progress) {
      return res.status(400).json({ message: 'Progress entry not found' });
    }

    // Check for user
    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Make sure the logged in user matches the progress user
    if (progress.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }

    await Progress.findByIdAndDelete(req.params.id);

    res.status(200).json({ id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProgress,
  addProgress,
  deleteProgress,
};