const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const activeWindow = require('active-win');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();


const User = require('./models/User');
const AppUsage = require('./models/AppUsage');
const TabUsage = require('./models/TabUsage');
const ProductivitySummary = require('./models/ProductivitySummary');
const UserProfile = require('./models/UserProfile');
const Gamification = require('./models/Gamification');
const ChatHistory = require('./models/ChatHistory');

const auth = require('./middleware/auth');

// Make sure this line is already in the imports
// const chatRoutes = require('./routes/chatRoutes');
const profileRoutes = require('./routes/profileRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const newRoutes = require('./routes/new');
const appUsageRoutes = require('./routes/appUsageRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const healthRoutes = require('./routes/healthRoutes');
const chatRoutes = require('./routes/chatRoutes');
const focusRoutes = require('./routes/focusRoutes');

const systemRoutes = require('./routes/systemRoutes');
const todoRoutes = require('./routes/todoRoutes');


const app = express();
const PORT = process.env.PORT || 5001; // Make sure this is 5001


const activeUsers = new Map(); // userId -> {timestamp, email}


mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api/chat', chatRoutes);
app.use('/api', profileRoutes);
app.use('/api/gamification', gamificationRoutes); // Make sure this is using gamificationRoutes.js, not gamificationRoutess.js
app.use('/api', settingsRoutes);
app.use('/api', newRoutes);
app.use('/api/app-usage', appUsageRoutes); 
app.use('/api', statisticsRoutes);
app.use('/api', healthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/focus', focusRoutes);

app.use('/api/system', systemRoutes);

app.use('/api/todos', todoRoutes);


// Register todo routes (this line should already be there)
app.use('/api/todos', todoRoutes);



console.log('Routes registered: profileRoutes, gamificationRoutes, settingsRoutes, newRoutes, appUsageRoutes, statisticsRoutes, healthRoutes');



app.get('/ch', auth, async (req, res) => {
    try {
        const email = req.user.email; // Get email from authenticated user
        const data = await ProductivitySummary.find({email: email}); // Use find() not findAll()
        res.json(data);
    } catch (error) {
        console.error('Error fetching productivity summary:', error);
        res.status(500).json({ error: 'Failed to fetch productivity data' });
    }
});


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



app.post('/api/register', async (req, res) => {
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
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});



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
      }
    }
  
    
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

const Tabusage = require("./models/TabUsage");

app.get("/g", async (req, res) => {
  try {
    const { userId, email, date } = req.query;
    
    let appFilter = {};
    let tabFilter = {};
    if (userId) {
      appFilter.userId = userId;
      tabFilter.userId = userId;
    }
    if (email) {
      appFilter.email = email;
      tabFilter.email = email;
    }
    if (date) {
      appFilter.date = date;
      tabFilter.date = date;
    }
    console.log(`📊 Fetching data with filters:`, { appFilter, tabFilter });
    const appUsage = await AppUsage.find(appFilter);
    const tabUsage = await TabUsage.find(tabFilter);
    
    console.log(`✅ Found ${appUsage.length} app records and ${tabUsage.length} tab records`);
    
    res.json({ 
      appUsage: appUsage || [], 
      tabUsage: tabUsage || [],
      filters: { userId, email, date }
    });
  } catch (e) {
    console.error('Error fetching data:', e);
    res.status(500).json({ error: "Internal server error", details: e.message });
  }
});


app.post('/api/login', async (req, res) => {
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

app.post('/api/clear-sample-data', auth, async (req, res) => {
  try {
    console.log(`Clearing sample data for user ${req.user.email}`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deletedAppUsage = await AppUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email,
      appName: { $in: ['Chrome', 'VS Code', 'Terminal', 'Slack'] },
      duration: { $in: [1200, 1800, 600, 300] }
    });
    
    const deletedTabUsage = await TabUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email,
      url: { $in: ['https://github.com', 'https://stackoverflow.com', 'https://developer.mozilla.org'] },
      duration: { $in: [900, 600, 450] }
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Sample data cleared successfully',
      deletedCounts: {
        appUsage: deletedAppUsage.deletedCount,
        tabUsage: deletedTabUsage.deletedCount
      }
    });
  } catch (error) {
    console.error('Error clearing sample data:', error);
    res.status(500).json({ error: 'Failed to clear sample data' });
  }
});

app.get('/api/user', auth, async (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, name: req.user.name,token : req.token } });
});


app.post('/log-tab', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received Tab Data:', data);
    
    let userId = null;
    let userEmail = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        userId = decoded.userId;
        userEmail = decoded.email;
        console.log(`Authenticated tab data for user ${userEmail}`);
      } catch (err) {
        console.log('Invalid token in tab data request');
      }
    }
    
    if (!userId && data.userId) {
      userId = data.userId;
      userEmail = data.email;
    }
    
    if (!userId || !userEmail) {
      const activeUser = await User.findOne();
      if (activeUser) {
        userId = activeUser._id;
        userEmail = activeUser.email;
        console.log(`Using default user for tab data: ${userEmail}`);
      } else {
        return res.status(400).json({ error: 'No users available and no authentication provided' });
      }
    }
    
    let domain = 'unknown';
    try {
      if (data.url && data.url.startsWith('http')) {
        const urlObj = new URL(data.url);
        domain = urlObj.hostname.replace('www.', '');
      } else if (data.title) {
        const titleParts = data.title.split(' - ');
        if (titleParts.length > 1) {
          domain = titleParts[titleParts.length - 1].toLowerCase().trim();
        } else {
          domain = data.title.toLowerCase().trim();
        }
      }
    } catch (e) {
      console.log('Error extracting domain, using title instead');
      domain = data.title || 'unknown';
    }
    
    console.log(`Extracted domain: ${domain} from ${data.url || data.title}`);
    
    let tabUsage = await TabUsage.findOne({
      userId: userId,
      url: data.url
    });
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (tabUsage) {
      tabUsage.duration += parseFloat(data.duration) || 0;
      tabUsage.title = data.title || tabUsage.title;
      tabUsage.domain = domain;
      tabUsage.email = userEmail; // Ensure email is set
      tabUsage.lastUpdated = now;
      await tabUsage.save();
      console.log(`Updated tab record for ${domain}: total duration ${tabUsage.duration}s`);
    } else {
      const newTab = new TabUsage({
        userId: userId,
        email: userEmail,
        url: data.url,
        title: data.title,
        domain: domain,
        duration: parseFloat(data.duration) || 0,
        date: todayStr,
        timestamp: now,
        lastUpdated: now
      });
      await newTab.save();
      console.log(`Created new tab record for ${domain}: ${data.duration}s`);
    }
    
    res.status(200).json({ success: true, message: "Tab data recorded" });
  } catch (error) {
    console.error('Error processing tab data:', error);
    res.status(500).json({ error: 'Server error processing tab data' });
  }
});

app.get('/tabs', auth, async (req, res) => {
  try {
    console.log(`User requesting tabs data: ${req.user.email}`);
    
    const timeFrame = req.query.timeFrame || 'daily';
    
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const tabs = await TabUsage.find({
      email: req.user.email,
      $or: [
        { userId: req.user._id.toString() },
        { userId: req.user._id }
      ],
      lastUpdated: { $gte: startDate, $lte: endDate }
    });
    
    console.log(`Found ${tabs.length} tabs for user ${req.user.email}`);
    res.json(tabs);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    res.status(500).json({ error: 'Failed to fetch tabs' });
  }
});

const currentSessionData = [];
let lastWindow = null;
let startTime = Date.now();

async function getActiveWindowTitle() {
  try {
    const result = await activeWindow();
    return result ? {
      title: result.title,
      app: result.owner.name,
      url: result.url || null
    } : null;
  } catch (error) {
    console.error('Error getting active window:', error);
    return null;
  }
}

app.get('/usage', auth, async (req, res) => {
  try {
    const { timeFrame } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    
    let startDate = today;
    
    if (timeFrame === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().slice(0, 10);
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().slice(0, 10);
    }
    
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: { $gte: startDate }
    });
    
    console.log(`Found ${appUsage.length} app usage records for user ${req.user.email}`);
    
    const groupedByDate = appUsage.reduce((acc, item) => {
      if (!acc[item.date]) {
        acc[item.date] = {};
      }
      acc[item.date][item.appName] = item.duration;
      return acc;
    }, {});
    
    res.json(groupedByDate);
  } catch (error) {
    console.error('Error fetching app usage:', error);
    res.status(500).send("Error processing request");
  }
});

app.get('/current-session', auth, (req, res) => {
  res.json(currentSessionData);
});

app.get('/public/focus-data', async (req, res) => {
  try {
    console.log('AI server requesting public focus data');
    const today = new Date().toISOString().slice(0, 10);
    
    const recentUser = await User.findOne().sort({ createdAt: -1 });
    if (!recentUser) {
      return res.status(404).json({ error: 'No users found' });
    }
    
    console.log(`Fetching data for user: ${recentUser.email} (${recentUser._id})`);
    
    let tabs = [];
    try {
      tabs = await TabUsage.find({
        userId: recentUser._id,
        email: recentUser.email,
        timestamp: { 
          $gte: new Date(today) 
        }
      }).sort({ timestamp: -1 });
      
      console.log(`Found ${tabs.length} tabs for today for user ${recentUser.email}`);
    } catch (tabError) {
      console.error('Error fetching tabs:', tabError);
    }
    
    let appUsageFormatted = {};
    try {
      const appUsage = await AppUsage.find({
        userId: recentUser._id,
        email: recentUser.email,
        date: today
      });
      
      console.log(`Found ${appUsage.length} app usage records for today for user ${recentUser.email}`);
      
      appUsageFormatted = appUsage.reduce((acc, item) => {
        acc[item.appName] = item.duration;
        return acc;
      }, {});
    } catch (appError) {
      console.error('Error fetching app usage:', appError);
    }
    
    res.json({
      userId: recentUser._id.toString(),
      email: recentUser.email,
      tabs: tabs || [],
      appUsage: appUsageFormatted || {},
      currentSession: currentSessionData.filter(session => 
        session.userId === recentUser._id.toString() && 
        session.timestamp >= new Date(today).getTime()
      ) || []
    });
  } catch (error) {
    console.error('Error fetching public focus data:', error);
    res.status(500).json({ error: 'Failed to fetch focus data: ' + error.message });
  }
});

app.get('/focus-data', auth, async (req, res) => {
  try {
    console.log('User requesting focus data:', req.user.email);
    const today = new Date().toISOString().slice(0, 10);
    
    let tabs = [];
    try {
      tabs = await TabUsage.find({
        userId: req.user._id,
        email: req.user.email,
        timestamp: { 
          $gte: new Date(today) 
        }
      }).sort({ timestamp: -1 });
      
      console.log(`Found ${tabs.length} tabs for today for user ${req.user.email}`);
    } catch (tabError) {
      console.error('Error fetching tabs:', tabError);
    }
    
    let appUsageFormatted = {};
    try {
      const appUsage = await AppUsage.find({
        userId: req.user._id,
        email: req.user.email,
        date: today
      });
      
      console.log(`Found ${appUsage.length} app usage records for today for user ${req.user.email}`);
      
      appUsageFormatted = appUsage.reduce((acc, item) => {
        acc[item.appName] = item.duration;
        return acc;
      }, {});
    } catch (appError) {
      console.error('Error fetching app usage:', appError);
    }
    
    res.json({
      tabs: tabs || [],
      appUsage: appUsageFormatted || {},
      currentSession: currentSessionData.filter(session => 
        session.userId === req.user._id.toString() && 
        session.timestamp >= new Date(today).getTime()
      ) || []
    });
  } catch (error) {
    console.error('Error fetching focus data:', error);
    res.status(500).json({ error: 'Failed to fetch focus data: ' + error.message });
  }
});

app.get('/raw-usage', auth, async (req, res) => {
  try {
    console.log('User requesting raw usage data:', req.user.email);
    const { timeFrame } = req.query;
    
    // Calculate the correct date range based on timeFrame
    const today = new Date();
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    let startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    
    if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    console.log(`Fetching raw usage data from ${startDateStr} to ${endDateStr} (${timeFrame} view)`);
    
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    console.log(`Found ${appUsage.length} app usage records for user ${req.user.email}`);
    
    const appUsageFormatted = appUsage.reduce((acc, item) => {
      acc[item.appName] = (acc[item.appName] || 0) + item.duration;
      return acc;
    }, {});
    
    const tabs = await TabUsage.find({
      userId: req.user._id,
      email: req.user.email,
      date: { $gte: startDateStr, $lte: endDateStr }
    });
    
    console.log(`Found ${tabs.length} tab records for user ${req.user.email}`);
    
    const tabUsage = tabs.reduce((acc, tab) => {
      const domain = tab.domain || 'unknown';
      acc[domain] = (acc[domain] || 0) + tab.duration;
      return acc;
    }, {});
    
    res.json({
      appUsage: appUsageFormatted,
      tabUsage: tabUsage,
      userEmail: req.user.email,
      timeFrame: timeFrame || 'daily',
      dateRange: {
        start: startDateStr,
        end: endDateStr
      }
    });
  } catch (error) {
    console.error('Error fetching raw usage data:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

app.post('/reset-data', auth, async (req, res) => {
  try {
    console.log(`Resetting data for user ${req.user.email} (${req.user._id})`);
    
    const deletedAppUsage = await AppUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email
    });
    
    const deletedTabUsage = await TabUsage.deleteMany({ 
      userId: req.user._id,
      email: req.user.email 
    });
    
    const beforeLength = currentSessionData.length;
    const newSessionData = currentSessionData.filter(
      session => session.userId !== req.user._id.toString()
    );
    currentSessionData.length = 0;
    currentSessionData.push(...newSessionData);
    
    console.log(`Reset completed for user ${req.user.email}:
      - Deleted ${deletedAppUsage.deletedCount} app usage records
      - Deleted ${deletedTabUsage.deletedCount} tab usage records
      - Removed ${beforeLength - currentSessionData.length} session entries`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Data reset successful',
      deletedCounts: {
        appUsage: deletedAppUsage.deletedCount,
        tabUsage: deletedTabUsage.deletedCount,
        sessions: beforeLength - currentSessionData.length
      }
    });
  } catch (error) {
    console.error('Error resetting data:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

app.post('/api/heartbeat', auth, (req, res) => {
  activeUsers.set(req.user._id.toString(), {
    timestamp: Date.now(),
    email: req.user.email
  });
  res.status(200).json({ success: true });
});

app.get('/api/user-data', auth, async (req, res) => {
  try {
    const { date, timeFrame } = req.query;
    const currentDate = date || new Date().toISOString().slice(0, 10);
    
    console.log(`📊 Fetching user data for ${req.user.email} (${req.user._id}) on ${currentDate}`);
    
    let dateFilter = { date: currentDate };
    
    if (timeFrame === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { date: { $gte: weekAgo.toISOString().slice(0, 10) } };
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { date: { $gte: monthAgo.toISOString().slice(0, 10) } };
    }
    
    const appUsage = await AppUsage.find({
      userId: req.user._id,
      email: req.user.email,
      ...dateFilter
    });
    
    const tabUsage = await TabUsage.find({
      userId: req.user._id,
      email: req.user.email,
      ...dateFilter
    });
    
    console.log(`✅ Found ${appUsage.length} app records and ${tabUsage.length} tab records for user ${req.user.email}`);
    
    res.json({
      userId: req.user._id.toString(),
      email: req.user.email,
      appUsage: appUsage || [],
      tabUsage: tabUsage || [],
      date: currentDate,
      timeFrame: timeFrame || 'daily'
    });
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data', details: error.message });
  }
});


app.get('/api/leaderboard', auth, async (req, res) => {
  try {
    const { timeFrame = 'weekly', limit = 10 } = req.query;
    
    // Calculate date range based on timeFrame
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    console.log(`📊 Fetching leaderboard for ${timeFrame} (${startDateStr} to ${endDateStr})`);
    
    // Aggregate productivity data by user
    const leaderboardData = await ProductivitySummary.aggregate([
      {
        $match: {
          date: { $gte: startDateStr, $lte: endDateStr }
        }
      },
      {
        $group: {
          _id: '$userId',
          email: { $first: '$email' },
          totalProductiveTime: { $sum: '$totalProductiveTime' },
          totalNonProductiveTime: { $sum: '$totalNonProductiveTime' },
          overallTotalUsage: { $sum: '$overallTotalUsage' },
          avgFocusScore: { $avg: '$focusScore' },
          daysActive: { $sum: 1 }
        }
      },
      {
        $addFields: {
          totalUsageHours: { $divide: ['$overallTotalUsage', 3600] },
          productiveHours: { $divide: ['$totalProductiveTime', 3600] },
          distractionHours: { $divide: ['$totalNonProductiveTime', 3600] }
        }
      },
      {
        $sort: { avgFocusScore: -1, totalProductiveTime: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);
    
    const userIds = leaderboardData.map(item => item._id);
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email');
    const userProfiles = await UserProfile.find({ userId: { $in: userIds } }).select('userId displayName profilePhoto');
    
    const userMap = new Map(users.map(user => [user._id.toString(), user.name || user.email.split('@')[0]]));
    const profileMap = new Map();
    
    userProfiles.forEach(profile => {
      profileMap.set(profile.userId.toString(), {
        displayName: profile.displayName,
        profilePhoto: profile.profilePhoto
      });
    });
    
    const formattedLeaderboard = leaderboardData.map((item, index) => {
      const profile = profileMap.get(item._id.toString());
      return {
        rank: index + 1,
        userId: item._id,
        name: profile?.displayName || userMap.get(item._id.toString()) || item.email.split('@')[0],
        email: item.email,
        profilePhoto: profile?.profilePhoto || null,
        focusScore: Math.round(item.avgFocusScore || 0),
        totalUsageHours: Math.round(item.totalUsageHours * 10) / 10,
        productiveHours: Math.round(item.productiveHours * 10) / 10,
        distractionHours: Math.round(item.distractionHours * 10) / 10,
        daysActive: item.daysActive,
        experiencePoints: Math.round((item.avgFocusScore || 0) * 10 + item.daysActive * 50)
      };
    });
    
    console.log(`✅ Leaderboard generated with ${formattedLeaderboard.length} users`);
    res.json({
      timeFrame,
      dateRange: { start: startDateStr, end: endDateStr },
      leaderboard: formattedLeaderboard
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard', details: error.message });
  }
});

app.get('/api/user-stats', auth, async (req, res) => {
  try {
    const { timeFrame = 'monthly' } = req.query;
    const userId = req.user._id;
    const userEmail = req.user.email;
    
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    console.log(`📊 Fetching user stats for ${userEmail} (${startDateStr} to ${endDateStr})`);
    
    const userSummaries = await ProductivitySummary.find({
      userId,
      email: userEmail,
      date: { $gte: startDateStr, $lte: endDateStr }
    }).sort({ date: -1 });
    
    const stats = {
      totalDays: userSummaries.length,
      totalProductiveTime: userSummaries.reduce((sum, s) => sum + (s.totalProductiveTime || 0), 0),
      totalNonProductiveTime: userSummaries.reduce((sum, s) => sum + (s.totalNonProductiveTime || 0), 0),
      totalUsage: userSummaries.reduce((sum, s) => sum + (s.overallTotalUsage || 0), 0),
      avgFocusScore: userSummaries.length > 0 ? 
        userSummaries.reduce((sum, s) => sum + (s.focusScore || 0), 0) / userSummaries.length : 0,
      bestFocusScore: Math.max(...userSummaries.map(s => s.focusScore || 0), 0),
      streak: calculateCurrentStreak(userSummaries)
    };
    
    // Get top apps
    const allApps = new Map();
    const allNonProductiveApps = new Map();
    
    userSummaries.forEach(summary => {
      if (summary.productiveContent) {
        for (let [app, time] of summary.productiveContent) {
          allApps.set(app, (allApps.get(app) || 0) + time);
        }
      }
      if (summary.nonProductiveContent) {
        for (let [app, time] of summary.nonProductiveContent) {
          allNonProductiveApps.set(app, (allNonProductiveApps.get(app) || 0) + time);
        }
      }
    });
    
    const topProductiveApps = Array.from(allApps.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([app, time]) => ({ app: app.replace(/_/g, '.'), time: Math.round(time / 60) }));
      
    const topDistractionApps = Array.from(allNonProductiveApps.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([app, time]) => ({ app: app.replace(/_/g, '.'), time: Math.round(time / 60) }));
    
    // Calculate achievements and level
    const experiencePoints = Math.round(stats.avgFocusScore * 10 + stats.totalDays * 50 + stats.streak * 25);
    const level = Math.floor(experiencePoints / 500) + 1;
    const xpToNextLevel = (level * 500) - experiencePoints;
    
    const achievements = calculateAchievements(stats, userSummaries);
    
    // Get user rank in leaderboard
    const userRank = await getUserRankInLeaderboard(userId, timeFrame);
    
    const formattedStats = {
      level,
      experiencePoints,
      xpToNextLevel,
      focusScore: Math.round(stats.avgFocusScore),
      bestFocusScore: Math.round(stats.bestFocusScore),
      totalUsageHours: Math.round(stats.totalUsage / 3600 * 10) / 10,
      productiveHours: Math.round(stats.totalProductiveTime / 3600 * 10) / 10,
      distractionHours: Math.round(stats.totalNonProductiveTime / 3600 * 10) / 10,
      currentStreak: stats.streak,
      daysActive: stats.totalDays,
      topProductiveApps,
      topDistractionApps,
      achievements,
      leaderboardRank: userRank,
      timeFrame,
      dateRange: { start: startDateStr, end: endDateStr }
    };
    
    console.log(`✅ User stats calculated for ${userEmail}:`, {
      level: formattedStats.level,
      xp: formattedStats.experiencePoints,
      focusScore: formattedStats.focusScore,
      rank: formattedStats.leaderboardRank
    });
    
    res.json(formattedStats);
    
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats', details: error.message });
  }
});

// Helper function to calculate current streak
function calculateCurrentStreak(summaries) {
  if (summaries.length === 0) return 0;
  
  // Sort by date descending
  const sortedSummaries = summaries.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let checkDate = today;
  
  for (const summary of sortedSummaries) {
    if (summary.date === checkDate && summary.focusScore >= 30) { // Minimum score for streak
      streak++;
      // Move to previous day
      const prevDate = new Date(checkDate);
      prevDate.setDate(prevDate.getDate() - 1);
      checkDate = prevDate.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  
  return streak;
}

// Helper function to calculate achievements
function calculateAchievements(stats, summaries) {
  const achievements = [];
  
  // Focus Master Achievement
  if (stats.avgFocusScore >= 85) {
    achievements.push({
      id: 'focus_master',
      name: 'Focus Master',
      description: 'Maintained 85%+ focus score',
      xp: 500,
      icon: 'target',
      unlockedAt: new Date().toISOString()
    });
  }
  
  // Consistency Champion
  if (stats.streak >= 7) {
    achievements.push({
      id: 'consistency_champion',
      name: 'Consistency Champion',
      description: `${stats.streak} day streak!`,
      xp: stats.streak * 25,
      icon: 'calendar',
      unlockedAt: new Date().toISOString()
    });
  }
  
  // Productivity Wizard
  if (stats.totalProductiveTime >= 144000) { // 40+ hours
    achievements.push({
      id: 'productivity_wizard',
      name: 'Productivity Wizard',
      description: 'Accumulated 40+ productive hours',
      xp: 750,
      icon: 'trending-up',
      unlockedAt: new Date().toISOString()
    });
  }
  
  // Early Bird (placeholder - would need time tracking)
  if (summaries.length >= 5) {
    achievements.push({
      id: 'dedicated_user',
      name: 'Dedicated User',
      description: 'Used FocusAI for 5+ days',
      xp: 200,
      icon: 'star',
      unlockedAt: new Date().toISOString()
    });
  }
  
  return achievements;
}

// Helper function to get user rank in leaderboard
async function getUserRankInLeaderboard(userId, timeFrame = 'weekly') {
  try {
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeFrame === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeFrame === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeFrame === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const startDateStr = startDate.toISOString().slice(0, 10);
    const endDateStr = endDate.toISOString().slice(0, 10);
    
    const leaderboardData = await ProductivitySummary.aggregate([
      {
        $match: {
          date: { $gte: startDateStr, $lte: endDateStr }
        }
      },
      {
        $group: {
          _id: '$userId',
          avgFocusScore: { $avg: '$focusScore' },
          totalProductiveTime: { $sum: '$totalProductiveTime' }
        }
      },
      {
        $sort: { avgFocusScore: -1, totalProductiveTime: -1 }
      }
    ]);
    
    const userIndex = leaderboardData.findIndex(item => item._id.toString() === userId.toString());
    return userIndex >= 0 ? userIndex + 1 : null;
    
  } catch (error) {
    console.error('Error calculating user rank:', error);
    return null;
  }
}

// ========== PRODUCTIVITY SUMMARY ENDPOINTS ==========

// Helper function to classify apps as productive or non-productive
const classifyApp = (appName) => {
  const productiveApps = [
    'code', 'vscode', 'terminal', 'gnome-terminal', 'mysql', 'postman', 
    'slack', 'eclipse', 'intellij', 'pycharm', 'vim', 'emacs', 'git',
    'docker', 'mongodb compass', 'figma', 'notion', 'jira', 'confluence'
  ];
  
  const nonProductiveApps = [
    'netflix', 'spotify', 'youtube', 'twitter', 'instagram', 'facebook', 
    'tiktok', 'reddit', 'gaming', 'steam', 'discord', 'whatsapp', 
    'telegram', 'snapchat', 'twitch'
  ];
  
  const appLower = appName.toLowerCase();
  
  if (productiveApps.some(app => appLower.includes(app))) {
    return 'productive';
  } else if (nonProductiveApps.some(app => appLower.includes(app))) {
    return 'non-productive';
  } else if (appLower.includes('browser') || appLower.includes('chrome') || appLower.includes('firefox')) {
    // Browser apps need more context, default to neutral/productive for work browsing
    return 'productive';
  }
  
  return 'neutral'; // Default to neutral for unknown apps
};

// Create or update productivity summary
app.post('/api/productivity-summary', auth, async (req, res) => {
  try {
    const { date, appUsageData, tabUsageData } = req.body;
    const currentDate = date || new Date().toISOString().slice(0, 10);
    
    console.log(`📊 Updating productivity summary for ${req.user.email} on ${currentDate}`);
    
    // Find existing summary or create new one
    let summary = await ProductivitySummary.findOne({
      userId: req.user._id,
      email: req.user.email,
      date: currentDate
    });
    
    if (!summary) {
      summary = new ProductivitySummary({
        userId: req.user._id,
        email: req.user.email,
        date: currentDate
      });
    }
    
    // Process app usage data
    if (appUsageData && Array.isArray(appUsageData)) {
      for (const app of appUsageData) {
        const appName = app.appName || app.name || 'Unknown';
        const duration = parseInt(app.duration) || 0;
        const classification = classifyApp(appName);
        
        if (duration > 0) {
          summary.updateProductivityData(appName, duration, classification === 'productive');
        }
      }
    }
    
    // Process tab usage data
    if (tabUsageData && Array.isArray(tabUsageData)) {
      for (const tab of tabUsageData) {
        const domain = tab.domain || tab.title || 'Browser';
        const duration = parseInt(tab.duration) || 0;
        
        if (duration > 0) {
          // Classify based on domain
          const classification = classifyApp(domain);
          summary.updateProductivityData(`Browser - ${domain}`, duration, classification === 'productive');
          
          // Update most visited tab
          if (!summary.mostVisitedTab || duration > (summary.nonProductiveContent.get(summary.mostVisitedTab) || 0)) {
            summary.mostVisitedTab = domain;
          }
        }
      }
    }
    
    await summary.save();
    
    res.json({
      success: true,
      summary: {
        userId: summary.userId,
        email: summary.email,
        date: summary.date,
        productiveContent: Object.fromEntries(summary.productiveContent),
        nonProductiveContent: Object.fromEntries(summary.nonProductiveContent),
        maxProductiveApp: summary.maxProductiveApp,
        totalProductiveTime: summary.totalProductiveTime,
        totalNonProductiveTime: summary.totalNonProductiveTime,
        overallTotalUsage: summary.overallTotalUsage,
        focusScore: summary.focusScore,
        mostVisitedTab: summary.mostVisitedTab,
        mostUsedApp: summary.mostUsedApp,
        distractionApps: Object.fromEntries(summary.distractionApps)
      }
    });
    
  } catch (error) {
    console.error('Error updating productivity summary:', error);
    res.status(500).json({ error: 'Failed to update productivity summary', details: error.message });
  }
});

// Get productivity summary for a user
app.get('/api/productivity-summary', auth, async (req, res) => {
  try {
    const { date, timeFrame } = req.query;
    const currentDate = date || new Date().toISOString().slice(0, 10);
    
    let dateFilter = { date: currentDate };
    
    if (timeFrame === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = { date: { $gte: weekAgo.toISOString().slice(0, 10) } };
    } else if (timeFrame === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = { date: { $gte: monthAgo.toISOString().slice(0, 10) } };
    }
    
    const summaries = await ProductivitySummary.find({
      userId: req.user._id,
      email: req.user.email,
      ...dateFilter
    }).sort({ date: -1 });
    
    if (summaries.length === 0) {
      // Create a default summary with current app/tab data
      const appUsage = await AppUsage.find({
        userId: req.user._id,
        email: req.user.email,
        date: currentDate
      });
      
      const tabUsage = await TabUsage.find({
        userId: req.user._id,
        email: req.user.email,
        date: currentDate
      });
      
      // Auto-generate summary from existing data
      if (appUsage.length > 0 || tabUsage.length > 0) {
        const summary = new ProductivitySummary({
          userId: req.user._id,
          email: req.user.email,
          date: currentDate
        });
        
        // Process existing app usage
        for (const app of appUsage) {
          const classification = classifyApp(app.appName);
          summary.updateProductivityData(app.appName, app.duration, classification === 'productive');
        }
        
        // Process existing tab usage
        for (const tab of tabUsage) {
          const domain = tab.domain || tab.title || 'Browser';
          const classification = classifyApp(domain);
          summary.updateProductivityData(`Browser - ${domain}`, tab.duration, classification === 'productive');
        }
        
        await summary.save();
        summaries.push(summary);
      }
    }
    
    const formattedSummaries = summaries.map(summary => ({
      userId: summary.userId,
      email: summary.email,
      date: summary.date,
      productiveContent: Object.fromEntries(summary.productiveContent),
      nonProductiveContent: Object.fromEntries(summary.nonProductiveContent),
      maxProductiveApp: summary.maxProductiveApp,
      totalProductiveTime: summary.totalProductiveTime,
      totalNonProductiveTime: summary.totalNonProductiveTime,
      overallTotalUsage: summary.overallTotalUsage,
      focusScore: summary.focusScore,
      mostVisitedTab: summary.mostVisitedTab,
      mostUsedApp: summary.mostUsedApp,
      distractionApps: Object.fromEntries(summary.distractionApps),
      lastUpdated: summary.lastUpdated
    }));
    
    res.json({
      success: true,
      summaries: formattedSummaries,
      timeFrame: timeFrame || 'daily'
    });
    
  } catch (error) {
    console.error('Error fetching productivity summary:', error);
    res.status(500).json({ error: 'Failed to fetch productivity summary', details: error.message });
  }
});

// Update the window tracking interval to track both app usage and browser tabs
setInterval(async () => {
  try {
    const windowInfo = await getActiveWindowTitle();
    
    if (windowInfo && JSON.stringify(windowInfo) !== JSON.stringify(lastWindow)) {
      if (lastWindow) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        const today = new Date().toISOString().slice(0, 10);
        
        const appName = lastWindow.app;
        
        // Find the most recently active user
        let activeUserId = null;
        let activeUserEmail = null;
        let mostRecentTime = 0;
        
        for (const [userId, data] of activeUsers.entries()) {
          if (data.timestamp > mostRecentTime && Date.now() - data.timestamp < 5 * 60 * 1000) { // Active in last 5 minutes
            mostRecentTime = data.timestamp;
            activeUserId = userId;
            activeUserEmail = data.email;
          }
        }
        
        if (activeUserId && activeUserEmail) {
          // Update app usage in database
          try {
            // Find existing app usage record or create new one
            let appUsage = await AppUsage.findOne({
              userId: activeUserId,
              email: activeUserEmail,
              date: today,
              appName
            });
            
            if (appUsage) {
              // Update existing record
              appUsage.duration += duration;
              appUsage.lastUpdated = new Date();
              await appUsage.save();
            } else {
              // Create new record
              appUsage = new AppUsage({
                userId: activeUserId,
                email: activeUserEmail,
                date: today,
                appName,
                duration,
                lastUpdated: new Date()
              });
              await appUsage.save();
            }
            
            // Auto-update productivity summary after app usage is recorded
            await updateProductivitySummaryForUser(activeUserId, activeUserEmail, today);
            
            // DETECT AND TRACK BROWSER TABS
            // Check if this is a browser app
            const browsers = ['Google-chrome', 'firefox_firefox', 'Firefox', 'Safari', 'Edge', 'Opera'];
            if (browsers.includes(appName) && lastWindow.title) {
              // Extract the tab name from the title (usually format is "Website - Browser")
              let tabName = lastWindow.title;
              
              // Remove browser name from the end if present
              browsers.forEach(browser => {
                if (tabName.endsWith(` - ${browser}`)) {
                  tabName = tabName.replace(` - ${browser}`, '');
                }
                if (tabName.endsWith(` – ${browser}`)) {
                  tabName = tabName.replace(` – ${browser}`, '');
                }
              });
              
              // Check for common browser title patterns and extract the website name
              const titleParts = tabName.split(' - ');
              if (titleParts.length > 1) {
                // Usually the website name is the first or last part
                tabName = titleParts[0].trim();
              }
              
              // Find existing tab record or create a new one
              let tabUsage = await TabUsage.findOne({
                userId: activeUserId,
                email: activeUserEmail,
                date: today,
                title: tabName
              });
              
              if (tabUsage) {
                // Update existing tab record
                tabUsage.duration += duration;
                tabUsage.lastUpdated = new Date();
                await tabUsage.save();
                console.log(`Updated tab record: ${tabName} for ${activeUserEmail}, total: ${tabUsage.duration}s`);
              } else {
                // Create new tab record with simplified data
                tabUsage = new TabUsage({
                  userId: activeUserId,
                  email: activeUserEmail,
                  date: today,
                  title: tabName,
                  domain: tabName.toLowerCase(), // Just use the tab name as the domain for simplicity
                  duration: duration,
                  lastUpdated: new Date()
                });
                await tabUsage.save();
                console.log(`Created new tab record: ${tabName} for ${activeUserEmail}, duration: ${duration}s`);
              }
            }
          } catch (dbError) {
            console.error('Database error when tracking usage:', dbError);
          }
          
          // Add to current session data (in memory)
          currentSessionData.push({
            userId: activeUserId.toString(),
            email: activeUserEmail,
            app: appName,
            title: lastWindow.title,
            url: lastWindow.url,
            duration: duration,
            timestamp: Date.now()
          });
          
          if (currentSessionData.length > 100) {
            currentSessionData.shift();
          }
          
          console.log(`Tracked: ${appName} (${lastWindow.title}) for ${duration} seconds for user ${activeUserEmail}`);
        } else {
          console.log(`Skipping tracking: No active user found in the last 5 minutes`);
        }
      }
      
      lastWindow = windowInfo;
      startTime = Date.now();
    }
  } catch (error) {
    console.error('Error in window tracking:', error);
  }
}, 1000);

// Helper function to update productivity summary
async function updateProductivitySummaryForUser(userId, email, date) {
  try {
    // Get all app usage for the user on this date
    const appUsage = await AppUsage.find({ userId, email, date });
    const tabUsage = await TabUsage.find({ userId, email, date });

    if (appUsage.length === 0 && tabUsage.length === 0) return;

    // Find or create productivity summary
    let summary = await ProductivitySummary.findOne({ userId, email, date });
    
    if (!summary) {
      summary = new ProductivitySummary({ userId, email, date });
    }

    // Reset the summary to recalculate from scratch
    summary.productiveContent.clear();
    summary.nonProductiveContent.clear();
    summary.distractionApps.clear();
    summary.totalProductiveTime = 0;
    summary.totalNonProductiveTime = 0;
    summary.overallTotalUsage = 0;

    // Process app usage
    for (const app of appUsage) {
      const classification = classifyApp(app.appName);
      summary.updateProductivityData(app.appName, app.duration, classification === 'productive');
    }

    // Process tab usage
    for (const tab of tabUsage) {
      const domain = tab.domain || tab.title || 'Browser';
      const classification = classifyApp(domain);
      summary.updateProductivityData(`Browser - ${domain}`, tab.duration, classification === 'productive');
      
      // Update most visited tab
      if (!summary.mostVisitedTab || tab.duration > (summary.nonProductiveContent.get(summary.mostVisitedTab) || 0)) {
        summary.mostVisitedTab = domain;
      }
    }

    await summary.save();
    console.log(`✅ Updated productivity summary for ${email} on ${date}`);
    
  } catch (error) {
    console.error('Error updating productivity summary:', error);
  }
}

try {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)); // Changed from 5001 to PORT
} catch (error) {
  console.error('Failed to start server:', error);
}
