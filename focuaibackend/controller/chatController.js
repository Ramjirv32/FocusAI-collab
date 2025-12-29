const AppUsage = require('../models/AppUsage');
const TabUsage = require('../models/TabUsage');
const ProductivitySummary = require('../models/ProductivitySummary');
const ChatHistory = require('../models/ChatHistory');


const getUserProductivityData = async (userId, email, date = null) => {
  try {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    console.log(`\n🔍 === FETCHING PRODUCTIVITY DATA ===`);
    console.log(`👤 User: ${email} (ID: ${userId})`);
    console.log(`📅 Target date: ${targetDate}`);

    
    let summary = await ProductivitySummary.findOne({
      userId: userId,
      email: email,
      date: targetDate
    });

    console.log(`📊 ProductivitySummary found for ${targetDate}: ${!!summary}`);

    
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

    
    if (!summary) {
      console.log(`🔄 No ProductivitySummary found, calculating from raw usage...`);

      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);
      const startDate = new Date(targetDate);
      startDate.setHours(0, 0, 0, 0);

      
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


      const totalAppTime = appUsage.reduce((sum, app) => sum + (app.duration || 0), 0);
      const totalTabTime = tabUsage.reduce((sum, tab) => sum + (tab.duration || 0), 0);
      const totalActiveTime = totalAppTime + totalTabTime;

      
      const productiveApps = appUsage.filter(app => classifyApp(app.appName) === 'productive');
      const productiveTime = productiveApps.reduce((sum, app) => sum + (app.duration || 0), 0);

      const distractiveApps = appUsage.filter(app => classifyApp(app.appName) === 'distracting');
      const distractionTime = distractiveApps.reduce((sum, app) => sum + (app.duration || 0), 0);

      const focusScore = totalActiveTime > 0 ? Math.round((productiveTime / totalActiveTime) * 100) : 0;

      
      const topApps = getTopItems(appUsage, 'appName');
      const topSites = getTopItems(tabUsage, 'domain');

      console.log(`✅ Calculated stats: Focus Score ${focusScore}%, Active Time ${Math.round(totalActiveTime / 60)}min`);

      return {
        date: targetDate,
        focusScore: focusScore,
        
        totalProductiveTime: Math.round(productiveTime / 60), 
        totalNonProductiveTime: Math.round(distractionTime / 60), 
        overallTotalUsage: Math.round(totalActiveTime / 60), 
        productiveHours: Math.round(productiveTime / 3600 * 10) / 10, 
        distractionHours: Math.round(distractionTime / 3600 * 10) / 10, 
        maxProductiveApp: topApps[0]?.name || 'Not identified',
        mostUsedApp: topApps[0]?.name || 'Not identified',
        mostVisitedTab: topSites[0]?.name || 'Not identified',
        topApps: topApps.slice(0, 3),
        topSites: topSites.slice(0, 3),
        uniqueApps: new Set(appUsage.map(app => app.appName)).size,
        uniqueSites: new Set(tabUsage.map(tab => tab.domain)).size,
        sessionsCompleted: appUsage.length,
        isCalculated: true, 
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
      productiveHours: Math.round((summary.totalProductiveTime * 60 || 0) / 3600 * 10) / 10, 
      distractionHours: Math.round((summary.totalNonProductiveTime * 60 || 0) / 3600 * 10) / 10, 
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


function getTopItemsFromObject(items, limit = 5) {
  return Object.entries(items)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) }));
}


function classifyApp(appName) {
  const appLower = appName.toLowerCase();

  if (appLower.includes('ai') || appLower.includes('antigravity') || appLower.includes('focus') || appLower.includes('focuai') || appLower.includes('cursor')) {
    return 'productive';
  }

  const productiveApps = [
    'code', 'vscode', 'visual studio', 'terminal', 'gnome-terminal', 'powershell', 'cmd',
    'iterm', 'konsole', 'xterm', 'mysql', 'postman', 'slack', 'eclipse', 'intellij',
    'pycharm', 'vim', 'emacs', 'git', 'docker', 'mongodb compass', 'figma', 'notion',
    'jira', 'confluence', 'trello', 'asana', 'linear', 'windsurf', 'sublime', 'android studio',
    'xcode', 'wezterm', 'alacritty', 'zeal', 'dbeaver', 'insomnia'
  ];

  const distractiveApps = [
    'netflix', 'spotify', 'youtube', 'twitter', 'instagram', 'facebook',
    'tiktok', 'reddit', 'gaming', 'steam', 'discord', 'whatsapp',
    'telegram', 'snapchat', 'twitch', 'hulu', 'disney+', 'prime video'
  ];

  const browsers = ['chrome', 'firefox', 'browser', 'chromium', 'brave', 'edge', 'safari', 'opera', 'vivaldi'];

  if (productiveApps.some(app => appLower.includes(app.toLowerCase()))) {
    return 'productive';
  } else if (distractiveApps.some(app => appLower.includes(app.toLowerCase()))) {
    return 'distracting';
  } else if (browsers.some(b => appLower.includes(b))) {
    return 'productive';
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
    .map(([name, duration]) => ({ name, duration: Math.round(duration / 60) })); 
}


const formatTime = (minutes) => {
  if (!minutes || minutes === 0) return '0 hours';

  
  const hours = minutes / 60;

  if (hours < 1) {
    return `${Math.round(minutes)} minutes`; 
  }

  if (hours % 1 === 0) {
    return `${Math.round(hours)} hour${hours > 1 ? 's' : ''}`;
  }

  return `${Math.floor(hours)} hour${Math.floor(hours) > 1 ? 's' : ''} ${Math.round(minutes % 60)} min`;
};


const getTopAppsText = (appsData, limit = 3) => {
  if (Array.isArray(appsData)) {
    return appsData.slice(0, limit).map(app => {
      
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
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([app, time]) => {
        
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


const getAllProductivitySummaries = async (email) => {
  try {
    console.log(`\n📊 === FETCHING ALL PRODUCTIVITY SUMMARIES ===`);
    console.log(`👤 User email: ${email}`);

    const summaries = await ProductivitySummary.find({ email: email });

    console.log(`✅ Found ${summaries.length} productivity summaries for ${email}`);

    return summaries;
  } catch (error) {
    console.error('❌ Error fetching all productivity summaries:', error);
    return [];
  }
};


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

    
    
    let productivityData = userData;

    
    if (!productivityData) {
      try {
        productivityData = await getUserProductivityData(userId, email);
      } catch (dataError) {
        console.error('Error fetching productivity data from database:', dataError);
        
      }
    }

    
    let allProductivitySummaries = [];
    try {
      allProductivitySummaries = await getAllProductivitySummaries(email);
      console.log(`📈 Retrieved ${allProductivitySummaries.length} historical productivity summaries`);
    } catch (summariesError) {
      console.error('Error fetching historical productivity summaries:', summariesError);
      
    }

    
    let chatHistory;
    try {
      if (historyId && historyId.match(/^[0-9a-fA-F]{24}$/)) {
        chatHistory = await ChatHistory.findOne({
          _id: historyId,
          userId: userId
        });
      }

      if (!chatHistory) {
        chatHistory = new ChatHistory({
          userId: userId,
          email: email,
          title: message.substring(0, 30) + (message.length > 30 ? '...' : ''),
          messages: []
        });
      }
    } catch (historyError) {
      console.error('Error managing chat history:', historyError);
      chatHistory = { messages: [] };
    }

    
    let historicalTrendsSection = "";
    if (allProductivitySummaries && allProductivitySummaries.length > 1) {
      const sortedSummaries = [...allProductivitySummaries].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const avgFocusScore = Math.round(
        sortedSummaries.reduce((sum, s) => sum + (s.focusScore || 0), 0) / sortedSummaries.length
      );
      const recentSummaries = sortedSummaries.slice(-7);
      const focusScoreTrend = recentSummaries.map(s => ({
        date: s.date,
        score: s.focusScore || 0
      }));

      historicalTrendsSection = `
HISTORICAL TRENDS (${sortedSummaries.length} days of data):
• Average Focus Score: ${avgFocusScore}%
• Recent Focus Scores: ${focusScoreTrend.map(fs => `${fs.date}: ${fs.score}%`).join(', ')}
• Progress: ${productivityData?.focusScore > avgFocusScore ? `Improving (${productivityData.focusScore - avgFocusScore}% above average)` :
          productivityData?.focusScore < avgFocusScore ? `Declining (${avgFocusScore - productivityData.focusScore}% below average)` :
            'Steady (matching average)'}
`;
    }

    
    let systemPrompt = "";

    if (productivityData) {
      
      const focusScore = productivityData.focusScore || 0;
      const totalProdMinutes = productivityData.totalProductiveTime || productivityData.productiveTime || 0;
      const totalDistMinutes = productivityData.totalNonProductiveTime || productivityData.distractionTime || 0;

      const productiveHours = productivityData.productiveHours || Math.round((totalProdMinutes / 60) * 10) / 10;
      const distractionHours = productivityData.distractionHours || Math.round((totalDistMinutes / 60) * 10) / 10;

      const streak = productivityData.streak || await calculateStreak(userId) || 0;
      const maxProductiveApp = productivityData.maxProductiveApp ||
        (productivityData.topApps && productivityData.topApps.length > 0 ? productivityData.topApps[0].name : 'Not identified');
      const mostVisitedTab = productivityData.mostVisitedTab ||
        (productivityData.topSites && productivityData.topSites.length > 0 ? productivityData.topSites[0].name : 'Not identified');

      systemPrompt = `You are FocusAI, an advanced productivity coach. You have access to the user's REAL productivity data for ${productivityData.date || 'today'}.

📊 USER PRODUCTIVITY DATA:
• Focus Score: ${focusScore}%
• Productive Time: ${productiveHours} hours
• Distraction Time: ${distractionHours} hours
• Top Productive Tool: ${maxProductiveApp}
• Top Website: ${mostVisitedTab}
• Current Streak: ${streak} days
${historicalTrendsSection}

RESPONSE RULES:
1. ALWAYS use hours for time (e.g., 2.5 hours). NEVER use minutes.
2. Be encouraging, actionable, and analytical.
3. Reference their specific focus score of ${focusScore}% in your response.
4. Don't use markdown formatting (no **asterisks**) because the UI doesn't support it.
5. Provide a personalized tip based on their ${maxProductiveApp} usage.
6. Use emojis to make it engaging 🚀⚡.
7. Keep responses concise but insightful.

USER QUESTION: "${message}"`;
    } else {
      systemPrompt = `You are FocusAI, a productivity assistant. This user doesn't have productivity tracking data available yet.

Provide helpful productivity advice and encourage them to use FocusAI's tracking features. Keep the response friendly and encouraging. Use emojis but NO markdown formatting.

USER QUESTION: "${message}"`;
    }

    const groqMessages = [
      {
        role: "system",
        content: systemPrompt
      }
    ];

    
    if (chatHistory.messages && chatHistory.messages.length > 0) {
      const historyContext = chatHistory.messages.slice(-10).map(msg => ({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content
      }));
      groqMessages.push(...historyContext);
    }

    
    groqMessages.push({
      role: "user",
      content: message
    });

    console.log(`🤖 Sending request to Groq with ${groqMessages.length} total messages (Context: ${Math.max(0, groqMessages.length - 2)})`);

    
    const aiProvider = require('../utils/aiProvider');
    const aiResponse = await aiProvider.createChatCompletion({
      messages: groqMessages,
      temperature: 0.7,
      max_tokens: 800
    });

    console.log(`✅ Generated ${productivityData ? 'PERSONALIZED' : 'GENERAL'} response`);

    
    try {
      
      chatHistory.messages.push({
        content: message,
        isUser: true,
        timestamp: new Date()
      });

      
      chatHistory.messages.push({
        content: aiResponse,
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

      if (chatHistory.save) {
        await chatHistory.save();
        console.log(`💾 Saved conversation to history ID: ${chatHistory._id}`);
      }
    } catch (saveError) {
      console.error('Error saving chat history:', saveError);
    }

    console.log(`💬 === CHAT REQUEST END ===\n`);

    
    res.json({
      success: true,
      response: aiResponse,
      historyId: chatHistory?._id || null,
      hasProductivityData: !!productivityData,
      focusScore: productivityData?.focusScore || 0,
      productiveHours: productivityData?.productiveHours || 0,
      uniqueApps: productivityData?.uniqueApps || 0,
      streak: productivityData?.streak || 0,
      historicalDataPoints: allProductivitySummaries.length,
      debugInfo: {
        userId: userId.toString(),
        email: email,
        dataFound: !!productivityData,
        dataDate: productivityData?.date || 'No date',
        isCalculated: productivityData?.isCalculated || false
      }
    });

  } catch (error) {
    console.error('❌ Chat controller error:', error);

    
    if (error.message && (
      error.message.includes('Invalid API Key') ||
      error.message.includes('invalid_api_key') ||
      error.message.includes('401') ||
      (error.error && error.error.code === 'invalid_api_key')
    )) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API Key',
        message: 'Your Groq API key is not valid. Please update it in the API Key Manager (Key icon in header).',
        response: "⚠️ Invalid API Key\n\nYour Groq API key is not valid or has expired. Please:\n\n1. Click the Key icon (🔑) in the header\n2. Enter a valid Groq API key\n3. Test the key to verify it works\n4. Save and restart the services\n\nGet a free API key at: https://console.groq.com/keys"
      });
    }

    
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