// Add a new method to process focus vs distraction data

exports.getFocusDistractionsData = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    console.log(`Fetching focus vs distraction data for ${email} on ${date}`);
    
    // Get app usage data
    const appUsages = await AppUsage.find({
      userId,
      email,
      date
    });
    
    // Get tab usage data
    const tabUsages = await TabUsage.find({
      userId,
      email,
      date: { $regex: new RegExp(`^${date}`) }
    });
    
    // Combine app and tab usage with focus/distraction labels
    // This is where you would implement ML model inference or rule-based classification
    // For now, we'll use a simplified approach similar to your CSV
    
    const productiveApps = ['vscode', 'code', 'leetcode', 'slack', 'gmail', 'meet'];
    const distractionApps = ['youtube', 'instagram', 'facebook', 'netflix', 'reddit', 'twitter'];
    
    // Process app usage
    const appFocusData = appUsages.map(app => {
      const appNameLower = app.appName.toLowerCase();
      let type = "Neutral";
      
      if (productiveApps.some(prodApp => appNameLower.includes(prodApp))) {
        type = "Focused";
      } else if (distractionApps.some(distApp => appNameLower.includes(distApp))) {
        type = "Distracted";
      }
      
      return {
        name: app.appName,
        duration: app.duration,
        type
      };
    });
    
    // Process tab usage 
    const tabFocusData = tabUsages.map(tab => {
      const tabNameLower = (tab.title || tab.domain || "").toLowerCase();
      let type = "Neutral";
      
      // Check if domain contains productive terms
      if (
        tabNameLower.includes('leetcode') ||
        tabNameLower.includes('stackoverflow') ||
        tabNameLower.includes('github') ||
        tabNameLower.includes('docs') ||
        tabNameLower.includes('tutorial')
      ) {
        type = "Focused";
      } 
      // Check if domain contains distraction terms
      else if (
        tabNameLower.includes('youtube') ||
        tabNameLower.includes('facebook') ||
        tabNameLower.includes('twitter') ||
        tabNameLower.includes('instagram') ||
        tabNameLower.includes('reddit') ||
        tabNameLower.includes('meme') ||
        tabNameLower.includes('game')
      ) {
        type = "Distracted";
      }
      
      return {
        name: tab.title || tab.domain || "Unknown Tab",
        duration: tab.duration,
        type
      };
    });
    
    // Combine and sort by duration
    const combinedData = [...appFocusData, ...tabFocusData]
      .sort((a, b) => b.duration - a.duration);
    
    // Calculate totals
    const focusedTotal = combinedData
      .filter(item => item.type === "Focused")
      .reduce((sum, item) => sum + item.duration, 0);
      
    const distractedTotal = combinedData
      .filter(item => item.type === "Distracted")
      .reduce((sum, item) => sum + item.duration, 0);
    
    const neutralTotal = combinedData
      .filter(item => item.type === "Neutral")
      .reduce((sum, item) => sum + item.duration, 0);
    
    const totalDuration = focusedTotal + distractedTotal + neutralTotal;
    
    // Return the result
    res.json({
      date,
      activities: combinedData,
      summary: {
        focused: focusedTotal,
        distracted: distractedTotal,
        neutral: neutralTotal,
        total: totalDuration,
        focusRatio: totalDuration > 0 ? Math.round((focusedTotal / totalDuration) * 100) : 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching focus vs distraction data:', error);
    res.status(500).json({ error: 'Failed to fetch focus vs distraction data', details: error.message });
  }
};