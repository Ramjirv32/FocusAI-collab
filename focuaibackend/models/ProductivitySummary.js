const mongoose = require('mongoose');

const ProductivitySummarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true,
    index: true
  },
  productiveContent: {
    type: Map,
    of: Number,
    default: new Map()
  },
  nonProductiveContent: {
    type: Map,
    of: Number,
    default: new Map()
  },
  maxProductiveApp: {
    type: String,
    default: ""
  },
  totalProductiveTime: {
    type: Number,
    default: 0
  },
  totalNonProductiveTime: {
    type: Number,
    default: 0
  },
  overallTotalUsage: {
    type: Number,
    default: 0
  },
  focusScore: {
    type: Number,
    default: 0
  },
  mostVisitedTab: {
    type: String,
    default: ""
  },
  mostUsedApp: {
    type: String,
    default: ""
  },
  distractionApps: {
    type: Map,
    of: Number,
    default: new Map()
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ProductivitySummarySchema.index({ userId: 1, email: 1, date: 1 }, { unique: true });

ProductivitySummarySchema.methods.calculateFocusScore = function () {
  if (this.overallTotalUsage === 0) return 0;
  return Math.round((this.totalProductiveTime / this.overallTotalUsage) * 100);
};

ProductivitySummarySchema.statics.sanitizeAppName = function (appName) {
  return appName.replace(/\./g, '_');
};

ProductivitySummarySchema.statics.restoreAppName = function (sanitizedAppName) {
  return sanitizedAppName.replace(/_/g, '.');
};

ProductivitySummarySchema.methods.getFormattedContent = function () {
  const restoreMap = (map) => {
    const restored = {};
    for (let [key, value] of map) {
      restored[ProductivitySummarySchema.statics.restoreAppName(key)] = value;
    }
    return restored;
  };

  return {
    productiveContent: restoreMap(this.productiveContent),
    nonProductiveContent: restoreMap(this.nonProductiveContent),
    distractionApps: restoreMap(this.distractionApps)
  };
};

ProductivitySummarySchema.methods.updateProductivityData = function (appName, duration, classification) {
  const sanitizedAppName = appName.replace(/\./g, '_');

  if (classification === 'non-productive') {
    const currentValue = this.nonProductiveContent.get(sanitizedAppName) || 0;
    this.nonProductiveContent.set(sanitizedAppName, currentValue + duration);
    this.totalNonProductiveTime += duration;
  } else {
    // Default to productive for everything else
    const currentValue = this.productiveContent.get(sanitizedAppName) || 0;
    this.productiveContent.set(sanitizedAppName, currentValue + duration);
    this.totalProductiveTime += duration;
  }

  this.overallTotalUsage += duration;
  this.focusScore = this.calculateFocusScore();

  let maxApp = "";
  let maxTime = 0;
  for (let [app, time] of this.productiveContent) {
    if (time > maxTime) {
      maxTime = time;
      maxApp = app;
    }
  }
  this.maxProductiveApp = maxApp;

  const allApps = new Map([...this.productiveContent, ...this.nonProductiveContent]);
  let mostUsedApp = "";
  let mostUsedTime = 0;
  for (let [app, time] of allApps) {
    if (time > mostUsedTime) {
      mostUsedTime = time;
      mostUsedApp = app;
    }
  }
  this.mostUsedApp = mostUsedApp;

  this.lastUpdated = new Date();
};

module.exports = mongoose.model('ProductivitySummary', ProductivitySummarySchema);
