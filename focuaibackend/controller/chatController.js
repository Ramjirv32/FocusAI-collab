const { Groq } = require('groq-sdk');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const ProductivitySummary = require('../models/ProductivitySummary');
const ChatHistory = require('../models/ChatHistory');

const groq = new Groq({
  apiKey: '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'
});

// Helper function to get user's productivity data - SAME LOGIC AS usageController.js
const getUserProductivityData = async (userId, email, date = null) => {
  try {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    console.log(`\n🔍 === FETCHING PRODUCTIVITY DATA ===`);
    console.log(`👤 User: ${email} (ID: ${userId})`);
    console.log(`📅 Target date: ${targetDate}`);

    // First try to get existing ProductivitySummary - SAME AS usageController
    let summary = await ProductivitySummary.findOne({
      userId: userId,
      email: email,
      date: targetDate
    });

    console.log(`📊 ProductivitySummary found for ${targetDate}: ${!!summary}`);

    // If no summary for today, get the latest one - SAME AS usageController
    if (!summary) {
      console.log(`⚠️ No summary for ${targetDate}, getting latest...`);
      summary = await ProductivitySummary.findOne({
        userId: userId,
        email: email
      }).sort({ date: -1 });
      
      console.log(`📊 Latest summary found: ${!!summary}`);
      if (summary) {
        console.log(`📅 Latest summary date: ${summary.date}`);
      }
    }

    // If still no summary, calculate from raw data - SAME AS usageController getUserStats
    if (!summary) {
      console.log(`🔄 No ProductivitySummary found, calculating from raw usage...`);
      
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);

      // Get app and tab usage - EXACT SAME QUERY PATTERN AS usageController
      const [appUsage, tabUsage] = await Promise.all([
        AppUsage.find({
          email: email,
          $or: [
            { userId: userId.toString() },
            { userId: userId }
          ],
          timestamp: { $gte: startDate, $lte: endDate }
        }),
        TabUsage.find({
          email: email,
          $or: [
            { userId: userId.toString() },
            { userId: userId }
          ],
          timestamp: { $gte: startDate, $lte: endDate }
        })
      ]);

      console.log(`📱 Found ${appUsage.length} app records, ${tabUsage.length} tab records`);

      if (appUsage.length === 0 && tabUsage.length === 0) {
        console.log(`❌ No usage data found for user ${email}`);
        return null;
      }

      // Calculate stats - SAME LOGIC AS usageController getUserStats
      const totalAppTime = appUsage.reduce((sum, app) => sum + (app.duration || 0), 0);
      const totalTabTime = tabUsage.reduce((sum, tab) => sum + (tab.duration || 0), 0);
      const totalActiveTime = totalAppTime + totalTabTime;

      // Classify apps - SAME LOGIC AS usageController
      const productiveApps = appUsage.filter(app => classifyApp(app.appName) === 'productive');
      const productiveTime = productiveApps.reduce((sum, app) => sum + (app.duration || 0), 0);

      const distractiveApps = appUsage.filter(app => classifyApp(app.appName) === 'distracting');
      const distractionTime = distractiveApps.reduce((sum, app) => sum + (app.duration || 0), 0);

      const focusScore = totalActiveTime > 0 ? Math.round((productiveTime / totalActiveTime) * 100) : 0;

      // Get top apps - SAME LOGIC AS usageController
      const topApps = getTopItems(appUsage, 'appName');
      const topSites = getTopItems(tabUsage, 'domain');

      console.log(`✅ Calculated stats: Focus Score ${focusScore}%, Active Time ${Math.round(totalActiveTime/60)}min`);

      return {
        date: targetDate,
        focusScore: focusScore,
        // Convert seconds directly to hours
        totalProductiveTime: Math.round(productiveTime / 60), // in minutes
        totalNonProductiveTime: Math.round(distractionTime / 60), // in minutes
        overallTotalUsage: Math.round(totalActiveTime / 60), // in minutes
        productiveHours: Math.round(productiveTime / 3600 * 10) / 10, // in hours, rounded to 1 decimal
        distractionHours: Math.round(distractionTime / 3600 * 10) / 10, // in hours, rounded to 1 decimal
        maxProductiveApp: topApps[0]?.name || 'Not identified',
        mostUsedApp: topApps[0]?.name || 'Not identified',
        mostVisitedTab: topSites[0]?.name || 'Not identified',
        topApps: topApps.slice(0, 3),
        topSites: topSites.slice(0, 3),
        uniqueApps: new Set(appUsage.map(app => app.appName)).size,
        uniqueSites: new Set(tabUsage.map(tab => tab.domain)).size,
        sessionsCompleted: appUsage.length,
        isCalculated: true, // Flag to show this was calculated, not from summary
        productiveContent: productiveApps.reduce((acc, app) => {
          acc[app.appName] = (acc[app.appName] || 0) + app.duration;
          return acc;
        }, {}),
        distractionContent: distractiveApps.reduce((acc, app) => {
          acc[app.appName] = (acc[app.appName] || 0) + app.duration;
          return acc;
        }, {})
      };
    }

    // Return existing summary data - FORMAT SAME AS usageController
    console.log(`✅ Using existing ProductivitySummary:`, {
      date: summary.date,
      focusScore: summary.focusScore,
      totalProductiveTime: summary.totalProductiveTime,
      hasProductiveContent: !!(summary.productiveContent && Object.keys(summary.productiveContent).length > 0)
    });

    return {
      date: summary.date,
      focusScore: summary.focusScore,
      totalProductiveTime: summary.totalProductiveTime,
      totalNonProductiveTime: summary.totalNonProductiveTime,
      overallTotalUsage: summary.overallTotalUsage,
      productiveHours: Math.round((summary.totalProductiveTime * 60 || 0) / 3600 * 10) / 10, // convert minutes to hours
      distractionHours: Math.round((summary.totalNonProductiveTime * 60 || 0) / 3600 * 10) / 10, // convert minutes to hours
      maxProductiveApp: summary.maxProductiveApp,
      mostUsedApp: summary.mostUsedApp,
      mostVisitedTab: summary.mostVisitedTab,
      productiveContent: summary.productiveContent || {},
      distractionContent: summary.distractionContent || {},
      distractionApps: summary.distractionApps || {},
      streak: summary.streak || 0,
      level: summary.level || 1,
      totalPoints: summary.totalPoints || 0,
      isCalculated: false,
      topApps: summary.productiveContent ? getTopItemsFromObject(summary.productiveContent, 3) : [],
      topSites: summary.tabContent ? getTopItemsFromObject(summary.tabContent, 3) : []
    };

  } catch (error) {
    console.error('❌ Error fetching productivity data:', error);
    return null;
  }
};

// Helper function to get top items from an object
function getTopItemsFromObject(items, limit = 5) {
  return Object.entries(items)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) }));
}

// Helper functions - SAME AS usageController.js
function classifyApp(appName) {
  const productiveApps = ['VS Code', 'Visual Studio', 'IntelliJ', 'Eclipse', 'Sublime Text', 'Terminal', 'Command Prompt', 'PowerShell', 'Code', 'Gnome-terminal'];
  const distractiveApps = ['Facebook', 'Instagram', 'TikTok', 'Reddit', 'YouTube', 'Netflix', 'Games', 'focusai-app', 'Windsurf', 'Windows Explorer'];
  
  if (productiveApps.some(app => appName.toLowerCase().includes(app.toLowerCase()))) {
    return 'productive';
  } else if (distractiveApps.some(app => appName.toLowerCase().includes(app.toLowerCase()))) {
    return 'distracting';
  }
  return 'neutral';
}

function getTopItems(items, field) {
  const grouped = items.reduce((acc, item) => {
    const key = item[field] || 'unknown';
    acc[key] = (acc[key] || 0) + (item.duration || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) })); // Convert to minutes
}

// Helper function to format time duration
const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return '0 hours';
  
  // Always convert to hours for display
  const hours = minutes / 60;
  
  if (hours < 1) {
    return `${Math.round(minutes)} minutes`; // Keep minutes only for very small durations
  }
  
  if (hours % 1 === 0) {
    return `${Math.round(hours)} hour${hours > 1 ? 's' : ''}`;
  }
  
  return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? 's' : ''} ${Math.round(minutes % 60)} min`;
};

// Helper function to get top apps text
const getTopAppsText = (appsData, limit = 3) => {
  if (Array.isArray(appsData)) {
    return appsData.slice(0, limit).map(app => {
      // Convert to hours for display
      const hours = app.duration / 60; 
      if (hours < 1) {
        return `${app.name} (${app.duration}min)`;
      } else {
        return `${app.name} (${Math.round(hours * 10) / 10}h)`;
      }
    }).join(', ') || 'No apps recorded';
  }
  
  if (typeof appsData === 'object' && appsData !== null) {
    const entries = Object.entries(appsData);
    if (entries.length === 0) return 'No apps recorded';
    return entries
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([app, time]) => {
        // Convert minutes to hours
        const hours = time / 60;
        if (hours < 1) {
          return `${app} (${Math.round(time)}min)`;
        } else {
          return `${app} (${Math.round(hours * 10) / 10}h)`;
        }
      })
      .join(', ');
  }
  
  return 'No apps recorded';
};

// Calculate user streak
const calculateStreak = async (userId) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const summaries = await ProductivitySummary.find({ 
      userId: userId,
      date: { $lte: today }
    })
    .sort({ date: -1 })
    .limit(30);
    
    if (!summaries.length) return 0;
    
    let currentStreak = 1;
    let prevDate = new Date(summaries[0].date);
    
    for (let i = 1; i < summaries.length; i++) {
      const currentDate = new Date(summaries[i].date);
      const diffDays = Math.round((prevDate - currentDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        currentStreak++;
        prevDate = currentDate;
      } else {
        break;
      }
    }
    
    return currentStreak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
};

// Send message to chat - MAIN FUNCTION
const sendMessage = async (req, res) => {
  try {
    const { message, historyId, userData } = req.body;
    const userId = req.user._id;
    const email = req.user.email;

    console.log(`\n💬 === CHAT REQUEST START ===`);
    console.log(`👤 User: ${email} (ID: ${userId})`);
    console.log(`💬 Message: "${message}"`);
    console.log(`🔗 History ID: ${historyId || 'New conversation'}`);
    
    if (userData) {
      console.log(`📊 User data received from frontend:`, userData);
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user's productivity data - SAME PATTERN AS usageController
    // Prioritize user data sent from frontend if available
    let productivityData = userData;
    
    // If no userData provided, try to get it from the database
    if (!productivityData) {
      try {
        productivityData = await getUserProductivityData(userId, email);
      } catch (dataError) {
        console.error('Error fetching productivity data from database:', dataError);
        // Continue without productivity data
      }
    }
    
    let contextualPrompt = "";
    
    if (productivityData) {
      console.log(`🎉 SUCCESS: Found productivity data for chat response`);
      
      // Extract common properties, handle different data structures
      const focusScore = productivityData.focusScore || 0;
      const totalProductiveTime = productivityData.totalProductiveTime || productivityData.productiveTime || 0;
      const totalNonProductiveTime = productivityData.totalNonProductiveTime || productivityData.distractionTime || 0;
      const overallTotalUsage = productivityData.overallTotalUsage || productivityData.totalAppUsage || 0;
      
      // Fix the hours calculation - replace these lines:
      // const productiveHours = productivityData.productiveHours || 
      //               (typeof totalProductiveTime === 'number' ? 
      //                 Math.round((totalProductiveTime / 60) * 10) / 10 : 0);
      //                 
      // const distractionHours = productivityData.distractionHours || 
      //                (typeof totalNonProductiveTime === 'number' ? 
      //                  Math.round((totalNonProductiveTime / 60) * 10) / 10 : 0);
      // With these corrected calculations:
      // If values come from raw data, they need to be converted from seconds to hours
      // If they come from summary, they need to be converted from minutes to hours
      const productiveHours = productivityData.productiveHours || 
                    (typeof totalProductiveTime === 'number' ? 
                      (productivityData.isCalculated ? 
                        // If calculated from raw data, totalProductiveTime is in minutes (converted from seconds)
                        // so divide by 60 to get hours
                        Math.round((totalProductiveTime / 60) * 10) / 10 : 
                        // If from summary, totalProductiveTime is already in minutes
                        // so divide by 60 to get hours
                        Math.round((totalProductiveTime / 60) * 10) / 10) : 
                    0);
                    
      const distractionHours = productivityData.distractionHours || 
                     (typeof totalNonProductiveTime === 'number' ? 
                       (productivityData.isCalculated ? 
                         // If calculated from raw data, totalNonProductiveTime is in minutes (converted from seconds)
                         // so divide by 60 to get hours
                         Math.round((totalNonProductiveTime / 60) * 10) / 10 : 
                         // If from summary, totalNonProductiveTime is already in minutes
                         // so divide by 60 to get hours
                         Math.round((totalNonProductiveTime / 60) * 10) / 10) : 
                     0);
      const streak = productivityData.streak || await calculateStreak(userId) || 0;
      
      // Handle different property names between frontend and backend data
      const maxProductiveApp = productivityData.maxProductiveApp || 
        (productivityData.topApps && productivityData.topApps.length > 0 ? productivityData.topApps[0].name : 'Not identified');
      
      const mostUsedApp = productivityData.mostUsedApp || maxProductiveApp;
      
      const mostVisitedTab = productivityData.mostVisitedTab || 
        (productivityData.topSites && productivityData.topSites.length > 0 ? productivityData.topSites[0].name : 'Not identified');
      
      // Get top apps from whatever structure is available
      let topApps = [];
      if (Array.isArray(productivityData.topApps)) {
        topApps = productivityData.topApps;
      } else if (productivityData.productiveContent) {
        topApps = getTopItemsFromObject(productivityData.productiveContent, 3);
      }
      
      // Get top sites from whatever structure is available
      let topSites = [];
      if (Array.isArray(productivityData.topSites)) {
        topSites = productivityData.topSites;
      } else if (productivityData.tabContent) {
        topSites = getTopItemsFromObject(productivityData.tabContent, 3);
      }
      
      // Other properties with defaults
      const uniqueApps = productivityData.uniqueApps || 0;
      const uniqueSites = productivityData.uniqueSites || 0;
      const sessionsCompleted = productivityData.sessionsCompleted || 0;
      const level = productivityData.level || 1;
      const totalPoints = productivityData.totalPoints || 0;
      const date = productivityData.date || new Date().toISOString().slice(0, 10);
      const isCalculated = productivityData.isCalculated || false;

      const topProductiveApps = topApps.length > 0 ? 
        topApps.slice(0, 3).map(app => {
          // Convert minutes to hours for display
          const hours = app.duration / 60;
          if (hours < 1) {
            return `${app.name} (${app.duration}min)`;
          } else {
            return `${app.name} (${Math.round(hours * 10) / 10}h)`;
          }
        }).join(', ') : 
        'No apps recorded';

      const topWebsites = topSites.length > 0 ? 
        topSites.slice(0, 3).map(site => {
          // Convert minutes to hours for display
          const hours = site.duration / 60;
          if (hours < 1) {
            return `${site.name} (${site.duration}min)`;
          } else {
            return `${site.name} (${Math.round(hours * 10) / 10}h)`;
          }
        }).join(', ') : 
        'No sites recorded';
      
      contextualPrompt = `
You are FocusAI, an advanced productivity assistant. The user has REAL productivity data from ${date}.

IMPORTANT: Use these EXACT numbers from their ${isCalculated ? 'calculated' : 'stored'} productivity data:

📊 REAL USER PRODUCTIVITY STATS:
• Focus Score: ${focusScore}% (their actual calculated productivity score)
• Total Productive Time: ${Math.round(productiveHours)/10} hours
• Total Distraction Time: ${Math.round(distractionHours)/10} hours
• Overall Screen Time: ${Math.round(overallTotalUsage)/10} hours
• Most Productive App: ${maxProductiveApp}
• Most Used App Overall: ${mostUsedApp}
• Most Visited Website: ${mostVisitedTab}
• Top Productive Apps: ${topProductiveApps}
• Top Websites Visited: ${topWebsites}
• Unique Apps Used: ${uniqueApps}
• Unique Sites Visited: ${uniqueSites}
• Work Sessions Completed: ${sessionsCompleted}
• Current Streak: ${streak} days
• Productivity Level: ${level}
• Total Points Earned: ${totalPoints}

RESPONSE RULES:
1. ALWAYS mention their exact focus score of ${focusScore}%
2. Reference their specific app usage times and patterns
3. ONLY present time durations in HOURS - never minutes or seconds
4. When referring to Total Productive Time, only say ${productiveHours} hours
5. When referring to Total Distraction Time, only say ${distractionHours} hours
6. For app usage times, use hours (e.g., 2.5 hours, not 150 minutes)
7. Give personalized advice based on their actual usage data
8. Use emojis to make it engaging
9. Don't use markdown formatting or asterisks
10. Be conversational and supportive
11. NEVER convert hours back to minutes in your response
12. Provide actionable insights based on their actual app usage patterns

USER QUESTION: "${message}"

Respond with specific insights from their REAL productivity data, always using hours for time measurements. Make it personal and actionable!`;
    } else {
      console.log(`⚠️ NO PRODUCTIVITY DATA - Using general response`);
      contextualPrompt = `
You are FocusAI, a productivity assistant. This user doesn't have productivity tracking data available yet.

Provide helpful productivity advice and encourage them to:
1. Start using the app tracking features in FocusAI
2. Track their application usage throughout their work sessions
3. Come back after a day of usage for personalized insights based on their real data

Keep the response friendly, encouraging, and informative. Use emojis but no markdown formatting.

USER QUESTION: "${message}"`;
    }

    // Create chat completion
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: contextualPrompt
        },
        {
          role: "user", 
          content: message
        }
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_tokens: 800,
      top_p: 1,
      stream: false,
      stop: null
    });

    const response = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log(`✅ Generated ${productivityData ? 'PERSONALIZED' : 'GENERAL'} response`);
    
    // Store the conversation in chat history
    let chatHistory;
    
    try {
      // Try to find existing history or create new one
      if (historyId) {
        try {
          chatHistory = await ChatHistory.findOne({ 
            _id: historyId,
            userId: userId 
          });
        } catch (findError) {
          console.error('Error finding chat history:', findError);
          // Continue with creating a new one
        }
      }
      
      if (!chatHistory) {
        // Create new chat history
        try {
          chatHistory = new ChatHistory({
            userId: userId,
            email: email,
            title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
            messages: []
          });
        } catch (createError) {
          console.error('Error creating chat history:', createError);
        }
      }
      
      if (chatHistory) {
        // Add user message
        chatHistory.messages.push({
          content: message,
          isUser: true,
          timestamp: new Date()
        });
        
        // Add AI response with productivity data
        chatHistory.messages.push({
          content: response,
          isUser: false,
          timestamp: new Date(),
          productivityData: productivityData ? {
            focusScore: productivityData.focusScore || 0,
            productiveHours: productivityData.productiveHours || 0,
            uniqueApps: productivityData.uniqueApps || 0,
            streak: productivityData.streak || 0,
            hasProductivityData: !!productivityData
          } : null
        });
        
        await chatHistory.save();
        
        console.log(`\n💾 === SAVED CHAT HISTORY ===`);
        console.log(`History ID: ${chatHistory._id}`);
        console.log(`Message count: ${chatHistory.messages.length}`);
      }
    } catch (historyError) {
      console.error('Error with chat history:', historyError);
    }

    console.log(`💬 === CHAT REQUEST END ===\n`);

    res.json({
      success: true,
      response: response,
      historyId: chatHistory?._id || null,
      hasProductivityData: !!productivityData,
      focusScore: productivityData?.focusScore || 0,
      productiveHours: productivityData?.productiveHours || 0,
      uniqueApps: productivityData?.uniqueApps || 0,
      streak: productivityData?.streak || 0,
      debugInfo: {
        userId: userId.toString(),
        email: email,
        dataFound: !!productivityData,
        dataDate: productivityData?.date || 'No date',
        focusScore: productivityData?.focusScore || 'No score',
        isCalculated: productivityData?.isCalculated || false
      }
    });

  } catch (error) {
    console.error('❌ Chat controller error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to process message',
      details: error.message,
      response: "I'm having trouble accessing my AI capabilities right now. Please try again in a moment."
    });
  }
};

module.exports = {
  sendMessage
};