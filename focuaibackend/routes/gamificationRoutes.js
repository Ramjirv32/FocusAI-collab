const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Gamification = require('../models/Gamification');
const UserProfile = require('../models/UserProfile');
const ProductivitySummary = require('../models/ProductivitySummary');
const gamificationController = require('../controller/gamificationController');


router.get('/stats', auth, gamificationController.getStats);
router.get('/data', auth, gamificationController.getGamificationData);
router.post('/streak/claim', auth, gamificationController.claimStreakBadge);


router.get('/achievements', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    
    const gamificationData = await Gamification.findOne({ userId });

    if (!gamificationData) {
      return res.json({ success: true, achievements: [] });
    }

    
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
        type: determineBadgeType(challenge.reward) 
      }));

    
    const badgeAchievements = gamificationData.badges.map(badge => ({
      id: badge.badgeId,
      name: badge.name,
      description: badge.description,
      completed: true,
      progress: 100,
      maxProgress: 100,
      dateCompleted: badge.earnedDate,
      pointsAwarded: 0, 
      claimed: true, 
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


router.get('/challenges', auth, gamificationController.getChallenges);


router.get('/leaderboard', auth, async (req, res) => {
  try {
    
    const userSummary = await ProductivitySummary.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: "$userId",
          averageFocusScore: { $avg: "$focusScore" },
          totalProductiveTime: { $sum: "$totalProductiveTime" },
          sessionsCount: { $sum: 1 }
        }
      }
    ]);

    const userId = req.user._id;
    const userGamification = await Gamification.findOne({ userId }).lean();
    const userProfile = await UserProfile.findOne({ userId }).lean();

    const averageFocusScore = userSummary.length > 0 ? (userSummary[0].averageFocusScore || 0) : 0;
    const totalProductiveTime = userSummary.length > 0 ? (userSummary[0].totalProductiveTime || 0) : 0;
    const sessionsCount = userSummary.length > 0 ? (userSummary[0].sessionsCount || 0) : 0;

    
    const leaderboard = [{
      id: userId.toString(),
      position: 1,
      name: (userProfile?.displayName || req.user.email.split('@')[0]) + " (You)",
      avatar: userProfile?.profilePhoto || `https://api.dicebear.com/6.x/avataaars/svg?seed=${req.user.email}`,
      level: userGamification?.level?.current || 1,
      points: userGamification?.points?.total || 0,
      streak: userGamification?.streaks?.current || 0,
      focusScore: Math.round(averageFocusScore),
      productiveTime: Math.round(totalProductiveTime / 60),
      sessionsCount: sessionsCount,
      isCurrentUser: true
    }];

    res.json({
      success: true,
      leaderboard,
      userRank: 1
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});


router.post('/challenge/complete', auth, async (req, res) => {
  try {
    const { challengeId } = req.body;
    const userId = req.user._id;

    
    let gamification = await Gamification.findOne({ userId });

    if (!gamification) {
      return res.status(404).json({
        success: false,
        error: 'No gamification data found for user'
      });
    }

    
    const challengeIndex = gamification.challenges.findIndex(c =>
      c.challengeId === challengeId && !c.completed
    );

    if (challengeIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Challenge not found or already completed'
      });
    }

    
    gamification.challenges[challengeIndex].completed = true;
    gamification.challenges[challengeIndex].completedAt = new Date();

    
    const pointsAwarded = gamification.challenges[challengeIndex].reward || 0;
    gamification.points.total += pointsAwarded;
    gamification.points.daily += pointsAwarded;
    gamification.points.weekly += pointsAwarded;
    gamification.points.monthly += pointsAwarded;

    
    
    const prevLevel = gamification.level.current;
    if (prevLevel < 5) {
      gamification.level.current += 1;
      const newLevel = gamification.level.current;

      const levelNames = {
        1: 'Bronze',
        2: 'Silver',
        3: 'Gold',
        4: 'Platinum',
        5: 'Diamond'
      };

      
      gamification.badges.push({
        badgeId: `level_${newLevel}`,
        name: `${levelNames[newLevel]} Level Achieved`,
        description: `Congratulations! You have reached the ${levelNames[newLevel]} tier.`,
        icon: 'Trophy',
        rarity: levelNames[newLevel].toLowerCase(),
        earnedDate: new Date(),
        points: newLevel * 100
      });

      
      gamification.level.nextLevelAt = 1000 * newLevel;
    }

    await gamification.save();

    
    res.json({
      success: true,
      challenge: gamification.challenges[challengeIndex],
      pointsAwarded,
      newLevel: gamification.level.current,
      leveledUp: gamification.level.current > prevLevel,
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


router.get('/timeline', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    
    const gamification = await Gamification.findOne({ userId });
    if (!gamification) {
      return res.json({ success: true, timeline: [] });
    }

    
    const summaries = await ProductivitySummary.find({
      userId
    }).sort({ date: -1 }).limit(30).lean();

    const timeline = [];

    
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

    
    let lastFocusScore = 0;
    summaries.forEach(summary => {
      if (summary.focusScore > lastFocusScore + 15) {
        
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


router.post('/challenges/:challengeId/join', auth, gamificationController.joinChallenge);


function calculateNextLevelPoints(currentLevel) {
  
  const basePoints = 100;
  const nextLevel = currentLevel + 1;
  return Math.floor(basePoints * Math.pow(nextLevel, 2));
}

function calculateProgressPercentage(currentPoints, currentLevel) {
  const nextLevelPoints = calculateNextLevelPoints(currentLevel);
  const currentLevelPoints = calculateNextLevelPoints(currentLevel - 1);
  const pointsNeeded = nextLevelPoints - currentLevelPoints;
  const pointsAchieved = Math.max(0, currentPoints - currentLevelPoints);

  
  const percentage = Math.min(100, Math.max(0, Math.floor((pointsAchieved / pointsNeeded) * 100)));

  return percentage;
}


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


router.get('/heatmap', auth, gamificationController.getHeatmapData);

module.exports = router;
