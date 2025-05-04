const mongoose = require('mongoose');

const TabUsageSchema = new mongoose.Schema({
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
  url: {
    type: String,
    required: true
  },
  title: String,
  domain: String,
  duration: {
    type: Number,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

// Pre-save hook to extract domain from URL
TabUsageSchema.pre('save', function(next) {
  if (this.url && !this.domain) {
    try {
      this.domain = new URL(this.url).hostname;
    } catch (e) {
      this.domain = "unknown";
    }
  }
  next();
});

module.exports = mongoose.model('TabUsage', TabUsageSchema);