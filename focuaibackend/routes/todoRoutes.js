const express = require('express');
const router = express.Router();
const {
  getTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getTodoStats,
  getTodosForCalendar,
  getUpcomingTodos
} = require('../controller/todoController');
const auth = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// GET /api/todos/stats - Get todo statistics (MUST be before /:id route)
router.get('/stats', getTodoStats);

// GET /api/todos/calendar - Get todos for calendar view
router.get('/calendar', getTodosForCalendar);

// GET /api/todos/upcoming - Get upcoming todos (next 7 days)
router.get('/upcoming', getUpcomingTodos);

// GET /api/todos - Get all todos for user
router.get('/', getTodos);

// POST /api/todos - Create new todo
router.post('/', createTodo);

// PUT /api/todos/:id - Update todo
router.put('/:id', updateTodo);

// DELETE /api/todos/:id - Delete todo
router.delete('/:id', deleteTodo);

module.exports = router;