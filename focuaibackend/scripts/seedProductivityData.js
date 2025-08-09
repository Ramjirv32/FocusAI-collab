const mongoose = require('mongoose');
const ProductivitySummary = require('../models/ProductivitySummary');
const User = require('../models/User');

// Configuration
const DAYS_TO_SEED = 14;
const USERS_TO_SEED = 5;

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/focusai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', async () => {
  console.log('Connected to MongoDB');
  await seedData();
  console.log('Seed completed successfully');
  process.exit(0);
});

async function seedData() {
  try {
    // Clear existing productivity summaries
    await ProductivitySummary.deleteMany({});
    console.log('Cleared existing productivity data');

    // Get users from the database
    const users = await User.find({}).limit(USERS_TO_SEED);
    
    if (users.length === 0) {
      console.log('No users found. Please register users first.');
      return;
    }
    
    console.log(`Found ${users.length} users to seed data for`);

    // Create productivity summaries for each user
    for (const user of users) {
      console.log(`Creating productivity data for user: ${user.email}`);
      
      // Create summaries for the last DAYS_TO_SEED days
      for (let i = 0; i < DAYS_TO_SEED; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateString = date.toISOString().slice(0, 10);
        
        // Generate random productivity data
        const productiveApps = getRandomProductiveApps();
        const nonProductiveApps = getRandomNonProductiveApps();
        
        // Calculate totals
        let totalProductiveTime = 0;
        let totalNonProductiveTime = 0;
        
        const productiveContent = new Map();
        for (const [app, time] of Object.entries(productiveApps)) {
          const sanitizedApp = app.replace(/\./g, '_');
          productiveContent.set(sanitizedApp, time);
          totalProductiveTime += time;
        }
        
        const nonProductiveContent = new Map();
        for (const [app, time] of Object.entries(nonProductiveApps)) {
          const sanitizedApp = app.replace(/\./g, '_');
          nonProductiveContent.set(sanitizedApp, time);
          totalNonProductiveTime += time;
        }
        
        const overallTotalUsage = totalProductiveTime + totalNonProductiveTime;
        const focusScore = Math.round((totalProductiveTime / overallTotalUsage) * 100);
        
        // Determine most used productive app
        let maxProductiveApp = "";
        let maxTime = 0;
        for (const [app, time] of Object.entries(productiveApps)) {
          if (time > maxTime) {
            maxTime = time;
            maxProductiveApp = app;
          }
        }
        
        // Determine most used app overall
        let mostUsedApp = "";
        let mostUsedTime = 0;
        const allApps = { ...productiveApps, ...nonProductiveApps };
        for (const [app, time] of Object.entries(allApps)) {
          if (time > mostUsedTime) {
            mostUsedTime = time;
            mostUsedApp = app;
          }
        }
        
        // Create summary document
        const summary = new ProductivitySummary({
          userId: user._id,
          email: user.email,
          date: dateString,
          productiveContent,
          nonProductiveContent,
          maxProductiveApp: maxProductiveApp.replace(/\./g, '_'),
          totalProductiveTime,
          totalNonProductiveTime,
          overallTotalUsage,
          focusScore,
          mostUsedApp: mostUsedApp.replace(/\./g, '_'),
          mostVisitedTab: getRandomTopWebsite(),
          distractionApps: new Map(),  // Empty for simplicity
        });
        
        await summary.save();
        console.log(`Created summary for ${user.email} on ${dateString} with focus score ${focusScore}`);
      }
    }
    
    console.log(`Successfully created ${DAYS_TO_SEED * users.length} productivity summaries`);
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Helper functions to generate random data
function getRandomProductiveApps() {
  const productiveApps = {
    'vscode': getRandom(1800, 3600),
    'chrome': getRandom(1200, 2400),
    'slack': getRandom(600, 1800),
    'terminal': getRandom(900, 1500),
    'notion': getRandom(600, 1200),
    'github_desktop': getRandom(300, 900),
  };
  
  // Only include some of the apps randomly
  return Object.fromEntries(
    Object.entries(productiveApps)
      .filter(() => Math.random() > 0.3)
  );
}

function getRandomNonProductiveApps() {
  const nonProductiveApps = {
    'discord': getRandom(300, 1200),
    'spotify': getRandom(600, 1800),
    'twitter': getRandom(600, 1200),
    'youtube': getRandom(900, 1800),
    'messages': getRandom(300, 600),
    'photos': getRandom(180, 600),
  };
  
  // Only include some of the apps randomly
  return Object.fromEntries(
    Object.entries(nonProductiveApps)
      .filter(() => Math.random() > 0.4)
  );
}

function getRandomTopWebsite() {
  const websites = [
    'github.com',
    'stackoverflow.com',
    'youtube.com',
    'twitter.com',
    'reddit.com',
    'medium.com',
    'dev.to',
    'docs.google.com',
  ];
  
  return websites[Math.floor(Math.random() * websites.length)];
}

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
