const mongoose = require('mongoose');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const ProductivitySummary = require('../models/ProductivitySummary');
const User = require('../models/User');

const debugChatData = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/focuai');
    console.log('✅ Connected to MongoDB\n');
    
    
    console.log('=== CHECKING USERS ===');
    const users = await User.find().limit(5);
    console.log(`👥 Total users: ${users.length}`);
    
    if (users.length > 0) {
      const sampleUser = users[0];
      console.log(`📋 Sample user:`, {
        _id: sampleUser._id,
        email: sampleUser.email,
        username: sampleUser.username
      });
      
      const testUserId = sampleUser._id;
      const testEmail = sampleUser.email;
      
      console.log(`\n🔍 Testing with User ID: ${testUserId}, Email: ${testEmail}`);
      
      
      console.log('\n=== CHECKING PRODUCTIVITY SUMMARY ===');
      const summaryByEmail = await ProductivitySummary.find({ email: testEmail }).limit(3);
      const summaryByUserId = await ProductivitySummary.find({ userId: testUserId }).limit(3);
      
      console.log(`📊 ProductivitySummary by email (${testEmail}): ${summaryByEmail.length} records`);
      console.log(`📊 ProductivitySummary by userId (${testUserId}): ${summaryByUserId.length} records`);
      
      if (summaryByEmail.length > 0) {
        const sample = summaryByEmail[0];
        console.log(`✅ Sample ProductivitySummary:`, {
          _id: sample._id,
          userId: sample.userId,
          email: sample.email,
          date: sample.date,
          focusScore: sample.focusScore,
          totalProductiveTime: sample.totalProductiveTime,
          hasProductiveContent: Object.keys(sample.productiveContent || {}).length > 0
        });
      }
      
      
      console.log('\n=== CHECKING APP USAGE ===');
      const appByEmail = await AppUsage.find({ email: testEmail }).limit(3);
      const appByUserId = await AppUsage.find({ 
        $or: [
          { userId: testUserId.toString() },
          { userId: testUserId }
        ]
      }).limit(3);
      
      console.log(`📱 AppUsage by email (${testEmail}): ${appByEmail.length} records`);
      console.log(`📱 AppUsage by userId variations: ${appByUserId.length} records`);
      
      if (appByEmail.length > 0) {
        const sample = appByEmail[0];
        console.log(`✅ Sample AppUsage:`, {
          _id: sample._id,
          userId: sample.userId,
          email: sample.email,
          appName: sample.appName,
          duration: sample.duration,
          timestamp: sample.timestamp
        });
      }
      
      
      console.log('\n=== CHECKING TAB USAGE ===');
      const tabByEmail = await TabUsage.find({ email: testEmail }).limit(3);
      const tabByUserId = await TabUsage.find({ 
        $or: [
          { userId: testUserId.toString() },
          { userId: testUserId }
        ]
      }).limit(3);
      
      console.log(`🌐 TabUsage by email (${testEmail}): ${tabByEmail.length} records`);
      console.log(`🌐 TabUsage by userId variations: ${tabByUserId.length} records`);
      
      if (tabByEmail.length > 0) {
        const sample = tabByEmail[0];
        console.log(`✅ Sample TabUsage:`, {
          _id: sample._id,
          userId: sample.userId,
          email: sample.email,
          domain: sample.domain,
          title: sample.title,
          duration: sample.duration,
          timestamp: sample.timestamp
        });
      }
      
      
      console.log('\n=== TESTING EXACT CHAT CONTROLLER QUERY ===');
      const today = new Date().toISOString().slice(0, 10);
      console.log(`📅 Testing date: ${today}`);
      
      
      const exactQuery = await ProductivitySummary.findOne({
        userId: testUserId,
        email: testEmail,
        date: today
      });
      
      console.log(`🎯 Exact chatController query result: ${!!exactQuery}`);
      
      if (!exactQuery) {
        
        const latestQuery = await ProductivitySummary.findOne({
          userId: testUserId,
          email: testEmail
        }).sort({ date: -1 });
        
        console.log(`📊 Latest summary query result: ${!!latestQuery}`);
        if (latestQuery) {
          console.log(`   Date: ${latestQuery.date}`);
          console.log(`   Focus Score: ${latestQuery.focusScore}`);
        }
      }
      
      
      console.log('\n=== TESTING FALLBACK APP USAGE QUERY ===');
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
      
      const fallbackAppUsage = await AppUsage.find({
        email: testEmail,
        $or: [
          { userId: testUserId.toString() },
          { userId: testUserId }
        ],
        timestamp: { $gte: startDate, $lte: endDate }
      });
      
      console.log(`📱 Fallback AppUsage found: ${fallbackAppUsage.length} records`);
      
      const fallbackTabUsage = await TabUsage.find({
        email: testEmail,
        $or: [
          { userId: testUserId.toString() },
          { userId: testUserId }
        ],
        timestamp: { $gte: startDate, $lte: endDate }
      });
      
      console.log(`🌐 Fallback TabUsage found: ${fallbackTabUsage.length} records`);
      
    } else {
      console.log('❌ No users found in database!');
    }
    
    
    console.log('\n=== COLLECTION COUNTS ===');
    console.log(`👥 Users: ${await User.countDocuments()}`);
    console.log(`📊 ProductivitySummary: ${await ProductivitySummary.countDocuments()}`);
    console.log(`📱 AppUsage: ${await AppUsage.countDocuments()}`);
    console.log(`🌐 TabUsage: ${await TabUsage.countDocuments()}`);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔚 Debug complete!');
  }
};

debugChatData();