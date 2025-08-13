const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ChatHistory = require('../models/ChatHistory');
const chatController = require('../controller/chatController');

// Get all chat histories for the logged-in user
router.get('/history', auth, async (req, res) => {
  try {
    const histories = await ChatHistory.find({ 
      userId: req.user._id 
    }).select('title createdAt updatedAt messages._id messages.isUser messages.timestamp')
      .sort({ updatedAt: -1 });
    
    // Format the response to include only necessary data
    const formattedHistories = histories.map(history => ({
      id: history._id,
      title: history.title,
      createdAt: history.createdAt,
      updatedAt: history.updatedAt,
      messageCount: history.messages.length,
      lastMessage: history.messages.length > 0 ? 
        history.messages[history.messages.length - 1].timestamp : 
        history.createdAt
    }));
    
    res.json({ success: true, histories: formattedHistories });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat histories' });
  }
});

// Get a specific chat history by ID
router.get('/history/:id', auth, async (req, res) => {
  try {
    const history = await ChatHistory.findOne({ 
      _id: req.params.id,
      userId: req.user._id 
    });
    
    if (!history) {
      return res.status(404).json({ success: false, error: 'Chat history not found' });
    }
    
    // Make sure we're returning full message data
    res.json({ 
      success: true, 
      history: {
        _id: history._id,
        title: history.title,
        createdAt: history.createdAt,
        updatedAt: history.updatedAt,
        userId: history.userId,
        email: history.email,
        messages: history.messages.map(msg => ({
          _id: msg._id,
          content: msg.content,
          isUser: msg.isUser,
          timestamp: msg.timestamp,
          productivityData: msg.productivityData
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch chat history' });
  }
});

// Create a new chat history
router.post('/history', auth, async (req, res) => {
  try {
    const { title, messages } = req.body;
    
    const chatHistory = new ChatHistory({
      userId: req.user._id,
      email: req.user.email,
      title: title || 'New Conversation',
      messages: messages || []
    });
    
    await chatHistory.save();
    
    res.status(201).json({ 
      success: true, 
      historyId: chatHistory._id,
      history: {
        id: chatHistory._id,
        title: chatHistory.title,
        createdAt: chatHistory.createdAt,
        updatedAt: chatHistory.updatedAt
      }
    });
  } catch (error) {
    console.error('Error creating chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to create chat history' });
  }
});

// Add message to existing chat history
router.post('/history/:id/message', auth, async (req, res) => {
  try {
    const { content, isUser, productivityData } = req.body;
    
    const chatHistory = await ChatHistory.findOne({ 
      _id: req.params.id,
      userId: req.user._id 
    });
    
    if (!chatHistory) {
      return res.status(404).json({ success: false, error: 'Chat history not found' });
    }
    
    chatHistory.messages.push({
      content,
      isUser,
      timestamp: new Date(),
      productivityData: productivityData || null
    });
    
    await chatHistory.save();
    
    res.json({ 
      success: true, 
      messageId: chatHistory.messages[chatHistory.messages.length - 1]._id,
      updatedAt: chatHistory.updatedAt
    });
  } catch (error) {
    console.error('Error adding message to chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to add message' });
  }
});

// Delete a chat history
router.delete('/history/:id', auth, async (req, res) => {
  try {
    const result = await ChatHistory.deleteOne({ 
      _id: req.params.id,
      userId: req.user._id 
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Chat history not found' });
    }
    
    res.json({ success: true, message: 'Chat history deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat history:', error);
    res.status(500).json({ success: false, error: 'Failed to delete chat history' });
  }
});

// IMPORTANT: The main chat endpoint that receives messages uses the chatController
router.post('/', auth, chatController.sendMessage);

module.exports = router;