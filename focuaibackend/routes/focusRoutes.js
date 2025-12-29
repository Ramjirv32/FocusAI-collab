const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');


const FocusResult = require('../models/FocusResult');
const ProductivitySummary = require('../models/ProductivitySummary');


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
    
    
    if (req.user.id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to store focus results for another user' 
      });
    }
    
    
    let focusResult = await FocusResult.findOne({ 
      userId, 
      date 
    });
    
    if (focusResult) {
      
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
      .limit(date ? 1 : 30); 
      
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


router.get('/summary', auth, async (req, res) => {
  try {
    
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