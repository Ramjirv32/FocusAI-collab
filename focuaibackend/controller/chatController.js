const { Groq } = require('groq-sdk');
const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const ProductivitySummary = require('../models/ProductivitySummary');

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
        totalProductiveTime: Math.round(productiveTime / 60), // in minutes
        totalNonProductiveTime: Math.round(distractionTime / 60), // in minutes
        overallTotalUsage: Math.round(totalActiveTime / 60), // in minutes
        productiveHours: Math.round(productiveTime / 3600 * 10) / 10, // in hours
        distractionHours: Math.round(distractionTime / 3600 * 10) / 10, // in hours
        maxProductiveApp: topApps[0]?.name || 'Not identified',
        mostUsedApp: topApps[0]?.name || 'Not identified',
        mostVisitedTab: topSites[0]?.name || 'Not identified',
        topApps: topApps.slice(0, 3),
        topSites: topSites.slice(0, 3),
        uniqueApps: new Set(appUsage.map(app => app.appName)).size,
        uniqueSites: new Set(tabUsage.map(tab => tab.domain)).size,
        sessionsCompleted: appUsage.length,
        isCalculated: true // Flag to show this was calculated, not from summary
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
      productiveHours: Math.round((summary.totalProductiveTime || 0) / 60 * 10) / 10,
      distractionHours: Math.round((summary.totalNonProductiveTime || 0) / 60 * 10) / 10,
      maxProductiveApp: summary.maxProductiveApp,
      mostUsedApp: summary.mostUsedApp,
      mostVisitedTab: summary.mostVisitedTab,
      productiveApps: summary.productiveContent || {},
      nonProductiveApps: summary.nonProductiveContent || {},
      distractionApps: summary.distractionApps || {},
      streak: summary.streak || 0,
      level: summary.level || 1,
      totalPoints: summary.totalPoints || 0,
      isCalculated: false
    };

  } catch (error) {
    console.error('❌ Error fetching productivity data:', error);
    return null;
  }
};

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
  if (!minutes || minutes === 0) return '0 minutes';
  if (minutes < 60) {
    return `${Math.round(minutes)} minutes`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  if (remainingMinutes === 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }
  return `${hours}h ${remainingMinutes}m`;
};

// Helper function to get top apps text
const getTopAppsText = (appsData, limit = 3) => {
  if (Array.isArray(appsData)) {
    return appsData.slice(0, limit).map(app => `${app.name} (${app.duration}min)`).join(', ') || 'No apps recorded';
  }
  
  if (typeof appsData === 'object' && appsData !== null) {
    const entries = Object.entries(appsData);
    if (entries.length === 0) return 'No apps recorded';
    return entries
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([app, time]) => `${app} (${formatTime(time)})`)
      .join(', ');
  }
  
  return 'No apps recorded';
};

// Send message to chat - MAIN FUNCTION
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id; // SAME AS usageController
    const email = req.user.email; // SAME AS usageController

    console.log(`\n💬 === CHAT REQUEST START ===`);
    console.log(`👤 User: ${email} (ID: ${userId})`);
    console.log(`💬 Message: "${message}"`);

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user's productivity data - SAME PATTERN AS usageController
    const productivityData = await getUserProductivityData(userId, email);
    
    let contextualPrompt = "";
    
    if (productivityData) {
      console.log(`🎉 SUCCESS: Found productivity data for chat response`);
      
      const { 
        focusScore, 
        totalProductiveTime, 
        totalNonProductiveTime, 
        overallTotalUsage,
        productiveHours,
        distractionHours,
        maxProductiveApp,
        mostUsedApp,
        mostVisitedTab,
        topApps,
        topSites,
        uniqueApps,
        uniqueSites,
        sessionsCompleted,
        streak,
        level,
        totalPoints,
        date,
        isCalculated
      } = productivityData;

      const topProductiveApps = topApps ? getTopAppsText(topApps, 3) : 'No apps recorded';
      const topWebsites = topSites ? topSites.slice(0, 3).map(site => `${site.name} (${site.duration}min)`).join(', ') : 'No sites recorded';
      
      contextualPrompt = `
You are FocusAI, an advanced productivity assistant. The user has REAL productivity data from ${date}.

IMPORTANT: Use these EXACT numbers from their ${isCalculated ? 'calculated' : 'stored'} productivity data:

📊 REAL USER PRODUCTIVITY STATS:
• Focus Score: ${focusScore}% (their actual calculated productivity score)
• Total Productive Time: ${formatTime(totalProductiveTime)} (${productiveHours}h)
• Total Distraction Time: ${formatTime(totalNonProductiveTime)} (${distractionHours}h)
• Overall Screen Time: ${formatTime(overallTotalUsage)}
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
3. Give personalized advice based on their actual usage data
4. Use emojis to make it engaging
5. Don't use markdown formatting or asterisks
6. Be conversational and supportive
7. If they ask about productivity metrics, give them their real numbers
8. Provide actionable insights based on their actual app usage patterns

USER QUESTION: "${message}"

Respond with specific insights from their REAL productivity data. Make it personal and actionable!`;
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
      max_completion_tokens: 800,
      top_p: 1,
      stream: false,
      stop: null
    });

    const response = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    console.log(`✅ Generated ${productivityData ? 'PERSONALIZED' : 'GENERAL'} response`);
    console.log(`💬 === CHAT REQUEST END ===\n`);

    res.json({
      success: true,
      response: response,
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
      error: 'Failed to process message',
      details: error.message 
    });
  }
};

module.exports = {
  sendMessage
};