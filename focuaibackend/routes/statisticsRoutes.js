const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const statisticsController = require('../controller/statisticsController');

// Get user statistics
router.get('/statistics', auth, statisticsController.getStatistics);

// Health check route
router.get('/health', statisticsController.healthCheck);

module.exports = router;