const mongoose = require('mongoose');

const ChallengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'one-time'],
    default: 'daily'
  },
  difficulty: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'diamond', 'platinum', 'master', 'legendary'],
    default: 'bronze'
  },
  points: {
    type: Number,
    default: 100
  },
  targetValue: {
    type: Number,
    required: true
  },
  metricUnit: {
    type: String,
    default: 'points'
  },
  icon: {
    type: String,
    default: 'Trophy'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: () => new Date(+new Date() + 7*24*60*60*1000) 
  },
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['focus', 'productivity', 'consistency', 'time', 'learning'],
    default: 'focus'
  },
  usersInProgress: {
    type: Number,
    default: 0
  },
  usersCompleted: {
    type: Number,
    default: 0
  },
  featuredChallenge: {
    type: Boolean,
    default: false
  },
  userProgress: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    progress: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedDate: Date,
    startedDate: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Challenge', ChallengeSchema);