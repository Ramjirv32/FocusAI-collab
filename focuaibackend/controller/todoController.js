const Todo = require('../models/Todo');
const mongoose = require('mongoose'); // Add this import

// Get all todos for a user
const getTodos = async (req, res) => {
  try {
    const { completed, category, priority } = req.query;
    const filter = { userId: req.user._id }; // Changed from req.user.userId to req.user._id

    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }
    if (category) {
      filter.category = category;
    }
    if (priority) {
      filter.priority = priority;
    }

    const todos = await Todo.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: todos
    });
  } catch (error) {
    console.error('Get todos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todos',
      error: error.message
    });
  }
};

// Create a new todo
const createTodo = async (req, res) => {
  try {
    const { title, description, priority, dueDate, category } = req.body;

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Title is required'
      });
    }

    const todo = new Todo({
      userId: req.user._id, // Changed from req.user.userId to req.user._id
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      dueDate: dueDate || null,
      category: category || 'general'
    });

    await todo.save();

    res.status(201).json({
      success: true,
      message: 'Todo created successfully',
      data: todo
    });
  } catch (error) {
    console.error('Create todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create todo',
      error: error.message
    });
  }
};

// Update a todo
const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If marking as completed, set completedAt timestamp
    if (updates.completed === true) {
      updates.completedAt = new Date();
    } else if (updates.completed === false) {
      updates.completedAt = null;
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: req.user._id }, // Changed from req.user.userId to req.user._id
      updates,
      { new: true, runValidators: true }
    );

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    res.json({
      success: true,
      message: 'Todo updated successfully',
      data: todo
    });
  } catch (error) {
    console.error('Update todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update todo',
      error: error.message
    });
  }
};

// Delete a todo
const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findOneAndDelete({
      _id: id,
      userId: req.user._id // Changed from req.user.userId to req.user._id
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('Delete todo error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo',
      error: error.message
    });
  }
};

// Get todo statistics
const getTodoStats = async (req, res) => {
  try {
    const userId = req.user._id; // Changed from req.user.userId to req.user._id

    const stats = await Todo.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } }, // Fixed ObjectId usage
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
          pending: { $sum: { $cond: ['$completed', 0, 1] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      completed: 0,
      pending: 0,
      highPriority: 0
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get todo stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch todo statistics',
      error: error.message
    });
  }
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getTodoStats
};