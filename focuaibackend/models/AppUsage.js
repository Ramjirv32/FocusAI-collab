const mongoose = require('mongoose');

const AppUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  date: {
    type: String,
    required: true
  },
  appName: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique app per user per day
AppUsageSchema.index({ userId: 1, email: 1, date: 1, appName: 1 }, { unique: true });

module.exports = mongoose.model('AppUsage', AppUsageSchema);