const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const voiceController = require('../controller/voiceController');

// Process voice message
router.post('/process', auth, voiceController.processVoiceMessage);

module.exports = router;