const mongoose = require('mongoose');

const focusAreaSchema = new mongoose.Schema({
  category: String,
  total_duration: Number,
  activity_count: Number,
  apps: [String],
  avg_confidence: Number
}, { _id: false });

const FocusResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, // Accept both String and ObjectId
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  productivityScore: {
    type: Number,
    default: 0
  },
  focusAreas: [focusAreaSchema],
  distractionAreas: [focusAreaSchema],
  totalFocusTimeSeconds: {
    type: Number,
    default: 0
  },
  totalDistractionTimeSeconds: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure unique user per day
FocusResultSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('FocusResult', FocusResultSchema);