const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const UserProfile = require('../models/UserProfile');
const Gamification = require('../models/Gamification');

const generateToken = (user) => {
  return jwt.sign(
    { 
      userId: user._id,
      email: user.email 
    }, 
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

const ensureUserHasInitialData = async (userId, email) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    
    // Check if user has app usage data
    const appUsageCount = await AppUsage.countDocuments({ userId, email });
    if (appUsageCount === 0) {
      console.log(`Creating initial app usage data for user ${email} (${userId})`);
      const sampleApps = [
        { appName: 'Chrome', duration: 1200 },
        { appName: 'VS Code', duration: 1800 },
        { appName: 'Slack', duration: 600 },
        { appName: 'Terminal', duration: 600 },
        { appName: 'Discord', duration: 300 }
      ];
      
      for (const app of sampleApps) {
        await new AppUsage({
          userId,
          email,
          date: today,
          appName: app.appName,
          duration: app.duration,
          lastUpdated: new Date()
        }).save();
      }
    }
    
    // Check if user has tab usage data
    const tabCount = await TabUsage.countDocuments({ userId, email });
    if (tabCount === 0) {
      console.log(`Creating initial tab data for user ${email} (${userId})`);
      
      const sampleTabs = [
        { url: 'https://github.com', title: 'GitHub', duration: 900 },
        { url: 'https://stackoverflow.com', title: 'Stack Overflow', duration: 600 },
        { url: 'https://developer.mozilla.org', title: 'MDN Web Docs', duration: 450 },
        { url: 'https://react.dev', title: 'React Documentation', duration: 720 },
        { url: 'https://tailwindcss.com', title: 'Tailwind CSS', duration: 380 }
      ];
      
      for (const tab of sampleTabs) {
        const tabUsage = new TabUsage({
          userId,
          email,
          date: today,
          domain: new URL(tab.url).hostname,
          url: tab.url,
          title: tab.title,
          duration: tab.duration,
          timestamp: new Date()
        });
        await tabUsage.save();
      }
    }

    // Ensure user has a profile
    const profile = await UserProfile.findOne({ userId });
    if (!profile) {
      await new UserProfile({
        userId,
        email,
        displayName: email.split('@')[0]
      }).save();
    }

    // Ensure user has gamification data
    const gamification = await Gamification.findOne({ userId });
    if (!gamification) {
      await new Gamification({
        userId,
        email
      }).save();
    }

  } catch (error) {
    console.error('Error ensuring initial data:', error);
  }
};

const authController = {
  // User registration
  async register(req, res) {
    try {
      const { email, password, name } = req.body;
      
      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      const user = new User({ email, password, name });
      await user.save();
      
      const token = generateToken(user);
      
      // Create initial data for new user
      await ensureUserHasInitialData(user._id, user.email);
      
      res.status(201).json({ 
        user: { id: user._id, email: user.email, name: user.name },
        token 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Server error during registration' });
    }
  },

  // User login
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validation
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid email or password' });
      }
      
      const token = generateToken(user);
      
      // Check if user wants sample data
      const shouldCreateSample = req.body.includeSampleData === true;
      const appCount = await AppUsage.countDocuments({ userId: user._id });
      const tabCount = await TabUsage.countDocuments({ userId: user._id });
      
      if (shouldCreateSample && appCount === 0 && tabCount === 0) {
        await ensureUserHasInitialData(user._id, user.email);
      }
      
      res.json({ 
        user: { id: user._id, email: user.email, name: user.name },
        token,
        hasSampleData: shouldCreateSample && (appCount === 0 && tabCount === 0)
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  },

  // Get current user
  async getCurrentUser(req, res) {
    try {
      res.json({ 
        user: { 
          id: req.user._id, 
          email: req.user.email, 
          name: req.user.name,
          token: req.token 
        } 
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user data' });
    }
  },

  // Logout (optional - mainly handled client-side)
  async logout(req, res) {
    try {
      // Here you could implement token blacklisting if needed
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Server error during logout' });
    }
  },

  // Refresh token
  async refreshToken(req, res) {
    try {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const token = generateToken(user);
      res.json({ token });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  }
};

module.exports = authController;
