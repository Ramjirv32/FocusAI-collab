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


router.use(auth);


router.get('/stats', getTodoStats);


router.get('/calendar', getTodosForCalendar);


router.get('/upcoming', getUpcomingTodos);


router.get('/', getTodos);


router.post('/', createTodo);


router.put('/:id', updateTodo);


router.delete('/:id', deleteTodo);

module.exports = router;