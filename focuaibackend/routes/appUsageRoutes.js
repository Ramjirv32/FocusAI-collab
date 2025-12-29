const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const appUsageController = require('../controller/appUsageController');


router.get('/app-analytics', auth, appUsageController.getAppUsageStats);


router.get('/app-vs-web', auth, appUsageController.getAppVsWebUsage);


router.get('/app-trends', auth, appUsageController.getAppUsageTrends);

module.exports = router;
