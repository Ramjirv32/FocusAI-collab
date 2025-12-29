const mongoose = require('mongoose');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
require('dotenv').config();


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


const productiveApps = ['Visual Studio Code', 'Terminal', 'Microsoft Word', 'Microsoft Excel', 'Notion'];
const distractingApps = ['Spotify', 'Discord'];


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


const randomDuration = (min, max) => Math.floor(Math.random() * (max - min + 1) + min) * 60;


const randomDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * days));
  return date;
};


const seedAppUsageData = async (userId, email, daysToSeed = 30) => {
  try {
    
    await AppUsage.deleteMany({ userId });
    
    const appUsageData = [];
    
    
    for (let day = 0; day < daysToSeed; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];
      
      
      const appsPerDay = Math.floor(Math.random() * 6) + 5;
      
      for (let i = 0; i < appsPerDay; i++) {
        const appName = applications[Math.floor(Math.random() * applications.length)];
        
        
        let category = 'neutral';
        if (productiveApps.includes(appName)) {
          category = 'productive';
        } else if (distractingApps.includes(appName)) {
          category = 'distracting';
        }
        
        
        const sessionsPerApp = Math.floor(Math.random() * 3) + 1;
        
        for (let j = 0; j < sessionsPerApp; j++) {
          
          const duration = randomDuration(5, 120);
          
          
          const timestamp = new Date(date);
          timestamp.setHours(9 + Math.floor(Math.random() * 8)); 
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
    
    
    await AppUsage.insertMany(appUsageData);
    console.log(`Seeded ${appUsageData.length} app usage records for user ${email}`);
    
    return appUsageData.length;
  } catch (error) {
    console.error('Error seeding app usage data:', error);
    throw error;
  }
};


const seedTabUsageData = async (userId, email, daysToSeed = 30) => {
  try {
    
    await TabUsage.deleteMany({ userId });
    
    const tabUsageData = [];
    
    
    for (let day = 0; day < daysToSeed; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0];
      
      
      const tabsPerDay = Math.floor(Math.random() * 11) + 10;
      
      for (let i = 0; i < tabsPerDay; i++) {
        const websiteIndex = Math.floor(Math.random() * websites.length);
        const { domain, url } = websites[websiteIndex];
        
        
        const duration = randomDuration(2, 45);
        
        
        const timestamp = new Date(date);
        timestamp.setHours(9 + Math.floor(Math.random() * 8)); 
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
    
    
    await TabUsage.insertMany(tabUsageData);
    console.log(`Seeded ${tabUsageData.length} tab usage records for user ${email}`);
    
    return tabUsageData.length;
  } catch (error) {
    console.error('Error seeding tab usage data:', error);
    throw error;
  }
};


const seedData = async () => {
  try {
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Connected to MongoDB');
    
    
    const userId = '64d2e6cdc3e48d21a81acb3d'; 
    const email = 'test@example.com';           
    
    
    const appCount = await seedAppUsageData(userId, email);
    const tabCount = await seedTabUsageData(userId, email);
    
    console.log(`Seeding complete: ${appCount} app records and ${tabCount} tab records created.`);
    
    
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error seeding data:', error);
  }
};


seedData();
