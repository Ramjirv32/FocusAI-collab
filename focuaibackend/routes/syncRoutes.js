const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');


router.post('/', auth, async (req, res) => {
  try {
    console.log(`User syncing data: ${req.user.email}`);
    
    
    
    res.json({
      success: true,
      message: 'Data sync initiated',
      lastSyncTime: new Date()
    });
    
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Failed to sync data', details: error.message });
  }
});

module.exports = router;