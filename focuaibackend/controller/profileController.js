const UserProfile = require('../models/UserProfile');
const User = require('../models/User');

const profileController = {
  // Get user profile
  async getProfile(req, res) {
    try {
      let profile = await UserProfile.findOne({ userId: req.user._id });
      
      if (!profile) {
        // Create default profile if doesn't exist
        profile = new UserProfile({
          userId: req.user._id,
          email: req.user.email,
          displayName: req.user.name || req.user.email.split('@')[0]
        });
        await profile.save();
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  },

  // Update user profile
  async updateProfile(req, res) {
    try {
      const {
        displayName,
        bio,
        location,
        jobTitle,
        company,
        socialLinks,
        preferences,
        profilePhoto,
        website,
        twitter,
        linkedin,
        github
      } = req.body;

      let profile = await UserProfile.findOne({ userId: req.user._id });
      
      if (!profile) {
        profile = new UserProfile({
          userId: req.user._id,
          email: req.user.email,
          displayName: displayName || req.user.name || req.user.email.split('@')[0]
        });
      }

      // Update fields
      if (displayName !== undefined) profile.displayName = displayName;
      if (bio !== undefined) profile.bio = bio;
      if (location !== undefined) profile.location = location;
      if (jobTitle !== undefined) profile.jobTitle = jobTitle;
      if (company !== undefined) profile.company = company;
      if (profilePhoto !== undefined) profile.profilePhoto = profilePhoto;
      
      // Handle social links - both new format and legacy individual fields
      if (socialLinks) {
        profile.socialLinks = { ...profile.socialLinks, ...socialLinks };
      } else {
        // Handle individual social fields for backward compatibility
        if (website !== undefined) profile.socialLinks.website = website;
        if (twitter !== undefined) profile.socialLinks.twitter = twitter;
        if (linkedin !== undefined) profile.socialLinks.linkedin = linkedin;
        if (github !== undefined) profile.socialLinks.github = github;
      }
      
      if (preferences) profile.preferences = { ...profile.preferences, ...preferences };

      await profile.save();
      res.json(profile);
    } catch (error) {
      console.error('Error updating profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  },

  // Upload profile photo (base64)
  async uploadProfilePhoto(req, res) {
    try {
      const { profilePhoto } = req.body;
      
      if (!profilePhoto) {
        return res.status(400).json({ error: 'Profile photo is required' });
      }

      // Validate base64 image
      if (!profilePhoto.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format. Must be base64 encoded image.' });
      }

      // Check file size (base64 is ~33% larger than original)
      const imageSizeBytes = (profilePhoto.length * 3) / 4;
      if (imageSizeBytes > 5 * 1024 * 1024) { // 5MB limit
        return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
      }

      let profile = await UserProfile.findOne({ userId: req.user._id });
      
      if (!profile) {
        profile = new UserProfile({
          userId: req.user._id,
          email: req.user.email,
          displayName: req.user.name || req.user.email.split('@')[0]
        });
      }

      profile.profilePhoto = profilePhoto;
      await profile.save();

      res.json({ 
        message: 'Profile photo updated successfully',
        profilePhoto: profilePhoto
      });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      res.status(500).json({ error: 'Failed to upload profile photo' });
    }
  },

  // Delete profile photo
  async deleteProfilePhoto(req, res) {
    try {
      const profile = await UserProfile.findOne({ userId: req.user._id });
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }

      profile.profilePhoto = null;
      await profile.save();

      res.json({ message: 'Profile photo deleted successfully' });
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      res.status(500).json({ error: 'Failed to delete profile photo' });
    }
  },

  // Get public profiles for leaderboard
  async getPublicProfiles(req, res) {
    try {
      const { limit = 10, sortBy = 'totalPoints' } = req.query;
      
      let sortField = {};
      switch (sortBy) {
        case 'totalPoints':
          sortField = { 'level.totalPoints': -1 };
          break;
        case 'focusScore':
          sortField = { 'stats.averageFocusScore': -1 };
          break;
        case 'streak':
          sortField = { 'stats.currentStreak': -1 };
          break;
        case 'focusTime':
          sortField = { 'stats.totalFocusTime': -1 };
          break;
        default:
          sortField = { 'level.totalPoints': -1 };
      }

      const profiles = await UserProfile.find({
        'preferences.isPublic': true,
        'preferences.showInLeaderboard': true
      })
      .select('displayName profilePhoto level stats achievements location jobTitle company')
      .sort(sortField)
      .limit(parseInt(limit));

      res.json(profiles);
    } catch (error) {
      console.error('Error fetching public profiles:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }
  },

  // Get user rank in leaderboard
  async getUserRank(req, res) {
    try {
      const { sortBy = 'totalPoints' } = req.query;
      
      const userProfile = await UserProfile.findOne({ userId: req.user._id });
      if (!userProfile) {
        return res.json({ rank: null, total: 0 });
      }

      let compareField;
      let userValue;
      
      switch (sortBy) {
        case 'totalPoints':
          compareField = 'level.totalPoints';
          userValue = userProfile.level.totalPoints;
          break;
        case 'focusScore':
          compareField = 'stats.averageFocusScore';
          userValue = userProfile.stats.averageFocusScore;
          break;
        case 'streak':
          compareField = 'stats.currentStreak';
          userValue = userProfile.stats.currentStreak;
          break;
        case 'focusTime':
          compareField = 'stats.totalFocusTime';
          userValue = userProfile.stats.totalFocusTime;
          break;
        default:
          compareField = 'level.totalPoints';
          userValue = userProfile.level.totalPoints;
      }

      const rank = await UserProfile.countDocuments({
        [compareField]: { $gt: userValue },
        'preferences.isPublic': true,
        'preferences.showInLeaderboard': true
      }) + 1;

      const total = await UserProfile.countDocuments({
        'preferences.isPublic': true,
        'preferences.showInLeaderboard': true
      });

      res.json({ rank, total, value: userValue });
    } catch (error) {
      console.error('Error getting user rank:', error);
      res.status(500).json({ error: 'Failed to get user rank' });
    }
  }
};

module.exports = profileController;
