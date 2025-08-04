const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const TabUsage = require('../models/TabUsage');

// Get tab usage data
router.get('/', auth, async (req, res) => {
  try {
    console.log(`User requesting tabs data: ${req.user.email}`);
    
    // Get time frame from query params
    const { date, timeFrame } = req.query;
    
    // Default to today if no date provided
    const endDate = date ? new Date(date) : new Date();
    let startDate = new Date(endDate);
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    // Find tabs for this user within the date range
    const tabs = await TabUsage.find({
      email: req.user.email,
      $or: [
        // Match by userId string comparison
        { userId: req.user._id.toString() },
        // Match by userId ObjectId
        { userId: req.user._id }
      ],
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ duration: -1 });
    
    console.log(`Found ${tabs.length} tabs for user ${req.user.email}`);
    res.json(tabs);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    res.status(500).json({ error: 'Failed to fetch tabs', details: error.message });
  }
});

module.exports = router;