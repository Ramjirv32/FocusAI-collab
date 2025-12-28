const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userProfileSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  displayName: {
    type: String,
    default: ''
  },
  profilePhoto: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  jobTitle: {
    type: String,
    default: ''
  },
  company: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  preferences: {
    showInLeaderboard: {
      type: Boolean,
      default: true
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    goalReminders: {
      type: Boolean,
      default: true
    },
    todoReminders: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    totalFocusTime: {
      type: Number,
      default: 0
    },
    totalProductiveTime: {
      type: Number,
      default: 0
    },
    averageFocusScore: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    longestStreak: {
      type: Number,
      default: 0
    },
    totalSessions: {
      type: Number,
      default: 0
    },
    lastActiveDate: {
      type: Date,
      default: Date.now
    }
  },
  level: {
    totalPoints: {
      type: Number,
      default: 0
    },
    currentLevel: {
      type: Number,
      default: 1
    }
  },
  achievements: [{
    badgeId: String,
    name: String,
    description: String,
    icon: String,
    rarity: String,
    category: String,
    earnedDate: Date
  }]
}, { timestamps: true });

// Add indexes for performance
userProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('UserProfile', userProfileSchema);
