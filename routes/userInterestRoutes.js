const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Get user's interests
router.get('/interests', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('interests');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ success: true, interests: user.interests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add interests to user
router.post('/interests', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      return res.status(400).json({ success: false, message: 'Categories must be an array' });
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { interests: { $each: categories } } },
      { new: true }
    ).select('interests');
    
    res.json({ success: true, interests: user.interests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Remove interest from user
router.delete('/interests/:category', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category } = req.params;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { interests: category } },
      { new: true }
    ).select('interests');
    
    res.json({ success: true, interests: user.interests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
