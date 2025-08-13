const Gamification = require('../models/Gamification');
const UserProfile = require('../models/UserProfile');
const ProductivitySummary = require('../models/ProductivitySummary');

// Badge definitions
const BADGES = {
  'focus-master': {
    name: 'Focus Master',
    description: 'Achieve 85%+ focus score for 5 consecutive days',
    icon: '🎯',
    rarity: 'epic',
    category: 'focus',
    points: 500
  },
  'consistency-champion': {
    name: 'Consistency Champion',
    description: 'Maintain a 7-day productivity streak',
    icon: '🔥',
    rarity: 'rare',
    category: 'streak',
    points: 300
  },
  'productivity-wizard': {
    name: 'Productivity Wizard',
    description: 'Complete 40 hours of productive work',
    icon: '🧙‍♂️',
    rarity: 'legendary',
    category: 'productivity',
    points: 1000
  },
  'early-bird': {
    name: 'Early Bird',
    description: 'Start productive sessions before 8 AM for 5 days',
    icon: '🌅',
    rarity: 'common',
    category: 'time',
    points: 150
  },
  'night-owl': {
    name: 'Night Owl',
    description: 'Complete productive sessions after 10 PM for 3 days',
    icon: '🦉',
    rarity: 'common',
    category: 'time',
    points: 150
  },
  'distraction-slayer': {
    name: 'Distraction Slayer',
    description: 'Avoid distractions for 3 consecutive hours',
    icon: '⚔️',
    rarity: 'rare',
    category: 'focus',
    points: 250
  },
  'marathon-runner': {
    name: 'Marathon Runner',
    description: 'Complete 8+ hours of productive work in a day',
    icon: '🏃‍♂️',
    rarity: 'epic',
    category: 'productivity',
    points: 400
  },
  'perfectionist': {
    name: 'Perfectionist',
    description: 'Achieve 100% focus score in a session',
    icon: '💎',
    rarity: 'legendary',
    category: 'focus',
    points: 750
  }
};

// Challenge definitions
const CHALLENGE_TEMPLATES = {
  daily: [
    {
      name: 'Daily Focus Goal',
      description: 'Achieve 75%+ focus score today',
      target: 75,
      reward: 50,
      category: 'daily'
    },
    {
      name: 'Productive Hours',
      description: 'Complete 4 hours of productive work today',
      target: 240, // minutes
      reward: 75,
      category: 'daily'
    },
    {
      name: 'Minimize Distractions',
      description: 'Keep distraction time under 30 minutes today',
      target: 30,
      reward: 60,
      category: 'daily'
    },
    {
      name: 'Distraction Free',
      description: 'Keep distractions under 30 minutes today',
      target: 30,
      reward: 60,
      category: 'daily'
    }
  ],
  weekly: [
    {
      name: 'Weekly Consistency',
      description: 'Be productive for 5 days this week',
      target: 5,
      reward: 200,
      category: 'weekly'
    },
    {
      name: 'Focus Improvement',
      description: 'Improve average focus score by 10% this week',
      target: 10,
      reward: 150,
      category: 'weekly'
    }
  ]
};

const gamificationController = {
  // Get user gamification data
  async getGamificationData(req, res) {
    try {
      let gamification = await Gamification.findOne({ userId: req.user._id });
      
      if (!gamification) {
        // Create initial gamification data
        gamification = new Gamification({
          userId: req.user._id,
          email: req.user.email
        });
        
        // Add initial challenges
        gamification.challenges = generateDailyChallenges();
        await gamification.save();
      }

      // Update daily challenges if needed
      const now = new Date();
      const lastReset = gamification.dailyReset || new Date(0);
      
      if (now.toDateString() !== lastReset.toDateString()) {
        gamification.challenges = gamification.challenges.filter(c => c.category !== 'daily' || c.completed);
        gamification.challenges.push(...generateDailyChallenges());
        gamification.points.daily = 0;
        gamification.dailyReset = now;
        await gamification.save();
      }

      res.json(gamification);
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      res.status(500).json({ error: 'Failed to fetch gamification data' });
    }
  },

  // Award points for activity
  async awardPoints(req, res) {
    try {
      const { usageData, sessionData } = req.body;
      
      let gamification = await Gamification.findOne({ userId: req.user._id });
      if (!gamification) {
        gamification = new Gamification({
          userId: req.user._id,
          email: req.user.email
        });
      }

      let pointsEarned = 0;
      const updates = [];

      // Calculate points based on productivity
      if (usageData) {
        const { productiveHours = 0, focusScore = 0, distractionHours = 0 } = usageData;
        
        // Base points for productive time (10 points per hour)
        const productivePoints = Math.floor(productiveHours * 10);
        pointsEarned += productivePoints;
        
        // Bonus points for high focus score
        if (focusScore >= 90) pointsEarned += 50;
        else if (focusScore >= 80) pointsEarned += 30;
        else if (focusScore >= 70) pointsEarned += 15;
        
        // Penalty for too much distraction (but never negative)
        const distractionPenalty = Math.min(pointsEarned * 0.1, distractionHours * 5);
        pointsEarned = Math.max(0, pointsEarned - distractionPenalty);
      }

      // Update points
      gamification.points.total += pointsEarned;
      gamification.points.daily += pointsEarned;
      gamification.points.weekly += pointsEarned;
      gamification.points.monthly += pointsEarned;

      // Check for badge achievements
      const newBadges = [];
      Object.keys(BADGES).forEach(badgeKey => {
        const badge = BADGES[badgeKey];
        const hasEarned = gamification.badges.some(b => b.badgeId === badgeKey);
        
        if (!hasEarned && checkBadgeEligibility(badgeKey, gamification, usageData)) {
          gamification.badges.push({
            badgeId: badgeKey,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            rarity: badge.rarity,
            category: badge.category
          });
          pointsEarned += badge.points;
          gamification.points.total += badge.points;
          updates.push(`New badge earned: ${badge.name} (+${badge.points} points)`);
        }
      });

      // Update streak
      updateStreak(gamification);

      await gamification.save();

      // Also update user profile stats
      await updateUserProfileStats(req.user._id, gamification);

      res.json({
        pointsEarned,
        totalPoints: gamification.points.total,
        level: gamification.level.current,
        newBadges,
        updates,
        gamification
      });
    } catch (error) {
      console.error('Error awarding points:', error);
      res.status(500).json({ error: 'Failed to award points' });
    }
  },

  // Claim challenge reward
  async claimReward(req, res) {
    try {
      const { challengeId } = req.body;
      
      const gamification = await Gamification.findOne({ userId: req.user._id });
      if (!gamification) {
        return res.status(404).json({ error: 'Gamification data not found' });
      }

      const challenge = gamification.challenges.find(c => c.challengeId === challengeId);
      if (!challenge) {
        return res.status(404).json({ error: 'Challenge not found' });
      }

      if (!challenge.completed) {
        return res.status(400).json({ error: 'Challenge not completed yet' });
      }

      if (challenge.claimed) {
        return res.status(400).json({ error: 'Reward already claimed' });
      }

      // Award points
      const pointsAwarded = challenge.reward;
      gamification.points.total += pointsAwarded;
      gamification.points.daily += pointsAwarded;
      gamification.points.weekly += pointsAwarded;
      gamification.points.monthly += pointsAwarded;

      // Mark as claimed
      challenge.claimed = true;
      challenge.claimedDate = new Date();

      // Check for level up
      const newLevel = calculateLevel(gamification.points.total);
      const leveledUp = newLevel > gamification.level.current;
      if (leveledUp) {
        gamification.level.current = newLevel;
      }

      await gamification.save();

      res.json({
        pointsAwarded,
        totalPoints: gamification.points.total,
        level: gamification.level.current,
        leveledUp,
        challenge: challenge
      });
    } catch (error) {
      console.error('Error claiming reward:', error);
      res.status(500).json({ error: 'Failed to claim reward' });
    }
  },

  // Get leaderboard
  async getLeaderboard(req, res) {
    try {
      const { limit = 10, timeFrame = 'total' } = req.query;
      
      let sortField;
      switch (timeFrame) {
        case 'daily':
          sortField = { 'points.daily': -1 };
          break;
        case 'weekly':
          sortField = { 'points.weekly': -1 };
          break;
        case 'monthly':
          sortField = { 'points.monthly': -1 };
          break;
        default:
          sortField = { 'points.total': -1 };
      }

      // Get gamification data with user profiles
      const leaderboard = await Gamification.aggregate([
        {
          $lookup: {
            from: 'userprofiles',
            localField: 'userId',
            foreignField: 'userId',
            as: 'profile'
          }
        },
        {
          $match: {
            'profile.preferences.showInLeaderboard': { $ne: false }
          }
        },
        {
          $sort: sortField
        },
        {
          $limit: parseInt(limit)
        },
        {
          $project: {
            userId: 1,
            points: 1,
            level: 1,
            badges: 1,
            statistics: 1,
            'profile.displayName': 1,
            'profile.profilePhoto': 1,
            'profile.location': 1,
            'profile.jobTitle': 1,
            'profile.company': 1
          }
        }
      ]);

      res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  },

  // Get user rank
  async getUserRank(req, res) {
    try {
      const { timeFrame = 'total' } = req.query;
      
      const userGamification = await Gamification.findOne({ userId: req.user._id });
      if (!userGamification) {
        return res.json({ rank: null, total: 0 });
      }

      let compareField;
      let userValue;
      
      switch (timeFrame) {
        case 'daily':
          compareField = 'points.daily';
          userValue = userGamification.points.daily;
          break;
        case 'weekly':
          compareField = 'points.weekly';
          userValue = userGamification.points.weekly;
          break;
        case 'monthly':
          compareField = 'points.monthly';
          userValue = userGamification.points.monthly;
          break;
        default:
          compareField = 'points.total';
          userValue = userGamification.points.total;
      }

      const rank = await Gamification.countDocuments({
        [compareField]: { $gt: userValue }
      }) + 1;

      const total = await Gamification.countDocuments({});

      res.json({ rank, total, value: userValue });
    } catch (error) {
      console.error('Error getting user rank:', error);
      res.status(500).json({ error: 'Failed to get user rank' });
    }
  },

  // Get user's gamification stats
  async getStats(req, res) {
    try {
      const userId = req.user._id;
      const email = req.user.email;
      
      // Find the user's gamification data
      let gamificationData = await Gamification.findOne({ userId });
      
      // If no gamification data exists, create a new one
      if (!gamificationData) {
        gamificationData = new Gamification({
          userId,
          email,
          points: {
            total: 0,
            daily: 0,
            weekly: 0,
            monthly: 0
          },
          level: {
            current: 1,
            progress: 0,
            nextLevelAt: 1000
          },
          badges: [],
          challenges: [],
          streaks: {
            current: 0,
            longest: 0,
            lastActiveDate: new Date()
          },
          statistics: {
            totalFocusTime: 0,
            totalProductiveTime: 0,
            totalDistractionTime: 0,
            averageFocusScore: 0,
            sessionsCompleted: 0
          }
        });
        await gamificationData.save();
      }
      
      // Calculate next level points
      const nextLevelPoints = Math.floor(100 * Math.pow(gamificationData.level.current + 1, 2));
      const currentLevelPoints = Math.floor(100 * Math.pow(gamificationData.level.current, 2));
      const pointsNeeded = nextLevelPoints - currentLevelPoints;
      
      // Format response
      const stats = {
        level: gamificationData.level.current,
        points: gamificationData.points.total,
        pointsToNextLevel: nextLevelPoints - gamificationData.points.total,
        totalPointsForLevel: pointsNeeded,
        achievements: {
          total: gamificationData.badges.length + 10, // Total available achievements
          completed: gamificationData.badges.length,
        },
        challenges: {
          total: gamificationData.challenges.length,
          completed: gamificationData.challenges.filter(c => c.completed).length,
          active: gamificationData.challenges.filter(c => !c.completed).length,
        },
        streak: {
          current: gamificationData.streaks?.current || 0,
          longest: gamificationData.streaks?.longest || 0,
        },
        badges: countBadgesByRarity(gamificationData.badges)
      };
      
      res.json({ success: true, stats });
    } catch (error) {
      console.error('Error fetching gamification stats:', error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
};

// Helper functions
function generateDailyChallenges() {
  const challenges = [];
  const dailyTemplates = CHALLENGE_TEMPLATES.daily;
  
  // Select 2-3 random daily challenges
  const selectedTemplates = dailyTemplates.sort(() => 0.5 - Math.random()).slice(0, 3);
  
  selectedTemplates.forEach((template, index) => {
    challenges.push({
      challengeId: `daily_${Date.now()}_${index}`,
      name: template.name,
      description: template.description,
      category: 'daily',
      target: template.target,
      progress: 0,
      reward: template.reward,
      completed: false,
      claimed: false,
      expiryDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  });
  
  return challenges;
}

function calculateLevel(totalPoints) {
  // Level calculation: Level = floor(sqrt(totalPoints / 100)) + 1
  return Math.floor(Math.sqrt(totalPoints / 100)) + 1;
}

function checkBadgeEligibility(badgeKey, gamification, usageData) {
  // Implement badge eligibility logic
  switch (badgeKey) {
    case 'focus-master':
      return gamification.statistics.averageFocusScore >= 85;
    case 'consistency-champion':
      return gamification.streaks.current >= 7;
    case 'productivity-wizard':
      return gamification.statistics.totalProductiveTime >= 144000; // 40 hours in seconds
    default:
      return false;
  }
}

function updateStreak(gamification) {
  const today = new Date().toDateString();
  const lastActive = gamification.streaks.lastActiveDate 
    ? new Date(gamification.streaks.lastActiveDate).toDateString()
    : null;
  
  if (lastActive === today) {
    // Already counted today
    return;
  }
  
  if (lastActive === new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString()) {
    // Consecutive day
    gamification.streaks.current += 1;
    gamification.streaks.longest = Math.max(gamification.streaks.longest, gamification.streaks.current);
  } else {
    // Streak broken
    gamification.streaks.current = 1;
  }
  
  gamification.streaks.lastActiveDate = new Date();
}

async function updateUserProfileStats(userId, gamification) {
  try {
    await UserProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          'stats.totalFocusTime': gamification.statistics.totalFocusTime,
          'stats.totalProductiveTime': gamification.statistics.totalProductiveTime,
          'stats.averageFocusScore': gamification.statistics.averageFocusScore,
          'stats.currentStreak': gamification.streaks.current,
          'stats.longestStreak': gamification.streaks.longest,
          'stats.totalSessions': gamification.statistics.sessionsCompleted,
          'stats.lastActiveDate': new Date(),
          'level.totalPoints': gamification.points.total,
          'level.currentLevel': gamification.level.current,
          achievements: gamification.badges
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error updating user profile stats:', error);
  }
}

// Helper function to count badges by rarity
function countBadgesByRarity(badges) {
  const counts = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
    diamond: 0,
    master: 0,
    legendary: 0,
  };
  
  badges.forEach(badge => {
    const rarity = badge.rarity?.toLowerCase() || 'bronze';
    if (counts.hasOwnProperty(rarity)) {
      counts[rarity]++;
    } else {
      // Map other rarities to our frontend types
      switch (rarity) {
        case 'common': counts.bronze++; break;
        case 'rare': counts.silver++; break;
        case 'epic': counts.gold++; break;
        case 'legendary': counts.platinum++; break;
        default: counts.bronze++; break;
      }
    }
  });
  
  return counts;
}

module.exports = gamificationController;
