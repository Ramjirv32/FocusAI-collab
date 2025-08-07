const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const Gamification = require('../models/Gamification');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get user settings
router.get('/settings', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user._id });
    const gamification = await Gamification.findOne({ userId: req.user._id });
    
    const settings = {
      notifications: {
        focusReminders: profile?.preferences?.focusReminders || true,
        productivityAlerts: profile?.preferences?.productivityAlerts || true,
        weeklyReports: profile?.preferences?.weeklyReports || false,
        achievements: profile?.preferences?.achievementNotifications || true,
        dailyReminders: profile?.preferences?.dailyReminders || true,
        email: profile?.preferences?.emailNotifications || true
      },
      tracking: {
        autoTrack: profile?.preferences?.autoTrack !== false, // Default to true
        trackPrivateTabs: profile?.preferences?.trackPrivateTabs || false,
        syncInterval: profile?.preferences?.syncInterval || 30,
        minSessionTime: profile?.preferences?.minSessionTime || 5
      },
      display: {
        theme: profile?.preferences?.theme || 'system',
        compactMode: profile?.preferences?.compactMode || false,
        showExtensionStatus: profile?.preferences?.showExtensionStatus !== false, // Default to true
        animationsEnabled: profile?.preferences?.animationsEnabled !== false // Default to true
      },
      privacy: {
        dataRetention: profile?.preferences?.dataRetention || 90,
        anonymizeData: profile?.preferences?.anonymizeData || false,
        shareAnalytics: profile?.preferences?.shareAnalytics || false,
        profileVisibility: profile?.preferences?.isPublic ? 'public' : 'private',
        showInLeaderboard: profile?.preferences?.showInLeaderboard !== false, // Default to true
        showProfilePhoto: profile?.preferences?.showProfilePhoto !== false, // Default to true
        showLocation: profile?.preferences?.showLocation !== false, // Default to true
        showJobTitle: profile?.preferences?.showJobTitle !== false // Default to true
      },
      gamification: {
        dailyGoals: gamification?.dailyGoals || {
          focusTimeTarget: 240,
          focusScoreTarget: 75,
          sessionsTarget: 4
        }
      }
    };

    console.log(`Sending complete settings for user ${req.user.email}:`, settings);
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update user settings
router.put('/settings', auth, async (req, res) => {
  try {
    const { notifications, tracking, display, privacy, gamification } = req.body;

    console.log(`Updating settings for user ${req.user.email}:`, req.body);

    // Update profile preferences
    let userProfile = await UserProfile.findOne({ userId: req.user._id });
    
    if (!userProfile) {
      userProfile = new UserProfile({
        userId: req.user._id,
        email: req.user.email,
        displayName: req.user.name || req.user.email.split('@')[0],
        preferences: {}
      });
    }

    // Ensure preferences object exists
    if (!userProfile.preferences) {
      userProfile.preferences = {};
    }

    // Update notifications settings
    if (notifications) {
      userProfile.preferences.focusReminders = notifications.focusReminders;
      userProfile.preferences.productivityAlerts = notifications.productivityAlerts;
      userProfile.preferences.weeklyReports = notifications.weeklyReports;
      userProfile.preferences.achievementNotifications = notifications.achievements;
      userProfile.preferences.dailyReminders = notifications.dailyReminders;
      userProfile.preferences.emailNotifications = notifications.email;
    }

    // Update tracking settings
    if (tracking) {
      userProfile.preferences.autoTrack = tracking.autoTrack;
      userProfile.preferences.trackPrivateTabs = tracking.trackPrivateTabs;
      userProfile.preferences.syncInterval = tracking.syncInterval;
      userProfile.preferences.minSessionTime = tracking.minSessionTime;
    }

    // Update display settings
    if (display) {
      userProfile.preferences.theme = display.theme;
      userProfile.preferences.compactMode = display.compactMode;
      userProfile.preferences.showExtensionStatus = display.showExtensionStatus;
      userProfile.preferences.animationsEnabled = display.animationsEnabled;
    }

    // Update privacy settings
    if (privacy) {
      userProfile.preferences.dataRetention = privacy.dataRetention;
      userProfile.preferences.anonymizeData = privacy.anonymizeData;
      userProfile.preferences.shareAnalytics = privacy.shareAnalytics;
      userProfile.preferences.isPublic = privacy.profileVisibility === 'public';
      userProfile.preferences.showInLeaderboard = privacy.showInLeaderboard;
      userProfile.preferences.showProfilePhoto = privacy.showProfilePhoto;
      userProfile.preferences.showLocation = privacy.showLocation;
      userProfile.preferences.showJobTitle = privacy.showJobTitle;
    }

    await userProfile.save();

    // Update gamification settings
    if (gamification?.dailyGoals) {
      let userGamification = await Gamification.findOne({ userId: req.user._id });
      
      if (!userGamification) {
        userGamification = new Gamification({
          userId: req.user._id,
          email: req.user.email
        });
      }

      userGamification.dailyGoals = { ...userGamification.dailyGoals, ...gamification.dailyGoals };
      await userGamification.save();
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset user data
router.post('/reset-data', auth, async (req, res) => {
  try {
    const { type } = req.body; // 'gamification', 'profile', 'all'

    if (type === 'gamification' || type === 'all') {
      await Gamification.findOneAndDelete({ userId: req.user._id });
    }

    if (type === 'profile' || type === 'all') {
      await UserProfile.findOneAndDelete({ userId: req.user._id });
    }

    res.json({ message: `${type} data reset successfully` });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Export user data
router.get('/export-data', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user._id });
    const gamification = await Gamification.findOne({ userId: req.user._id });
    const user = await User.findById(req.user._id).select('-password');

    const exportData = {
      user,
      profile,
      gamification,
      exportDate: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="focusai-data-export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Delete account
router.delete('/account', auth, async (req, res) => {
  try {
    const { confirmPassword } = req.body;

    // Verify password
    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(confirmPassword);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Delete all user data
    await Promise.all([
      User.findByIdAndDelete(req.user._id),
      UserProfile.findOneAndDelete({ userId: req.user._id }),
      Gamification.findOneAndDelete({ userId: req.user._id })
    ]);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Update daily goals
router.put('/daily-goals', auth, async (req, res) => {
  try {
    const { focusTimeTarget, focusScoreTarget, sessionsTarget } = req.body;

    let gamification = await Gamification.findOne({ userId: req.user._id });
    
    if (!gamification) {
      gamification = new Gamification({
        userId: req.user._id,
        email: req.user.email
      });
    }

    if (focusTimeTarget !== undefined) gamification.dailyGoals.focusTimeTarget = focusTimeTarget;
    if (focusScoreTarget !== undefined) gamification.dailyGoals.focusScoreTarget = focusScoreTarget;
    if (sessionsTarget !== undefined) gamification.dailyGoals.sessionsTarget = sessionsTarget;

    await gamification.save();

    res.json({ 
      message: 'Daily goals updated successfully',
      dailyGoals: gamification.dailyGoals
    });
  } catch (error) {
    console.error('Error updating daily goals:', error);
    res.status(500).json({ error: 'Failed to update daily goals' });
  }
});

// Get notification preferences
router.get('/notifications', auth, async (req, res) => {
  try {
    const profile = await UserProfile.findOne({ userId: req.user._id });
    
    const notifications = {
      email: profile?.preferences?.emailNotifications || true,
      achievements: profile?.preferences?.achievementNotifications || true,
      challenges: true,
      leaderboard: true,
      dailyReminders: true,
      weeklyReports: true
    };

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// Update notification preferences
router.put('/notifications', auth, async (req, res) => {
  try {
    const { email, achievements, challenges, leaderboard, dailyReminders, weeklyReports } = req.body;

    let profile = await UserProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      profile = new UserProfile({
        userId: req.user._id,
        email: req.user.email,
        displayName: req.user.name || req.user.email.split('@')[0]
      });
    }

    if (email !== undefined) profile.preferences.emailNotifications = email;
    if (achievements !== undefined) profile.preferences.achievementNotifications = achievements;

    await profile.save();

    res.json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

module.exports = router;
