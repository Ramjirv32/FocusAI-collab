// Run this with: node test-browser-tabs.js
const mongoose = require('mongoose');
const User = require('./models/User');
const BrowserTabUsage = require('./models/BrowserTabUsage');
require('dotenv').config();

// Test function to check browser tab data
async function testBrowserTabData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0');
    console.log('MongoDB connected');
    
    // Find a test user (adjust as needed)
    const testUser = await User.findOne();
    if (!testUser) {
      console.error('No test user found in database');
      return;
    }
    
    console.log(`Using test user: ${testUser.email} (${testUser._id})`);
    
    // Count existing browser tabs for this user
    const existingCount = await BrowserTabUsage.countDocuments({
      userId: testUser._id,
      email: testUser.email
    });
    console.log(`Existing browser tab records for user: ${existingCount}`);
    
    // Insert a test browser tab
    const today = new Date().toISOString().slice(0, 10);
    const testTab = new BrowserTabUsage({
      userId: testUser._id,
      email: testUser.email,
      browser: 'Test Browser',
      url: 'https://example.com/test',
      title: 'Test Page - Example Domain',
      duration: 120,
      date: today,
      timestamp: new Date(),
      lastActive: new Date()
    });
    
    await testTab.save();
    console.log(`Test browser tab saved with ID: ${testTab._id}`);
    console.log(`Domain extracted: ${testTab.domain}`);
    
    
    const newCount = await BrowserTabUsage.countDocuments({
      userId: testUser._id,
      email: testUser.email
    });
    console.log(`New browser tab count: ${newCount}`);
    
    // Check /browser-tabs endpoint would return this data
    const tabs = await BrowserTabUsage.find({
      userId: testUser._id,
      email: testUser.email,
      date: today
    });
    
    console.log(`Found ${tabs.length} browser tabs for today`);
    console.log('Sample tab data:');
    console.log(tabs[0]);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

testBrowserTabData();