const mongoose = require('mongoose');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
require('dotenv').config();

// Sample applications
const applications = [
  'Visual Studio Code',
  'Google Chrome',
  'Microsoft Teams',
  'Slack',
  'Terminal',
  'Spotify',
  'Discord',
  'Microsoft Word',
  'Microsoft Excel',
  'Zoom',
  'Notion',
  'Figma'
];

// Sample productive and distracting apps
const productiveApps = ['Visual Studio Code', 'Terminal', 'Microsoft Word', 'Microsoft Excel', 'Notion'];
const distractingApps = ['Spotify', 'Discord'];

// Sample websites
const websites = [
  { domain: 'github.com', url: 'https://github.com' },
  { domain: 'stackoverflow.com', url: 'https://stackoverflow.com' },
  { domain: 'google.com', url: 'https://google.com' },
  { domain: 'youtube.com', url: 'https://youtube.com' },
  { domain: 'twitter.com', url: 'https://twitter.com' },
  { domain: 'reddit.com', url: 'https://reddit.com' },
  { domain: 'docs.microsoft.com', url: 'https://docs.microsoft.com' },
  { domain: 'medium.com', url: 'https://medium.com' }
];

// Function to generate random duration between min and max minutes (in seconds)
const randomDuration = (min, max) => Math.floor(Math.random() * (max - min + 1) + min) * 60;

// Function to generate a random date within the last n days
const randomDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  return date;
};

// Function to seed application usage data
const seedAppUsageData = async (userId, email, daysToSeed = 30) => {
  try {
    // Clear existing data for this user
    await AppUsage.deleteMany({ userId });
    
    const appUsageData = [];
    
    // Generate data for each day
    for (let day = 0; day < daysToSeed; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate 5-10 app usages per day
      const appsPerDay = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < appsPerDay; i++) {
        const appName = applications[Math.floor(Math.random() * applications.length)];
        
        // Determine if this is a productive or distracting app
        let category = 'neutral';
        if (productiveApps.includes(appName)) {
          category = 'productive';
        } else if (distractingApps.includes(appName)) {
          category = 'distracting';
        }
        
        // Generate 1-3 sessions per app per day
        const sessionsPerApp = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < sessionsPerApp; j++) {
          // Generate random duration (5-120 minutes in seconds)
          const duration = randomDuration(5, 120);
          
          // Create timestamp within the day
          const timestamp = new Date(date);
          timestamp.setHours(9 + Math.floor(Math.random() * 8)); // Between 9 AM and 5 PM
          timestamp.setMinutes(Math.floor(Math.random() * 60));
          
          appUsageData.push({
            userId,
            email,
            appName,
            date: dateStr,
            timestamp,
            duration,
            category,
            lastUpdated: new Date()
          });
        }
      }
    }
    
    // Insert all the app usage data
    await AppUsage.insertMany(appUsageData);
    console.log(`Seeded ${appUsageData.length} app usage records for user ${email}`);
    
    return appUsageData.length;
  } catch (error) {
    console.error('Error seeding app usage data:', error);
    throw error;
  }
};

// Function to seed tab usage data
const seedTabUsageData = async (userId, email, daysToSeed = 30) => {
  try {
    // Clear existing data for this user
    await TabUsage.deleteMany({ userId });
    
    const tabUsageData = [];
    
    // Generate data for each day
    for (let day = 0; day < daysToSeed; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Generate 10-20 tab usages per day
      const tabsPerDay = Math.floor(Math.random() * 11) + 10;
      
      for (let i = 0; i < tabsPerDay; i++) {
        const websiteIndex = Math.floor(Math.random() * websites.length);
        const { domain, url } = websites[websiteIndex];
        
        // Generate random duration (2-45 minutes in seconds)
        const duration = randomDuration(2, 45);
        
        // Create timestamp within the day
        const timestamp = new Date(date);
        timestamp.setHours(9 + Math.floor(Math.random() * 8)); // Between 9 AM and 5 PM
        timestamp.setMinutes(Math.floor(Math.random() * 60));
        
        tabUsageData.push({
          userId,
          email,
          domain,
          url,
          title: `Sample page on ${domain}`,
          timestamp,
          duration,
          lastUpdated: new Date()
        });
      }
    }
    
    // Insert all the tab usage data
    await TabUsage.insertMany(tabUsageData);
    console.log(`Seeded ${tabUsageData.length} tab usage records for user ${email}`);
    
    return tabUsageData.length;
  } catch (error) {
    console.error('Error seeding tab usage data:', error);
    throw error;
  }
};

// Main seeding function
const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    // Use test user ID and email
    const userId = '64d2e6cdc3e48d21a81acb3d'; // Replace with actual user ID
    const email = 'test@example.com';           // Replace with actual email
    
    // Seed both app and tab usage data
    const appCount = await seedAppUsageData(userId, email);
    const tabCount = await seedTabUsageData(userId, email);
    
    console.log(`Seeding complete: ${appCount} app records and ${tabCount} tab records created.`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};

// Run the seeder
seedData();
