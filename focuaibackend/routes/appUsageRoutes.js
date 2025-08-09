const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const appUsageController = require('../controller/appUsageController');

// Get app usage statistics with time frame filtering
router.get('/app-analytics', auth, appUsageController.getAppUsageStats);

// Get comparison between app usage and web browsing
router.get('/app-vs-web', auth, appUsageController.getAppVsWebUsage);

// Get app usage trends over time
router.get('/app-trends', auth, appUsageController.getAppUsageTrends);

module.exports = router;
