const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');

// Import Focus Results model (we'll create this next)
const FocusResult = require('../models/FocusResult');
const ProductivitySummary = require('../models/ProductivitySummary');

// Store focus analysis results
router.post('/focus-results', auth, async (req, res) => {
  try {
    const { 
      userId, 
      date, 
      productivityScore,
      focusAreas, 
      distractionAreas, 
      totalFocusTimeSeconds,
      totalDistractionTimeSeconds
    } = req.body;
    
    // Validate that the authenticated user matches the userId in the request
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to store focus results for another user' 
      });
    }
    
    // Find existing result for this user and date
    let focusResult = await FocusResult.findOne({ 
      userId, 
      date 
    });
    
    if (focusResult) {
      // Update existing record
      focusResult.productivityScore = productivityScore;
      focusResult.focusAreas = focusAreas;
      focusResult.distractionAreas = distractionAreas;
      focusResult.totalFocusTimeSeconds = totalFocusTimeSeconds;
      focusResult.totalDistractionTimeSeconds = totalDistractionTimeSeconds;
      focusResult.lastUpdated = new Date();
      
      await focusResult.save();
      
      res.json({ 
        success: true, 
        message: 'Focus results updated', 
        data: focusResult 
      });
    } else {
      // Create new record
      focusResult = new FocusResult({
        userId,
        email: req.user.email,
        date,
        productivityScore,
        focusAreas,
        distractionAreas,
        totalFocusTimeSeconds,
        totalDistractionTimeSeconds
      });
      
      await focusResult.save();
      
      res.json({ 
        success: true, 
        message: 'Focus results stored', 
        data: focusResult 
      });
    }
  } catch (error) {
    console.error('Error storing focus results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error storing focus results', 
      error: error.message 
    });
  }
});

// Get focus results for a user
router.get('/focus-results', auth, async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = {
      userId: req.user.id
    };
    
    if (date) {
      query.date = date;
    }
    
    const focusResults = await FocusResult.find(query)
      .sort({ date: -1 })
      .limit(date ? 1 : 30); // If date specified, get just one, otherwise get last 30 days
      
    res.json({ 
      success: true, 
      data: focusResults 
    });
    
  } catch (error) {
    console.error('Error getting focus results:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting focus results', 
      error: error.message 
    });
  }
});

// Get focus summary
router.get('/summary', auth, async (req, res) => {
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
        distractions: []
      });
    }
    
    // Format distractions
    const distractions = Object.entries(summary.distractionContent || {})
      .map(([name, duration]) => ({ name, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5);
    
    res.json({
      focusScore: summary.focusScore || 0,
      productiveTime: summary.totalProductiveTime || 0,
      distractions: distractions
    });
  } catch (error) {
    console.error('Error fetching focus summary:', error);
    res.status(500).json({ error: 'Failed to fetch focus summary' });
  }
});

module.exports = router;