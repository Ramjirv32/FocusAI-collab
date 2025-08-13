const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const statisticsController = require('../controller/statisticsController');
const ProductivitySummary = require('../models/ProductivitySummary');
const AppUsage = require('../models/AppUsage');

// Get user statistics
router.get('/statistics', auth, statisticsController.getStatistics);

// Health check route
router.get('/health', statisticsController.healthCheck);

// Basic overview endpoint
router.get('/overview', auth, async (req, res) => {
  try {
    // Find the latest productivity summary
    const summary = await ProductivitySummary.findOne({
      userId: req.user._id,
      email: req.user.email
    }).sort({ date: -1 });
    
    if (!summary) {
      return res.json({
        focusScore: 0,
        productiveTime: 0,
        distractionTime: 0,
        topApps: [],
        streak: 0,
        totalAppUsage: 0
      });
    }
    
    // Get app usage for top apps
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: summary.date
    }).sort({ duration: -1 }).limit(5);
    
    const topApps = appUsage.map(app => ({
      name: app.appName,
      duration: app.duration
    }));
    
    res.json({
      focusScore: summary.focusScore || 0,
      productiveTime: summary.totalProductiveTime || 0,
      distractionTime: summary.totalNonProductiveTime || 0,
      topApps: topApps,
      streak: summary.streak || 0,
      totalAppUsage: summary.overallTotalUsage || 0
    });
  } catch (error) {
    console.error('Error fetching statistics overview:', error);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

module.exports = router;