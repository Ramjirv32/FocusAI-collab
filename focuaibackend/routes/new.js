const express = require('express');
const router = express.Router();


const authController = require('../controller/authController');
const profileController = require('../controller/profileController');
const settingsController = require('../controller/settingsController');
const gamificationController = require('../controller/gamificationController');
const usageController = require('../controller/usageController');
const { notificationController } = require('../controller/notificationController');


const auth = require('../middleware/auth');


router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/user', auth, authController.getCurrentUser);
router.post('/auth/logout', auth, authController.logout);
router.post('/auth/refresh', auth, authController.refreshToken);


router.get('/profile', auth, profileController.getProfile);
router.put('/profile', auth, profileController.updateProfile);
router.post('/profile/photo', auth, profileController.uploadProfilePhoto);
router.delete('/profile/photo', auth, profileController.deleteProfilePhoto);
router.get('/profile/public', auth, profileController.getPublicProfiles);
router.get('/profile/rank', auth, profileController.getUserRank);


router.get('/settings', auth, settingsController.getSettings);
router.put('/settings', auth, settingsController.updateSettings);
router.post('/settings/reset-data', auth, settingsController.resetData);
router.get('/settings/export-data', auth, settingsController.exportData);
router.delete('/settings/account', auth, settingsController.deleteAccount);
router.put('/settings/daily-goals', auth, settingsController.updateDailyGoals);
router.get('/settings/notifications', auth, settingsController.getNotifications);
router.put('/settings/notifications', auth, settingsController.updateNotifications);


router.get('/gamification/data', auth, gamificationController.getGamificationData);
router.post('/gamification/award', auth, gamificationController.awardPoints);
router.post('/gamification/claim-reward', auth, gamificationController.claimReward);
router.get('/gamification/leaderboard', auth, gamificationController.getLeaderboard);
router.get('/gamification/rank', auth, gamificationController.getUserRank);


router.get('/usage/raw', auth, usageController.getRawUsage);
router.get('/usage/apps', auth, usageController.getAppUsage);
router.get('/usage/tabs', auth, usageController.getTabUsage);
router.post('/usage/log-tab', usageController.logTab); 
router.get('/usage/stats', auth, usageController.getUserStats);
router.post('/usage/sync', auth, usageController.syncData);


router.get('/notifications', auth, notificationController.getNotifications);
router.put('/notifications/:notificationId/read', auth, notificationController.markAsRead);
router.put('/notifications/read-all', auth, notificationController.markAllAsRead);
router.delete('/notifications/:notificationId', auth, notificationController.deleteNotification);
router.post('/notifications', auth, notificationController.createNotification);
router.get('/notifications/stats', auth, notificationController.getNotificationStats);


router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'FocusAI API',
    version: '2.0.0'
  });
});

module.exports = router;