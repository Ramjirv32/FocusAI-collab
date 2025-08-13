const API_BASE_URL = 'http://localhost:5001';

export const chatService = {
  async sendMessage(message: string) {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch productivity data first
      let productivityData = null;
      try {
        const productivityResponse = await fetch(`${API_BASE_URL}/ch`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (productivityResponse.ok) {
          productivityData = await productivityResponse.json();
          console.log('📊 Fetched productivity data:', productivityData);
        }
      } catch (error) {
        console.error('Failed to fetch productivity data:', error);
      }

      // Calculate summary stats from productivity data
      let focusScore = 0;
      let productiveHours = 0;
      let uniqueApps = 0;
      let streak = 0;

      if (productivityData && productivityData.length > 0) {
        const latestSummary = productivityData[0];
        focusScore = Math.round(latestSummary.focusScore || 0);
        productiveHours = Math.round((latestSummary.totalProductiveTime || 0) / 3600 * 10) / 10;
        uniqueApps = Object.keys(latestSummary.productiveContent || {}).length + 
                    Object.keys(latestSummary.nonProductiveContent || {}).length;
        streak = calculateStreak(productivityData);
      }

      // Create AI response based on the message and productivity data
      let aiResponse = this.generateAIResponse(message, productivityData);

      return {
        success: true,
        response: aiResponse,
        hasProductivityData: productivityData && productivityData.length > 0,
        focusScore,
        productiveHours,
        uniqueApps,
        streak
      };
    } catch (error) {
      console.error('Chat service error:', error);
      return {
        success: false,
        response: "Sorry, I'm having trouble connecting right now. Please try again."
      };
    }
  },

  generateAIResponse(message: string, productivityData: any[]) {
    const messageLower = message.toLowerCase();
    
    if (!productivityData || productivityData.length === 0) {
      return "I don't have any productivity data for you yet. Start using your computer and I'll begin tracking your focus patterns! 📊";
    }

    const latestSummary = productivityData[0];
    const focusScore = Math.round(latestSummary.focusScore || 0);
    const productiveHours = Math.round((latestSummary.totalProductiveTime || 0) / 3600 * 10) / 10;
    const totalHours = Math.round((latestSummary.overallTotalUsage || 0) / 3600 * 10) / 10;

    // Focus score related questions
    if (messageLower.includes('focus score') || messageLower.includes('focus')) {
      if (focusScore >= 80) {
        return `🎯 Excellent! Your focus score is ${focusScore}%. You're in the top tier of productivity! Keep up the fantastic work. Your productive time today: ${productiveHours} hours out of ${totalHours} total hours.`;
      } else if (focusScore >= 60) {
        return `📊 Your focus score is ${focusScore}%. That's pretty good! You spent ${productiveHours} productive hours out of ${totalHours} total. Try to minimize distractions to boost your score even higher.`;
      } else if (focusScore >= 40) {
        return `⚡ Your focus score is ${focusScore}%. There's room for improvement! You had ${productiveHours} productive hours. Consider using website blockers or focus techniques like Pomodoro to increase your productivity.`;
      } else {
        return `🚨 Your focus score is ${focusScore}%. Let's work on this together! Only ${productiveHours} hours were productive out of ${totalHours}. Try setting specific work hours and removing distracting apps.`;
      }
    }

    // Apps usage questions
    if (messageLower.includes('apps') || messageLower.includes('applications')) {
      const productiveApps = Object.entries(latestSummary.productiveContent || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([app, time]) => `${app} (${Math.round(time/60)}min)`);
      
      const distractingApps = Object.entries(latestSummary.nonProductiveContent || {})
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([app, time]) => `${app} (${Math.round(time/60)}min)`);

      return `📱 **Your App Usage Analysis:**\n\n🎯 **Most Productive Apps:**\n${productiveApps.join('\n')}\n\n🚨 **Most Distracting Apps:**\n${distractingApps.join('\n')}\n\nYour most productive app: ${latestSummary.maxProductiveApp || 'Unknown'}`;
    }

    // Default response
    return `🤖 I have your productivity data ready! Your focus score is ${focusScore}% with ${productiveHours} productive hours today. Ask me about your apps, distractions, or how to improve your productivity! 📊✨`;
  }
};

function calculateStreak(data: any[]) {
  if (!data || data.length === 0) return 0;
  
  let streak = 0;
  for (const summary of data) {
    if ((summary.focusScore || 0) >= 30) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}