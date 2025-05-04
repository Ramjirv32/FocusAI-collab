/**
 * Current Browser Tab Monitor
 * 
 * This script detects currently open browser tabs and shows their usage stats
 * Uses puppeteer to access browser tabs and MongoDB for historical data
 * 
 * Run with: node current-tabs.js [email]
 */

const mongoose = require('mongoose');
const puppeteer = require('puppeteer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Define mongoose models
const BrowserTabUsageSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  email: String,
  browser: String,
  url: String,
  title: String,
  domain: String,
  favicon: String,
  duration: Number,
  date: String,
  timestamp: Date,
  lastActive: Date
});

// Format duration nicely
function formatDuration(seconds) {
  if (!seconds) return '0s';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  let result = '';
  if (hours > 0) result += `${hours}h `;
  if (minutes > 0 || hours > 0) result += `${minutes}m `;
  result += `${secs}s`;
  
  return result;
}

// Extract domain from URL
function extractDomain(url) {
  try {
    if (!url) return 'unknown';
    
    // Handle special cases
    if (url.startsWith('chrome://')) return 'chrome-internal';
    if (url.startsWith('about:')) return 'browser-internal';
    if (url.startsWith('file:')) return 'local-file';
    
    // Handle URLs with or without protocol
    let processedUrl = url;
    if (!url.startsWith('http') && !url.startsWith('file:')) {
      processedUrl = 'http://' + url;
    }
    
    const urlObj = new URL(processedUrl);
    let domain = urlObj.hostname;
    
    // Remove www. prefix for better grouping
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }
    
    return domain;
  } catch (e) {
    console.error('Error parsing URL:', url, e);
    return 'unknown';
  }
}

// Display a nice table in the console
function displayTable(data, columns) {
  // Calculate column widths
  const widths = {};
  columns.forEach(col => {
    widths[col.key] = col.name.length;
  });
  
  data.forEach(item => {
    columns.forEach(col => {
      const value = String(item[col.key] || '');
      widths[col.key] = Math.max(widths[col.key], value.length);
    });
  });
  
  // Print header
  let header = '';
  let separator = '';
  columns.forEach(col => {
    header += col.name.padEnd(widths[col.key] + 2);
    separator += '-'.repeat(widths[col.key]) + '  ';
  });
  console.log(header);
  console.log(separator);
  
  // Print rows
  data.forEach(item => {
    let row = '';
    columns.forEach(col => {
      let value = item[col.key];
      if (col.format) {
        value = col.format(value);
      }
      row += String(value || '').padEnd(widths[col.key] + 2);
    });
    console.log(row);
  });
}

async function main() {
  try {
    // Parse command line arguments
    const targetEmail = process.argv[2] || null;
    if (!targetEmail) {
      console.log('Usage: node current-tabs.js [email]');
      console.log('Example: node current-tabs.js user@example.com');
      process.exit(1);
    }
    
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Register the model
    const BrowserTabUsage = mongoose.model('BrowserTabUsage', BrowserTabUsageSchema);
    
    console.log(`\n===== CURRENT BROWSER TABS FOR ${targetEmail} =====\n`);
    console.log('Launching browser to detect open tabs...');
    
    // Launch browser to get current tabs
    const browser = await puppeteer.launch({
      headless: false, // Set to true for invisible mode
      args: ['--no-sandbox']
    });
    
    // Get all pages (tabs) in all browser windows
    const pages = await browser.pages();
    console.log(`Found ${pages.length} open tabs`);
    
    // Collect data about each tab
    const currentTabs = [];
    for (const page of pages) {
      try {
        const url = page.url();
        const title = await page.title();
        const domain = extractDomain(url);
        
        currentTabs.push({
          url,
          title,
          domain,
          isActive: page.isClosed() ? false : true
        });
      } catch (e) {
        console.error('Error processing tab:', e);
      }
    }
    
    // Close the browser
    await browser.close();
    
    // Get today's date for querying
    const today = new Date().toISOString().slice(0, 10);
    
    // Process each tab and get usage data
    const processedTabs = [];
    for (const tab of currentTabs) {
      // Skip about: and empty pages
      if (tab.url === 'about:blank' || !tab.url) continue;
      
      // Get historical data for this domain
      const domainStats = await BrowserTabUsage.aggregate([
        { 
          $match: { 
            email: targetEmail,
            domain: tab.domain 
          }
        },
        { 
          $group: { 
            _id: null,
            totalVisits: { $sum: 1 },
            totalDuration: { $sum: "$duration" }
          }
        }
      ]);
      
      // Get today's usage for this URL
      const todayUsage = await BrowserTabUsage.findOne({
        email: targetEmail,
        date: today,
        url: tab.url
      });
      
      processedTabs.push({
        title: tab.title ? (tab.title.length > 40 ? tab.title.substring(0, 37) + '...' : tab.title) : 'No title',
        domain: tab.domain,
        status: tab.isActive ? '✓ Active' : 'Inactive',
        todayUsage: todayUsage ? formatDuration(todayUsage.duration) : '0s',
        totalVisits: domainStats.length > 0 ? domainStats[0].totalVisits : 0,
        totalDuration: domainStats.length > 0 ? formatDuration(domainStats[0].totalDuration) : '0s'
      });
    }
    
    // Display the current tabs with their usage data
    console.log('\n----- CURRENTLY OPEN BROWSER TABS -----');
    if (processedTabs.length > 0) {
      displayTable(processedTabs, [
        { key: 'title', name: 'Tab Title' },
        { key: 'domain', name: 'Domain' },
        { key: 'status', name: 'Status' },
        { key: 'todayUsage', name: 'Today\'s Usage' },
        { key: 'totalDuration', name: 'Total Time' },
        { key: 'totalVisits', name: 'Visits' }
      ]);
      
      // Calculate totals
      const totalTodayTime = processedTabs.reduce((total, tab) => {
        const matches = tab.todayUsage.match(/(\d+)h|(\d+)m|(\d+)s/g);
        let seconds = 0;
        if (matches) {
          matches.forEach(match => {
            if (match.includes('h')) seconds += parseInt(match) * 3600;
            else if (match.includes('m')) seconds += parseInt(match) * 60;
            else seconds += parseInt(match);
          });
        }
        return total + seconds;
      }, 0);
      
      console.log(`\nTotal tabs: ${processedTabs.length}`);
      console.log(`Total time today: ${formatDuration(totalTodayTime)}`);
      
    } else {
      console.log('No active tabs found');
    }
    
    console.log('\nMonitoring complete!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Clean up
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
main();