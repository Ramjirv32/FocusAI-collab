const aiProvider = require('../utils/aiProvider');
const ChatHistory = require('../models/ChatHistory');

const processVoiceMessage = async (req, res) => {
  try {
    const { message, productivityData, userEmail } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let formattedData = "No productivity data available.";
    if (productivityData && Array.isArray(productivityData) && productivityData.length > 0) {
      const latestData = productivityData[productivityData.length - 1];

      formattedData = `
User: ${userEmail}
Date: ${new Date(latestData.date).toLocaleDateString()}
Focus Score: ${Math.round(latestData.focusScore || 0)}%
Productive Time: ${((latestData.totalProductiveTime || 0) / 3600).toFixed(1)} hours
Distraction Time: ${((latestData.totalNonProductiveTime || 0) / 3600).toFixed(1)} hours
Most Used App: ${latestData.mostUsedApp || "Unknown"}
Most Visited Website: ${latestData.mostVisitedTab || "Unknown"}
`;

      if (latestData.productiveContent) {
        formattedData += "\nProductive Apps/Sites:\n";
        try {
          if (typeof latestData.productiveContent.entries === 'function') {
            for (const [app, duration] of latestData.productiveContent.entries()) {
              formattedData += `- ${app}: ${(duration / 60).toFixed(1)} minutes\n`;
            }
          } else if (typeof latestData.productiveContent === 'object') {
            Object.entries(latestData.productiveContent).forEach(([app, duration]) => {
              formattedData += `- ${app}: ${(duration / 60).toFixed(1)} minutes\n`;
            });
          }
        } catch (e) {
          formattedData += "- Data format not compatible\n";
        }
      }

      if (latestData.nonProductiveContent || latestData.distractionApps) {
        formattedData += "\nDistraction Apps/Sites:\n";
        try {
          const distractionSource = latestData.nonProductiveContent || latestData.distractionApps;
          if (typeof distractionSource.entries === 'function') {
            for (const [app, duration] of distractionSource.entries()) {
              formattedData += `- ${app}: ${(duration / 60).toFixed(1)} minutes\n`;
            }
          } else if (typeof distractionSource === 'object') {
            Object.entries(distractionSource).forEach(([app, duration]) => {
              formattedData += `- ${app}: ${(duration / 60).toFixed(1)} minutes\n`;
            });
          }
        } catch (e) {
          formattedData += "- Data format not compatible\n";
        }
      }
    }

    let historyId = null;
    if (req.user) {
      const newHistory = new ChatHistory({
        userId: req.user.id,
        messages: [{
          role: 'user',
          content: message
        }]
      });

      await newHistory.save();
      historyId = newHistory._id;
    }

    const systemPrompt = `You are FocusAI, a productivity assistant that helps users understand their productivity data and 
    improve their focus and work habits. You have access to the user's productivity data.
    
    Your tone should be helpful, encouraging, and data-driven. Focus on actionable insights.
    Always reference the specific productivity metrics when giving advice. Be concise but thorough.
    
    Here is the user's productivity data:
    ${formattedData}
    
    Provide personalized insights and advice based on this data. If you're asked something not 
    related to productivity, politely steer the conversation back to productivity topics.`;

    const aiResponse = await aiProvider.createChatCompletion({
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });

    if (historyId) {
      await ChatHistory.findByIdAndUpdate(
        historyId,
        { $push: { messages: { role: 'assistant', content: aiResponse } } }
      );
    }

    return res.json({
      success: true,
      response: aiResponse,
      historyId
    });

  } catch (error) {
    console.error('Error processing voice message:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
  }
};

module.exports = {
  processVoiceMessage
};