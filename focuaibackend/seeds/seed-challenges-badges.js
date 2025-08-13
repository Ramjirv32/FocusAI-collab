
const mongoose = require('mongoose');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Gamification = require('../models/Gamification');
require('dotenv').config();

// Challenge definitions with detailed metadata
const CHALLENGES = [
  {
    title: 'Focus Master',
    description: 'Maintain focus score above 80% for 3 days',
    type: 'daily',
    difficulty: 'gold',
    points: 300,
    targetValue: 80,
    metricUnit: 'percentage',
    category: 'focus',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    icon: 'Target'
  },
  {
    title: 'Productivity Streak',
    description: 'Complete 4 hours of productive work for 5 consecutive days',
    type: 'weekly',
    difficulty: 'platinum',
    points: 500,
    targetValue: 5,
    metricUnit: 'days',
    category: 'productivity',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    icon: 'TrendingUp' 
  },
  {
    title: 'Distraction Fighter',
    description: 'Keep distractions under 30 minutes for a full day',
    type: 'daily',
    difficulty: 'silver',
    points: 150,
    targetValue: 30,
    metricUnit: 'minutes',
    category: 'distraction',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    icon: 'Zap'
  },
  {
    title: 'Early Bird',
    description: 'Start working before 9 AM for 3 days',
    type: 'daily',
    difficulty: 'bronze',
    points: 100,
    targetValue: 3,
    metricUnit: 'days',
    category: 'time',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    icon: 'Clock'
  },
  {
    title: 'Deep Work Master',
    description: 'Complete 2 hours of deep focus work without distractions',
    type: 'one-time',
    difficulty: 'gold',
    points: 250,
    targetValue: 120,
    metricUnit: 'minutes',
    category: 'focus',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    icon: 'BookOpen'
  },
  {
    title: 'Weekly Consistency',
    description: 'Complete at least 4 hours of productive work each day for a week',
    type: 'weekly',
    difficulty: 'diamond',
    points: 450,
    targetValue: 7,
    metricUnit: 'days',
    category: 'consistency',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
    icon: 'Calendar'
  },
  {
    title: 'Night Owl',
    description: 'Be productive after 8 PM for 3 consecutive days',
    type: 'daily',
    difficulty: 'silver',
    points: 200,
    targetValue: 3,
    metricUnit: 'days',
    category: 'time',
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    icon: 'Moon'
  }
];


mongoose.connect('mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });


async function seedChallenges() {
  try {
    // Delete existing challenges
    await Challenge.deleteMany({});
    
    // Create new challenges
    const challenges = await Challenge.insertMany(CHALLENGES);
    
    console.log(`Created ${challenges.length} challenges`);
    return challenges;
  } catch (error) {
    console.error('Error seeding challenges:', error);
    throw error;
  }
}

// Function to assign challenges to a user
async function assignChallenges(email, challenges) {
  try {
    if (!email) {
      console.log('No email provided, skipping user assignment');
      return;
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User with email ${email} not found`);
      return;
    }
    
    // Find or create gamification data for user
    let gamification = await Gamification.findOne({ userId: user._id });
    if (!gamification) {
      gamification = new Gamification({
        userId: user._id,
        email: user.email,
        points: { total: 0, daily: 0, weekly: 0, monthly: 0 },
        level: { current: 1, progress: 0, nextLevelAt: 1000 },
        badges: [],
        challenges: [],
        streaks: { current: 0, longest: 0, lastActiveDate: new Date() }
      });
    }
    
    // Add user to each challenge's userProgress
    for (const challenge of challenges) {
      // Check if user is already in the challenge
      const userInProgress = challenge.userProgress.some(p => p.email === email);
      
      if (!userInProgress) {
        challenge.userProgress.push({
          email: email,
          completionPercentage: 0,
          createdAt: new Date()
        });
        await challenge.save();
        console.log(`Added user ${email} to challenge: ${challenge.title}`);
      }
    }
    
    console.log(`Assigned challenges to user ${email}`);
  } catch (error) {
    console.error('Error assigning challenges to user:', error);
    throw error;
  }
}

// Main function
async function main() {
  try {
    const challenges = await seedChallenges();
    
    // Check if email is provided as command line argument
    const userEmail = process.argv[2];
    if (userEmail) {
      await assignChallenges(userEmail, challenges);
    }
    
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the script
main();
