
import axios from 'axios';
import { ChatMessage } from '@/types/chatTypes';

interface ProductivityMetrics {
  productivityScore: number;
  distractedScore: number;
  distractedApps: string[];
  productiveApps: string[];
  focusTime: string;
  totalBrowsingTime: string;
}


const getMockProductivityMetrics = (): ProductivityMetrics => {
  return {
    productivityScore: 91,
    distractedScore: 22,
    distractedApps: ['Twitter', 'YouTube', 'Instagram'],
    productiveApps: ['VS Code', 'GitHub', 'Notion', 'Slack'],
    focusTime: '3h 45m',
    totalBrowsingTime: '5h 30m'
  };
};


const getProductivityMetrics = async (): Promise<ProductivityMetrics> => {
  try {
    const response = await axios.get('/api/productivity/metrics');
    return response.data;
  } catch (error) {
    console.error('Error fetching productivity metrics:', error);
    
    return getMockProductivityMetrics();
  }
};


const sendMessageToAssistant = async (userMessage: string, metrics: ProductivityMetrics): Promise<string> => {
  try {
    
    const prompt = `
User question: "${userMessage}"

User's productivity metrics:
- Productivity Score: ${metrics.productivityScore}/100
- Distracted Score: ${metrics.distractedScore}/100
- Productive Apps: ${metrics.productiveApps.join(', ')}
- Distracting Apps: ${metrics.distractedApps.join(', ')}
- Focus Time Today: ${metrics.focusTime}
- Total Browsing Time: ${metrics.totalBrowsingTime}

Based on the above metrics, please provide helpful productivity advice to the user.
`;
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'phi',
      prompt: prompt,
      stream: false
    });

    
    return response.data.response;
  } catch (error) {
    console.error('Error communicating with Ollama:', error);
    
    return "I'm currently having trouble connecting to my AI service. Based on your metrics, you're doing fairly well with a productivity score of " + 
      metrics.productivityScore + "%. Consider limiting time on " + metrics.distractedApps.join(", ") + 
      " as these seem to be your main distractions.";
  }
};


export const sendMessageToOllama = async (
  messages: ChatMessage[],
  productivityMetrics: ProductivityMetrics
): Promise<string> => {
  try {
    
    const context = `
      Current Productivity Metrics:
      - Productivity Score: ${productivityMetrics.productivityScore}
      - Distracted Score: ${productivityMetrics.distractedScore}
      - Distracted Apps: ${productivityMetrics.distractedApps.join(', ')}
      - Productive Apps: ${productivityMetrics.productiveApps.join(', ')}
      - Focus Time: ${productivityMetrics.focusTime}
      - Total Browsing Time: ${productivityMetrics.totalBrowsingTime}
    `;

    
    let prompt = `${context}\n\nConversation History:\n`;
    
    
    messages.forEach(msg => {
      prompt += `${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}\n`;
    });
    
  
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
  
    prompt += `\nYou are FocusAI, a friendly and knowledgeable productivity assistant. 

Guidelines for responses:
- If the user greets you (hi, hello, hey), respond warmly and introduce yourself as FocusAI
- For productivity score questions, provide specific feedback based on their ${productivityMetrics.productivityScore}% score
- For improvement requests, give personalized suggestions based on their distracting apps: ${productivityMetrics.distractedApps.join(', ')}
- For focus questions, reference their current focus time: ${productivityMetrics.focusTime}
- Always be encouraging and provide actionable advice
- Keep responses concise but helpful (2-4 sentences max)
- Use the productivity metrics to give personalized advice

Current user data context:
- Productivity Score: ${productivityMetrics.productivityScore}%
- Focus Time Today: ${productivityMetrics.focusTime}
- Most Productive Apps: ${productivityMetrics.productiveApps.join(', ')}
- Most Distracting Apps: ${productivityMetrics.distractedApps.join(', ')}
    
    Human: ${lastUserMessage}
    Assistant:`;

 
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: 'phi',  
      prompt: prompt,
      stream: false
    });

    return response.data.response || 'I apologize, but I couldn\'t generate a response at this time.';
  } catch (error) {
    console.error('Error sending message to Ollama:', error);
    return 'Sorry, I encountered an error communicating with the AI model. Please check if Ollama is running locally with the Phi model installed.';
  }
};


export const getFallbackResponse = (
  userMessage: string,
  productivityMetrics: ProductivityMetrics
): string => {
  const message = userMessage.toLowerCase().trim();
  
  
  if (message.includes('hello') || message.includes('hi') || message.includes('hey') || 
      message.includes('good morning') || message.includes('good afternoon') || 
      message.includes('good evening') || message === 'hello' || message === 'hi') {
    return "Hi! I'm your FocusAI productivity assistant. I'm here to help you improve your focus and productivity. How can I assist you today?";
  }
  
  
  if (message.includes('productivity score') || message.includes('my score')) {
    if (productivityMetrics.productivityScore >= 80) {
      return `Great job! Your productivity score is ${productivityMetrics.productivityScore}%. You've been doing excellent work today with ${productivityMetrics.focusTime} of focused time. Keep up the momentum!`;
    } else if (productivityMetrics.productivityScore >= 60) {
      return `Your productivity score is ${productivityMetrics.productivityScore}%. Not bad! You've focused for ${productivityMetrics.focusTime} today. To improve, try limiting time on ${productivityMetrics.distractedApps.slice(0, 2).join(' and ')}.`;
    } else {
      return `Your productivity score is ${productivityMetrics.productivityScore}%. There's room for improvement! You've been distracted by ${productivityMetrics.distractedApps.join(', ')}. Let's work on building better focus habits.`;
    }
  }
  
  
  if (message.includes('improve') || message.includes('better') || message.includes('help')) {
    const suggestions = [
      `Block distracting apps like ${productivityMetrics.distractedApps[0]} during your peak work hours`,
      `Use your productive apps more: ${productivityMetrics.productiveApps.slice(0, 2).join(' and ')}`,
      `Set specific time blocks for focused work`,
      `Take regular breaks to maintain concentration`
    ];
    
    return `Here are some personalized suggestions to improve your productivity:\n\n• ${suggestions.slice(0, 3).join('\n• ')}\n\nYour current focus time is ${productivityMetrics.focusTime}. Let's aim to increase this gradually!`;
  }
  
  
  if (message.includes('distract') || message.includes('distracting')) {
    return `Your distraction score is ${productivityMetrics.distractedScore}%. The main culprits are ${productivityMetrics.distractedApps.join(', ')}. Try using app blockers or scheduling specific times for these apps.`;
  }
  
  
  if (message.includes('focus') || message.includes('concentrate')) {
    return `To improve focus, I recommend:\n• Limiting time on ${productivityMetrics.distractedApps[0]} and ${productivityMetrics.distractedApps[1]}\n• Using the Pomodoro technique (25min work, 5min break)\n• Creating a dedicated workspace\n• Setting clear daily goals`;
  }
  
  
  if (message.includes('apps') || message.includes('applications')) {
    return `Based on your usage:\n\n📈 Most Productive: ${productivityMetrics.productiveApps.join(', ')}\n📉 Most Distracting: ${productivityMetrics.distractedApps.join(', ')}\n\nConsider scheduling specific times for distracting apps to maintain focus.`;
  }
  
  
  if (message.includes('time') || message.includes('schedule')) {
    return `You've spent ${productivityMetrics.focusTime} in focused work out of ${productivityMetrics.totalBrowsingTime} total browsing time today. Try time-blocking your schedule and setting dedicated focus periods.`;
  }
  
  
  if (message.includes('tip') || message.includes('advice') || message.includes('suggest')) {
    const tips = [
      "Use the 2-minute rule: if a task takes less than 2 minutes, do it immediately",
      "Try the Pomodoro technique: 25 minutes of focused work followed by a 5-minute break",
      "Create a morning routine to set a productive tone for your day",
      "Use website blockers during your most productive hours",
      "Set specific goals for each work session"
    ];
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    return `💡 Productivity Tip: ${randomTip}`;
  }
  
  
  if (message.includes('thank') || message.includes('thanks')) {
    return "You're welcome! I'm always here to help you stay productive and focused. Feel free to ask me anything about your productivity habits!";
  }
  
  
  return `Hi! I'm FocusAI, your productivity assistant. I can help you with:\n\n• Analyzing your productivity score (currently ${productivityMetrics.productivityScore}%)\n• Identifying distracting apps and suggesting alternatives\n• Providing personalized focus improvement tips\n• Tracking your progress over time\n\nWhat would you like to know about your productivity today?`;
};

export {
  getProductivityMetrics,
  sendMessageToAssistant,
  getMockProductivityMetrics
};

export type {
  ProductivityMetrics
};
