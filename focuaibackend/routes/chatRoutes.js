const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { sendMessage, getProductivityInsights } = require('../controller/chatController');

// Send message to AI assistant
router.post('/message', auth, sendMessage);


module.exports = router;