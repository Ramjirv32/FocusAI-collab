
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Gamification = require('../models/Gamification');
const Challenge = require('../models/Challenge');


async function setRandomChallengeProgress(email) {
  try {
    console.log(`Setting random challenge progress for user: ${email}`);
    
    
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User not found: ${email}`);
      return { success: false, message: 'User not found' };
    }
    
    
    let gamificationData = await Gamification.findOne({ userId: user._id });
    if (!gamificationData) {
      console.log(`Creating new gamification data for user ${email}`);
      gamificationData = new Gamification({
        userId: user._id,
        email,
        points: { total: 0 },
        level: { current: 1 },
        challenges: [],
        streaks: { current: 0, longest: 0 }
      });
    }
    
    
    const allChallenges = await Challenge.find({ isActive: true });
    console.log(`Found ${allChallenges.length} active challenges`);
    
    
    for (const challenge of allChallenges) {
      
      let userChallenge = gamificationData.challenges.find(
        c => c.challengeId?.toString() === challenge._id.toString()
      );
      
      if (!userChallenge) {
        
        userChallenge = {
          challengeId: challenge._id,
          name: challenge.title,
          description: challenge.description,
          icon: challenge.icon,
          category: challenge.category,
          target: challenge.targetValue,
          progress: 0,
          reward: challenge.points,
          completed: false,
          isActive: true,
          claimedDate: null,
          completedAt: null,
          claimed: false
        };
        gamificationData.challenges.push(userChallenge);
      }
      
      
      const minProgress = Math.floor(challenge.targetValue * 0.1);
      const maxProgress = Math.floor(challenge.targetValue * 0.9);
      userChallenge.progress = Math.floor(Math.random() * (maxProgress - minProgress + 1)) + minProgress;
      
      console.log(`Challenge "${challenge.title}": ${userChallenge.progress}/${challenge.targetValue} (${Math.round((userChallenge.progress/challenge.targetValue)*100)}%)`);
    }
    
    
    await gamificationData.save();
    
    console.log(`Successfully set random progress for ${allChallenges.length} challenges`);
    return { success: true, message: `Set random progress for ${allChallenges.length} challenges` };
  } catch (error) {
    console.error('Error setting random challenge progress:', error);
    return { success: false, error: error.message };
  }
}


if (require.main === module) {
  
  mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://ramji:vikas2311@cluster0.ln4g5.mongodb.net/focuai?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
  
  
  const email = process.argv[2] || 'user@example.com';
  
  setRandomChallengeProgress(email)
    .then(result => {
      console.log(result);
      mongoose.connection.close();
      process.exit(0);
    })
    .catch(error => {
      console.error('Script failed:', error);
      mongoose.connection.close();
      process.exit(1);
    });
} else {
  
  module.exports = { setRandomChallengeProgress };
}