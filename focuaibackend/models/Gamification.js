const mongoose = require('mongoose');

const GamificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  email: String,
  points: {
    total: { type: Number, default: 0 },
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    monthly: { type: Number, default: 0 }
  },
  level: {
    current: { type: Number, default: 1 },
    progress: { type: Number, default: 0 },
    nextLevelAt: { type: Number, default: 1000 }
  },
  streaks: {
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null }
  },
  badges: [
    {
      badgeId: String,
      name: String,
      description: String,
      icon: String,
      rarity: String,
      category: String,
      completed: {
        type: Boolean,
        default: false
      },
      earnedDate: Date,
      points: Number,
      focusScore: Number
    }
  ],
  challenges: [
    {
      challengeId: String,
      name: String,
      description: String,
      icon: String,
      category: String,
      target: Number,
      progress: {
        type: Number,
        default: 0
      },
      reward: Number,
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: Date,
      claimed: {
        type: Boolean,
        default: false
      },
      claimedDate: Date,
      isActive: {
        type: Boolean,
        default: true
      },
      expiryDate: Date
    }
  ],
  timeline: [
    {
      type: String, // badge, challenge, improvement, streak, level
      title: String,
      description: String,
      date: {
        type: Date,
        default: Date.now
      },
      points: Number,
      level: Number,
      badgeType: String,
      focusScore: Number,
      improvement: Number,
      streak: Number,
      category: String
    }
  ],
  statistics: {
    totalFocusTime: { type: Number, default: 0 },
    totalProductiveTime: { type: Number, default: 0 },
    totalDistractionTime: { type: Number, default: 0 },
    averageFocusScore: { type: Number, default: 0 },
    sessionsCompleted: { type: Number, default: 0 }
  },
  dailyReset: { type: Date }
});

module.exports = mongoose.model('Gamification', GamificationSchema);
