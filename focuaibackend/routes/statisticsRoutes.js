const express = require('express');
const router = express.Router();
const statisticsController = require('../controller/statisticsController');

// Middleware for authentication - if you don't have this yet, comment it out
// const { authenticateToken } = require('../middleware/auth');

// Get statistics
// If you don't have authentication middleware ready, remove authenticateToken from the parameters
router.get('/statistics', /*authenticateToken,*/ statisticsController.getStatistics);

// Health check endpoint
router.get('/health', statisticsController.healthCheck);

module.exports = router;