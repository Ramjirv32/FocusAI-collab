const mongoose = require('mongoose');

const tabUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.Mixed, 
    required: true
  },
  email: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  domain: String,
  duration: {
    type: Number,
    default: 0
  },
  date: {
    type: String,
    default: () => new Date().toISOString().split('T')[0] 
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TabUsage', tabUsageSchema);