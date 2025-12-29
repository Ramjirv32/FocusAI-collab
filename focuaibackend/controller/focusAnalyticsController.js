

exports.getFocusDistractionsData = async (req, res) => {
  try {
    const { userId, email } = req.user;
    const { date = new Date().toISOString().split('T')[0] } = req.query;
    
    console.log(`Fetching focus vs distraction data for ${email} on ${date}`);
    
    
    const appUsages = await AppUsage.find({
      userId,
      email,
      date
    });
    
    
    const tabUsages = await TabUsage.find({
      userId,
      email,
      date: { $regex: new RegExp(`^${date}`) }
    });
    
    
    
    
    
    const productiveApps = ['vscode', 'code', 'leetcode', 'slack', 'gmail', 'meet'];
    const distractionApps = ['youtube', 'instagram', 'facebook', 'netflix', 'reddit', 'twitter'];
    
    
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
    
    
    const tabFocusData = tabUsages.map(tab => {
      const tabNameLower = (tab.title || tab.domain || "").toLowerCase();
      let type = "Neutral";
      
      
      if (
        tabNameLower.includes('leetcode') ||
        tabNameLower.includes('stackoverflow') ||
        tabNameLower.includes('github') ||
        tabNameLower.includes('docs') ||
        tabNameLower.includes('tutorial')
      ) {
        type = "Focused";
      } 
      
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
    
    
    const combinedData = [...appFocusData, ...tabFocusData]
      .sort((a, b) => b.duration - a.duration);
    
    
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