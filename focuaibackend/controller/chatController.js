const { Groq } = require('groq-sdk');

const groq = new Groq({
  apiKey: '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'
});

// Send message to chat
const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Simple system prompt for general conversation
    const systemPrompt = `You are FocusAI Assistant, a helpful and friendly AI assistant. 
    
You can help users with:
- General questions and conversations
- Productivity tips and advice
- Technology and work-related topics
- Planning and organization
- Motivation and encouragement

Keep your responses helpful, concise, and friendly. Use a conversational tone.`;

    // Create chat completion
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: message
        }
      ],
      model: "llama3-70b-8192",
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null
    });

    const response = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    res.json({
      success: true,
      response: response
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message 
    });
  }
};

module.exports = {
  sendMessage
};