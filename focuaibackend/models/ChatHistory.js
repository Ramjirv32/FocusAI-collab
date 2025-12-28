const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  isUser: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  productivityData: {
    focusScore: Number,
    productiveHours: Number,
    uniqueApps: Number,
    streak: Number,
    hasProductivityData: Boolean
  }
});

const chatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'New Conversation'
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Update timestamp on save
chatHistorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate title from first user message if not set
  if (this.title === 'New Conversation' && this.messages.length > 0) {
    const firstUserMessage = this.messages.find(m => m.isUser);
    if (firstUserMessage) {
      // Use first 30 characters of first user message as title
      this.title = firstUserMessage.content.substring(0, 30);
      if (firstUserMessage.content.length > 30) this.title += '...';
    }
  }
  
  next();
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);