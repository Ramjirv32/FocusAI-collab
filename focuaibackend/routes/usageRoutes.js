const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');

// Get raw usage data
router.get('/', auth, async (req, res) => {
  try {
    console.log('User requesting raw usage data:', req.user.email);
    const { date, timeFrame } = req.query;
    
    // Default to today if no date provided
    const today = date ? new Date(date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    
    // Calculate date range based on time frame
    let startDate = today;
    
    if (timeFrame === 'weekly') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10);
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().slice(0, 10);
    }
    
    // Get app usage for the specified time range
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: { $gte: startDate, $lte: today }
    });
    
    console.log(`Found ${appUsage.length} app usage records for user ${req.user.email}`);
    
    // Format app usage
    const appUsageFormatted = appUsage.reduce((acc, item) => {
      acc[item.appName] = (acc[item.appName] || 0) + item.duration;
      return acc;
    }, {});
    
    // Get tab usage data
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(today);
    endDateObj.setDate(endDateObj.getDate() + 1); // Include the end date
    
    const tabs = await TabUsage.find({
      userId: req.user._id,
      email: req.user.email,
      timestamp: { $gte: startDateObj, $lt: endDateObj }
    });
    
    console.log(`Found ${tabs.length} tab records for user ${req.user.email}`);
    
    // Group tab usage by domain
    const tabUsage = tabs.reduce((acc, tab) => {
      const domain = tab.domain || 'unknown';
      acc[domain] = (acc[domain] || 0) + tab.duration;
      return acc;
    }, {});
    
    res.json({
      appUsage: appUsageFormatted,
      tabUsage: tabUsage,
      userEmail: req.user.email
    });
  } catch (error) {
    console.error('Error fetching raw usage data:', error);
    res.status(500).json({ error: 'Failed to fetch usage data', details: error.message });
  }
});

module.exports = router;