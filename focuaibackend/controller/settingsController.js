const UserProfile = require('../models/UserProfile');
const Gamification = require('../models/Gamification');
const User = require('../models/User');

const settingsController = {
  // Get user settings
  async getSettings(req, res) {
    try {
      const profile = await UserProfile.findOne({ userId: req.user._id });
      const gamification = await Gamification.findOne({ userId: req.user._id });
      
      const settings = {
        profile: {
          preferences: profile?.preferences || {
            isPublic: true,
            showInLeaderboard: true,
            emailNotifications: true,
            achievementNotifications: true,
            theme: 'system',
            compactMode: false,
            showExtensionStatus: true,
            animationsEnabled: true
          }
        },
        gamification: {
          dailyGoals: gamification?.dailyGoals || {
            focusTimeTarget: 240,
            focusScoreTarget: 75,
            sessionsTarget: 4
          }
        },
        notifications: {
          email: profile?.preferences?.emailNotifications || true,
          achievements: profile?.preferences?.achievementNotifications || true,
          challenges: true,
          leaderboard: true,
          dailyReminders: true,
          weeklyReports: true,
          focusReminders: true,
          productivityAlerts: true
        },
        tracking: {
          autoTrack: profile?.preferences?.autoTrack !== false,
          trackPrivateTabs: profile?.preferences?.trackPrivateTabs || false,
          syncInterval: profile?.preferences?.syncInterval || 30,
          minSessionTime: profile?.preferences?.minSessionTime || 5
        },
        display: {
          theme: profile?.preferences?.theme || 'system',
          compactMode: profile?.preferences?.compactMode || false,
          showExtensionStatus: profile?.preferences?.showExtensionStatus !== false,
          animationsEnabled: profile?.preferences?.animationsEnabled !== false
        },
        privacy: {
          profileVisibility: profile?.preferences?.isPublic ? 'public' : 'private',
          showInLeaderboard: profile?.preferences?.showInLeaderboard !== false,
          showProfilePhoto: profile?.preferences?.showProfilePhoto !== false,
          showLocation: profile?.preferences?.showLocation !== false,
          showJobTitle: profile?.preferences?.showJobTitle !== false,
          dataRetention: profile?.preferences?.dataRetention || 90,
          anonymizeData: profile?.preferences?.anonymizeData || false,
          shareAnalytics: profile?.preferences?.shareAnalytics || false
        }
      };

      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  },

  // Update user settings
  async updateSettings(req, res) {
    try {
      const { profile, gamification, notifications, privacy, tracking, display } = req.body;

      // Update profile preferences
      if (profile || notifications || privacy || tracking || display) {
        let userProfile = await UserProfile.findOne({ userId: req.user._id });
        
        if (!userProfile) {
          userProfile = new UserProfile({
            userId: req.user._id,
            email: req.user.email,
            displayName: req.user.name || req.user.email.split('@')[0]
          });
        }

        if (profile?.preferences) {
          userProfile.preferences = { ...userProfile.preferences, ...profile.preferences };
        }

        if (notifications) {
          userProfile.preferences.emailNotifications = notifications.email;
          userProfile.preferences.achievementNotifications = notifications.achievements;
          userProfile.preferences.focusReminders = notifications.focusReminders;
          userProfile.preferences.productivityAlerts = notifications.productivityAlerts;
          userProfile.preferences.dailyReminders = notifications.dailyReminders;
          userProfile.preferences.weeklyReports = notifications.weeklyReports;
        }

        if (tracking) {
          userProfile.preferences.autoTrack = tracking.autoTrack;
          userProfile.preferences.trackPrivateTabs = tracking.trackPrivateTabs;
          userProfile.preferences.syncInterval = tracking.syncInterval;
          userProfile.preferences.minSessionTime = tracking.minSessionTime;
        }

        if (display) {
          userProfile.preferences.theme = display.theme;
          userProfile.preferences.compactMode = display.compactMode;
          userProfile.preferences.showExtensionStatus = display.showExtensionStatus;
          userProfile.preferences.animationsEnabled = display.animationsEnabled;
        }

        if (privacy) {
          userProfile.preferences.isPublic = privacy.profileVisibility === 'public';
          userProfile.preferences.showInLeaderboard = privacy.showInLeaderboard;
          userProfile.preferences.showProfilePhoto = privacy.showProfilePhoto;
          userProfile.preferences.showLocation = privacy.showLocation;
          userProfile.preferences.showJobTitle = privacy.showJobTitle;
          userProfile.preferences.dataRetention = privacy.dataRetention;
          userProfile.preferences.anonymizeData = privacy.anonymizeData;
          userProfile.preferences.shareAnalytics = privacy.shareAnalytics;
        }

        await userProfile.save();
      }

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
  },

  // Reset user data
  async resetData(req, res) {
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
  },

  // Export user data
  async exportData(req, res) {
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
  },

  // Delete account
  async deleteAccount(req, res) {
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
  },

  // Update daily goals
  async updateDailyGoals(req, res) {
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
  },

  // Get notification preferences
  async getNotifications(req, res) {
    try {
      const profile = await UserProfile.findOne({ userId: req.user._id });
      
      const notifications = {
        email: profile?.preferences?.emailNotifications || true,
        achievements: profile?.preferences?.achievementNotifications || true,
        challenges: true,
        leaderboard: true,
        dailyReminders: profile?.preferences?.dailyReminders !== false,
        weeklyReports: profile?.preferences?.weeklyReports !== false,
        focusReminders: profile?.preferences?.focusReminders !== false,
        productivityAlerts: profile?.preferences?.productivityAlerts !== false
      };

      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  },

  // Update notification preferences
  async updateNotifications(req, res) {
    try {
      const { 
        email, 
        achievements, 
        challenges, 
        leaderboard, 
        dailyReminders, 
        weeklyReports,
        focusReminders,
        productivityAlerts 
      } = req.body;

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
      if (dailyReminders !== undefined) profile.preferences.dailyReminders = dailyReminders;
      if (weeklyReports !== undefined) profile.preferences.weeklyReports = weeklyReports;
      if (focusReminders !== undefined) profile.preferences.focusReminders = focusReminders;
      if (productivityAlerts !== undefined) profile.preferences.productivityAlerts = productivityAlerts;

      await profile.save();

      res.json({ message: 'Notification preferences updated successfully' });
    } catch (error) {
      console.error('Error updating notifications:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  }
};

module.exports = settingsController;
