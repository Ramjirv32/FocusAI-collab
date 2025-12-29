const Todo = require('../models/Todo');
const mongoose = require('mongoose');


const getTodos = async (req, res) => {
  try {
    const { completed, category, priority, startDate, endDate, overdue } = req.query;
    const filter = { userId: req.user._id };

    if (completed !== undefined) {
      filter.completed = completed === 'true';
    }
    if (category) {
      filter.category = category;
    }
    if (priority) {
      filter.priority = priority;
    }
    
    
    if (startDate && endDate) {
      filter.dueDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.completed = false;
    }

    const todos = await Todo.find(filter)
      .sort({ dueDate: 1, createdAt: -1 }) 
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
      userId: req.user._id,
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
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


const updateTodo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    
    if (updates.completed === true) {
      updates.completedAt = new Date();
    } else if (updates.completed === false) {
      updates.completedAt = null;
    }

    
    if (updates.dueDate) {
      updates.dueDate = new Date(updates.dueDate);
    }

    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: req.user._id },
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


const deleteTodo = async (req, res) => {
  try {
    const { id } = req.params;

    const todo = await Todo.findOneAndDelete({
      _id: id,
      userId: req.user._id
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


const getTodoStats = async (req, res) => {
  try {
    const userId = req.user._id;

    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    console.log('Stats calculation:', {
      userId,
      now: now.toISOString(),
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString()
    });

    const stats = await Todo.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $addFields: {
          isOverdueCalc: {
            $and: [
              { $ne: ['$dueDate', null] },
              { $lt: ['$dueDate', now] },
              { $eq: ['$completed', false] }
            ]
          },
          isDueTodayCalc: {
            $and: [
              { $ne: ['$dueDate', null] },
              { $gte: ['$dueDate', todayStart] },
              { $lte: ['$dueDate', todayEnd] },
              { $eq: ['$completed', false] }
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: ['$completed', 1, 0] } },
          pending: { $sum: { $cond: ['$completed', 0, 1] } },
          highPriority: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
          overdue: { $sum: { $cond: ['$isOverdueCalc', 1, 0] } },
          dueToday: { $sum: { $cond: ['$isDueTodayCalc', 1, 0] } }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      completed: 0,
      pending: 0,
      highPriority: 0,
      overdue: 0,
      dueToday: 0
    };

    console.log('Stats result:', result);

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


const getTodosForCalendar = async (req, res) => {
  try {
    const { year, month } = req.query;
    const userId = req.user._id;

    
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth();

    const startDate = new Date(targetYear, targetMonth, 1);
    const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);

    const todos = await Todo.find({
      userId,
      dueDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
    .sort({ dueDate: 1, priority: -1 })
    .lean();

    
    const groupedTodos = {};
    todos.forEach(todo => {
      if (todo.dueDate) {
        
        const dueDateObj = new Date(todo.dueDate);
        const year = dueDateObj.getFullYear();
        const month = String(dueDateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dueDateObj.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;
        
        console.log('Todo:', todo.title, 'Due Date:', todo.dueDate, 'Date Key:', dateKey);
        
        if (!groupedTodos[dateKey]) {
          groupedTodos[dateKey] = [];
        }
        groupedTodos[dateKey].push(todo);
      }
    });

    console.log('Grouped Todos:', Object.keys(groupedTodos));

    res.json({
      success: true,
      data: groupedTodos
    });
  } catch (error) {
    console.error('Get calendar todos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch calendar todos',
      error: error.message
    });
  }
};


const getUpcomingTodos = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const todos = await Todo.find({
      userId,
      completed: false,
      dueDate: {
        $gte: today,
        $lte: nextWeek
      }
    })
    .sort({ dueDate: 1, priority: -1 })
    .lean();

    res.json({
      success: true,
      data: todos
    });
  } catch (error) {
    console.error('Get upcoming todos error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming todos',
      error: error.message
    });
  }
};

module.exports = {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getTodoStats,
  getTodosForCalendar,
  getUpcomingTodos
};