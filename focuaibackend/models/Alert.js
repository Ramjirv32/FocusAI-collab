


const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, 
    required: true
  },
  is50: {
    type: Boolean,
    default: false
  },
  is20: {
    type: Boolean,
    default: false
  },
  focusScore: {
    type: Number,
    default: 0
  },
  lastTriggered: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

alertSchema.index({ userId: 1, date: 1 }, { unique: true });
alertSchema.pre('save', function(next) {
    const today = new Date().toISOString().slice(0, 10);
    const docDate = this.lastTriggered ? 
      new Date(this.lastTriggered).toISOString().slice(0, 10) : '';
    
    
    if (this.lastTriggered && docDate !== today) {
      this.is20 = false;
      this.is50 = false;
      this.focusScore = 0;
      this.date = today; 
      console.log(`🔄 Auto-reset alert flags for user ${this.userId}`);
    }
    
    next();
  });

module.exports = mongoose.model('Alert', alertSchema);
