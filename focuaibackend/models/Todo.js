const mongoose = require('mongoose');

const todoSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  },
  category: {
    type: String,
    default: 'general',
    trim: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  
  isOverdue: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});


todoSchema.index({ userId: 1, completed: 1 });
todoSchema.index({ userId: 1, createdAt: -1 });
todoSchema.index({ userId: 1, dueDate: 1 }); 


todoSchema.virtual('overdue').get(function() {
  if (!this.dueDate || this.completed) return false;
  return this.dueDate < new Date();
});


todoSchema.pre('save', function(next) {
  if (this.dueDate && !this.completed) {
    this.isOverdue = this.dueDate < new Date();
  } else {
    this.isOverdue = false;
  }
  next();
});

module.exports = mongoose.model('Todo', todoSchema);