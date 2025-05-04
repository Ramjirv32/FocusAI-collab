const mongoose = require('mongoose');

const BrowserTabUsageSchema = new mongoose.Schema({
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
  browser: {
    type: String,
    required: true,
    default: 'Chrome'
  },
  url: {
    type: String,
    required: true
  },
  title: String,
  domain: String,
  favicon: String,
  duration: {
    type: Number,
    default: 0
  },
  date: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Extract domain from URL
BrowserTabUsageSchema.pre('save', function(next) {
  if (this.url) {
    try {
      // Handle URLs with or without protocol
      let url = this.url;
      if (!url.startsWith('http') && !url.startsWith('file:')) {
        url = 'http://' + url;
      }
      
      const parsedUrl = new URL(url);
      this.domain = parsedUrl.hostname;
      
      // Remove www. prefix for better grouping
      if (this.domain.startsWith('www.')) {
        this.domain = this.domain.substring(4);
      }
      
      // Set favicon if not already set
      if (!this.favicon) {
        this.favicon = `https://www.google.com/s2/favicons?domain=${this.domain}`;
      }
    } catch (e) {
      console.error('Error parsing URL:', this.url, e);
      this.domain = "unknown";
    }
  }
  next();
});

// Add indexes for better query performance
BrowserTabUsageSchema.index({ userId: 1, email: 1, date: 1 });
BrowserTabUsageSchema.index({ userId: 1, browser: 1, domain: 1 });

module.exports = mongoose.model('BrowserTabUsage', BrowserTabUsageSchema);