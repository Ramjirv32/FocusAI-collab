const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { updateChallengeProgress } = require('../scripts/updateChallengeProgress');

/**
 * @route   POST /api/gamification/update-challenge-progress
 * @desc    Update challenge progress for the authenticated user
 * @access  Private
 */
router.post('/update-challenge-progress', auth, async (req, res) => {
  try {
    const email = req.user.email;
    
    // Optional: Allow override of user email for admin functions
    const targetEmail = req.body.email || email;
    
    // Optional: Allow manual override of activity data
    const activityData = req.body.activityData;
    
    console.log(`Updating challenge progress for ${targetEmail}`);
    
    const result = await updateChallengeProgress(targetEmail, activityData);
    
    res.json(result);
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update challenge progress',
      details: error.message
    });
  }
});

/**
 * @route   GET /api/gamification/user-challenge-progress
 * @desc    Get challenge progress for the authenticated user
 * @access  Private
 */
router.get('/user-challenge-progress', auth, async (req, res) => {
  try {
    const email = req.user.email;
    const Challenge = require('../models/Challenge');
    
    const challenges = await Challenge.find({
      'userProgress.email': email
    });
    
    const formattedChallenges = challenges.map(challenge => {
      const userProgress = challenge.userProgress.find(p => p.email === email);
      
      return {
        id: challenge._id.toString(),
        name: challenge.title,
        description: challenge.description,
        category: challenge.category,
        progress: userProgress?.currentValue || 0,
        progressPercentage: userProgress?.completionPercentage || 0,
        target: challenge.targetValue,
        completed: !!userProgress?.completedAt,
        completedAt: userProgress?.completedAt,
        points: challenge.points,
        difficulty: challenge.difficulty
      };
    });
    
    res.json({
      success: true,
      challenges: formattedChallenges
    });
  } catch (error) {
    console.error('Error fetching user challenge progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch challenge progress',
      details: error.message
    });
  }
});

module.exports = router;
