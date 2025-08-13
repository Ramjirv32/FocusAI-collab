const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gamification = require('../models/Gamification');
const UserProfile = require('../models/UserProfile');
const ProductivitySummary = require('../models/ProductivitySummary');
const gamificationController = require('../controller/gamificationController');

/**
 * @route   GET /api/gamification/stats
 * @desc    Get user's gamification stats
 * @access  Private
 */
router.get('/stats', auth, gamificationController.getStats);

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get user's achievements
 * @access  Private
 */
router.get('/achievements', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find the user's gamification data
    const gamificationData = await Gamification.findOne({ userId });
    
    if (!gamificationData) {
      return res.json({ success: true, achievements: [] });
    }
    
    // Map challenges to achievements format for frontend
    const achievements = gamificationData.challenges
      .filter(challenge => challenge.completed)
      .map(challenge => ({
        id: challenge.challengeId,
        name: challenge.name,
        description: challenge.description,
        completed: challenge.completed,
        progress: challenge.progress,
        maxProgress: challenge.target,
        dateCompleted: challenge.completedAt,
        pointsAwarded: challenge.reward,
        claimed: challenge.claimed || false,
        category: challenge.category || 'focus',
        icon: challenge.icon || 'trophy',
        type: determineBadgeType(challenge.reward) // Helper function to determine badge type
      }));
    
    // Add badges as achievements too
    const badgeAchievements = gamificationData.badges.map(badge => ({
      id: badge.badgeId,
      name: badge.name,
      description: badge.description,
      completed: true,
      progress: 100,
      maxProgress: 100,
      dateCompleted: badge.earnedDate,
      pointsAwarded: 0, // Badges don't have points in this model
      claimed: true, // Badges are automatically claimed
      category: badge.category || 'badge',
      icon: badge.icon || 'award',
      type: badge.rarity || 'bronze'
    }));
    
    res.json({ success: true, achievements: [...achievements, ...badgeAchievements] });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   GET /api/gamification/challenges
 * @desc    Get user's challenges
 * @access  Private
 */
router.get('/challenges', auth, gamificationController.getChallenges);

/**
 * @route   GET /api/gamification/leaderboard
 * @desc    Get leaderboard data based on user productivity
 * @access  Private
 */
router.get('/leaderboard', auth, async (req, res) => {
  try {
    // Get top users based on focus score and productivity data
    const topUsers = await ProductivitySummary.aggregate([
      // Group by userId and calculate average focus score
      {
        $group: {
          _id: "$userId",
          email: { $first: "$email" },
          averageFocusScore: { $avg: "$focusScore" },
          totalProductiveTime: { $sum: "$totalProductiveTime" },
          sessionsCount: { $sum: 1 }
        }
      },
      // Sort by average focus score in descending order
      { $sort: { averageFocusScore: -1, totalProductiveTime: -1 } },
      // Limit to top 10 users
      { $limit: 10 }
    ]);
    
    // Get gamification data for these users
    const userIds = topUsers.map(user => user._id);
    const gamificationData = await Gamification.find({ 
      userId: { $in: userIds } 
    }).lean();
    
    // Create a lookup map for gamification data
    const gamificationMap = {};
    gamificationData.forEach(data => {
      gamificationMap[data.userId.toString()] = data;
    });
    
    // Get user profiles for names and avatars
    const userProfiles = await UserProfile.find({ 
      userId: { $in: userIds } 
    }).lean();
    
    // Create a lookup map for profile data
    const profileMap = {};
    userProfiles.forEach(profile => {
      profileMap[profile.userId.toString()] = profile;
    });
    
    // Format leaderboard with real data
    const leaderboard = topUsers.map((user, index) => {
      const gamification = gamificationMap[user._id.toString()] || {};
      const profile = profileMap[user._id.toString()] || {};
      
      return {
        id: user._id.toString(),
        position: index + 1,
        name: profile.displayName || user.email.split('@')[0],
        avatar: profile.profilePhoto || `https://api.dicebear.com/6.x/avataaars/svg?seed=${user.email}`,
        level: gamification.level?.current || 1,
        points: gamification.points?.total || 0,
        streak: gamification.streaks?.current || 0,
        focusScore: Math.round(user.averageFocusScore || 0),
        productiveTime: Math.round((user.totalProductiveTime || 0) / 60), // Convert to minutes
        sessionsCount: user.sessionsCount || 0
      };
    });
    
    // Find current user's position in the leaderboard
    const userId = req.user._id.toString();
    const userIndex = leaderboard.findIndex(entry => entry.id === userId);
    let userRank = userIndex + 1;
    
    // If user is not in top 10, find their actual rank
    if (userIndex === -1) {
      const userSummary = await ProductivitySummary.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: "$userId",
            averageFocusScore: { $avg: "$focusScore" },
            totalProductiveTime: { $sum: "$totalProductiveTime" }
          }
        }
      ]);
      
      if (userSummary.length > 0) {
        const averageFocusScore = userSummary[0].averageFocusScore || 0;
        
        // Count users with better focus scores
        const betterUsers = await ProductivitySummary.aggregate([
          {
            $group: {
              _id: "$userId",
              averageFocusScore: { $avg: "$focusScore" }
            }
          },
          { $match: { averageFocusScore: { $gt: averageFocusScore } } },
          { $count: "count" }
        ]);
        
        userRank = betterUsers.length > 0 ? betterUsers[0].count + 1 : 1;
        
        // Add current user to the leaderboard if not already present
        const userGamification = await Gamification.findOne({ userId }).lean();
        const userProfile = await UserProfile.findOne({ userId }).lean();
        
        // Add user to leaderboard with special flag
        leaderboard.push({
          id: userId,
          position: userRank,
          name: (userProfile?.displayName || req.user.email.split('@')[0]) + " (You)",
          avatar: userProfile?.profilePhoto || `https://api.dicebear.com/6.x/avataaars/svg?seed=${req.user.email}`,
          level: userGamification?.level?.current || 1,
          points: userGamification?.points?.total || 0,
          streak: userGamification?.streaks?.current || 0,
          focusScore: Math.round(averageFocusScore),
          productiveTime: Math.round((userSummary[0].totalProductiveTime || 0) / 60),
          isCurrentUser: true
        });
      }
    }
    
    res.json({ 
      success: true, 
      leaderboard,
      userRank
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @route   POST /api/gamification/challenge/complete
 * @desc    Complete a challenge manually or check automatic completion
 * @access  Private
 */
router.post('/challenge/complete', auth, async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user._id;
    
    // Find user's gamification data
    let gamification = await Gamification.findOne({ userId });
    
    if (!gamification) {
      return res.status(404).json({ 
        success: false, 
        error: 'No gamification data found for user' 
      });
    }
    
    // Find the challenge
    const challengeIndex = gamification.challenges.findIndex(c => 
      c.challengeId === challengeId && !c.completed
    );
    
    if (challengeIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Challenge not found or already completed' 
      });
    }
    
    // Complete the challenge
    gamification.challenges[challengeIndex].completed = true;
    gamification.challenges[challengeIndex].completedAt = new Date();
    
    // Award points
    const pointsAwarded = gamification.challenges[challengeIndex].reward || 0;
    gamification.points.total += pointsAwarded;
    gamification.points.daily += pointsAwarded;
    gamification.points.weekly += pointsAwarded;
    gamification.points.monthly += pointsAwarded;
    
    // Check for level up (simple formula: level = 1 + sqrt(points/100))
    const prevLevel = gamification.level.current;
    const newLevel = Math.floor(1 + Math.sqrt(gamification.points.total / 100));
    const leveledUp = newLevel > prevLevel;
    
    if (leveledUp) {
      gamification.level.current = newLevel;
      
      // Add a level-up badge if it's a significant level
      if (newLevel % 5 === 0) {
        gamification.badges.push({
          badgeId: `level_${newLevel}`,
          name: `Level ${newLevel} Achieved`,
          description: `Reached level ${newLevel} in the gamification system`,
          icon: 'Trophy',
          rarity: newLevel <= 10 ? 'bronze' : newLevel <= 20 ? 'silver' : newLevel <= 30 ? 'gold' : 'platinum',
          earnedDate: new Date(),
          points: newLevel * 50
        });
      }
    }
    
    await gamification.save();
    
    // Return the updated challenge information
    res.json({
      success: true,
      challenge: gamification.challenges[challengeIndex],
      pointsAwarded,
      newLevel: gamification.level.current,
      leveledUp,
      currentPoints: gamification.points.total
    });
    
  } catch (error) {
    console.error('Error completing challenge:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete challenge' 
    });
  }
});

/**
 * @route   GET /api/gamification/timeline
 * @desc    Get user's gamification timeline events
 * @access  Private
 */
router.get('/timeline', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Get user's gamification data
    const gamification = await Gamification.findOne({ userId });
    if (!gamification) {
      return res.json({ success: true, timeline: [] });
    }
    
    // Get productivity summaries for timeline data
    const summaries = await ProductivitySummary.find({ 
      userId 
    }).sort({ date: -1 }).limit(30).lean();
    
    const timeline = [];
    
    // Add badge achievements to timeline
    gamification.badges.forEach(badge => {
      timeline.push({
        id: `badge_${badge.badgeId}`,
        type: 'badge',
        title: `Earned ${badge.name}`,
        description: badge.description,
        icon: badge.icon || 'Award',
        date: badge.earnedDate || new Date(),
        category: badge.category || 'achievement',
        points: badge.points || 0,
        level: gamification.level.current,
        badgeType: badge.rarity
      });
    });
    
    // Add completed challenges to timeline
    gamification.challenges.filter(c => c.completed).forEach(challenge => {
      timeline.push({
        id: `challenge_${challenge.challengeId}`,
        type: 'challenge',
        title: `Completed ${challenge.name}`,
        description: challenge.description,
        icon: 'Target',
        date: challenge.completedAt || new Date(),
        category: challenge.category || 'challenge',
        points: challenge.reward || 0,
        progress: challenge.progress,
        target: challenge.target
      });
    });
    
    // Add significant focus score improvements
    let lastFocusScore = 0;
    summaries.forEach(summary => {
      if (summary.focusScore > lastFocusScore + 15) {
        // Significant improvement (15% or more)
        timeline.push({
          id: `focus_${summary.date}`,
          type: 'improvement',
          title: 'Focus Score Improvement',
          description: `Improved focus score to ${Math.round(summary.focusScore)}%`,
          icon: 'TrendingUp',
          date: new Date(summary.date),
          category: 'focus',
          focusScore: Math.round(summary.focusScore),
          improvement: Math.round(summary.focusScore - lastFocusScore)
        });
      }
      lastFocusScore = summary.focusScore;
    });
    
    // Add streak milestones
    if (gamification.streaks.current >= 3) {
      timeline.push({
        id: `streak_${gamification.streaks.current}`,
        type: 'streak',
        title: `${gamification.streaks.current} Day Streak!`,
        description: `Maintained productivity for ${gamification.streaks.current} consecutive days`,
        icon: 'Flame',
        date: gamification.streaks.lastActiveDate || new Date(),
        category: 'streak',
        streak: gamification.streaks.current
      });
    }
    
    // Sort timeline by date (newest first)
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Add this endpoint for joining challenges
router.post('/challenges/:challengeId/join', auth, gamificationController.joinChallenge);

// Helper functions
function calculateNextLevelPoints(currentLevel) {
  // Formula: base points × (level multiplier)²
  const basePoints = 100;
  const nextLevel = currentLevel + 1;
  return Math.floor(basePoints * Math.pow(nextLevel, 2));
}

function calculateProgressPercentage(currentPoints, currentLevel) {
  const nextLevelPoints = calculateNextLevelPoints(currentLevel);
  const currentLevelPoints = calculateNextLevelPoints(currentLevel - 1);
  const pointsNeeded = nextLevelPoints - currentLevelPoints;
  const pointsAchieved = Math.max(0, currentPoints - currentLevelPoints);
  
  // Calculate percentage, ensuring it stays between 0-100
  const percentage = Math.min(100, Math.max(0, Math.floor((pointsAchieved / pointsNeeded) * 100)));
  
  return percentage;
}

// Helper function to determine badge type based on reward points
function determineBadgeType(points) {
  if (!points) return 'bronze';
  
  if (points >= 1000) return 'legendary';
  if (points >= 750) return 'master';
  if (points >= 500) return 'diamond';
  if (points >= 300) return 'platinum';
  if (points >= 200) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
}

module.exports = router;
