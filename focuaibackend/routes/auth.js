const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const User = require("../models/User.js")

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
    const appUsageCount = await AppUsage.countDocuments({ userId, email });
    if (appUsageCount === 0) {
      console.log(`Creating initial app usage data for user ${email} (${userId})`);
      const sampleApps = [
        { appName: 'Chrome', duration: 1200 },
        { appName: 'VS Code', duration: 1800 },
        { appName: 'Terminal', duration: 600 },
        { appName: 'Slack', duration: 300 }
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
     }    }
    
const tabCount = await TabUsage.countDocuments({ userId, email });
    if (tabCount === 0) {
      console.log(`Creating initial tab data for user ${email} (${userId})`);
      
      const sampleTabs = [
        { url: 'https://github.com', title: 'GitHub', duration: 900 },
        { url: 'https://stackoverflow.com', title: 'Stack Overflow', duration: 600 },
        { url: 'https://developer.mozilla.org', title: 'MDN Web Docs', duration: 450 }
      ];
      
      for (const tab of sampleTabs) {
        const tabUsage = new TabUsage({
          userId,
          email,
          url: tab.url,
          title: tab.title,
          duration: tab.duration,
          timestamp: new Date()
        });
        await tabUsage.save();
      }
    }
  } catch (error) {
    console.error('Error ensuring initial data:', error);
  }
};


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
 
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }
    
    const token = generateToken(user);
    
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
});



router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
 const user = new User({ email, password, name });
    await user.save();
    const token = generateToken(user);
    res.status(201).json({ 
      user: { id: user._id, email: user.email, name: user.name },
      token 
    });}
     catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});


export default router;