const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const focusSessionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  focusScore: {
    type: Number,
    default: 0
  },
  distractions: {
    count: {
      type: Number,
      default: 0
    },
    details: [{
      timestamp: Date,
      source: String,
      duration: Number // in seconds
    }]
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task'
  },
  notes: {
    type: String
  },
  tags: [{
    type: String
  }],
  category: {
    type: String,
    enum: ['work', 'study', 'personal', 'other'],
    default: 'work'
  }
}, { timestamps: true });

// Add indexes for performance
focusSessionSchema.index({ userId: 1 });
focusSessionSchema.index({ startTime: -1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);