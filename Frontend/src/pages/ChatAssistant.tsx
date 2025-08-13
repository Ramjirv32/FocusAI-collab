import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { chatService } from '../services/chatService';
import DashboardLayout from '../components/Layout/DashboardLayout';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  hasProductivityData?: boolean;
  focusScore?: number;
  productiveHours?: number;
  uniqueApps?: number;
  streak?: number;
  isTyping?: boolean;
  displayedContent?: string;
}

const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi! I'm your FocusAI assistant 🤖 I can analyze your real productivity data and give you personalized insights! Try asking me about your focus score, productive apps, or how to improve your productivity patterns. What would you like to know?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProductivityStats, setUserProductivityStats] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typewriterIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Format minutes to hours and minutes
  const formatMinutesToHoursAndMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };

  // Typewriter effect function
  const startTypewriterEffect = (messageId: string, fullContent: string) => {
    let currentIndex = 0;
    const typingSpeed = 15; // Milliseconds per character (faster speed)
    
    const typewriterInterval = setInterval(() => {
      currentIndex++;
      const displayedText = fullContent.substring(0, currentIndex);
      
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === messageId 
            ? { ...msg, displayedContent: displayedText, isTyping: currentIndex < fullContent.length }
            : msg
        )
      );
      
      // Auto scroll during typing
      scrollToBottom();
      
      if (currentIndex >= fullContent.length) {
        clearInterval(typewriterInterval);
        typewriterIntervals.current.delete(messageId);
        
        // Mark typing as complete
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId 
              ? { ...msg, isTyping: false, displayedContent: fullContent }
              : msg
          )
        );
      }
    }, typingSpeed);
    
    typewriterIntervals.current.set(messageId, typewriterInterval);
  };

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      typewriterIntervals.current.forEach(interval => clearInterval(interval));
    };
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('🚀 Sending message to chat service:', inputMessage);
      const response = await chatService.sendMessage(inputMessage);
      console.log('📨 Received response:', response);
      
      if (response.success) {
        const aiMessageId = (Date.now() + 1).toString();
        const aiMessage: Message = {
          id: aiMessageId,
          content: response.response,
          isUser: false,
          timestamp: new Date(),
          hasProductivityData: response.hasProductivityData,
          focusScore: response.focusScore,
          productiveHours: response.productiveHours,
          uniqueApps: response.uniqueApps,
          streak: response.streak,
          isTyping: true,
          displayedContent: ''
        };

        // Add the message immediately with empty displayed content
        setMessages(prev => [...prev, aiMessage]);
        
        // Start typewriter effect
        setTimeout(() => {
          startTypewriterEffect(aiMessageId, response.response);
        }, 100);
        
        // Update productivity stats if available
        if (response.hasProductivityData) {
          console.log('📊 Updating productivity stats:', {
            focusScore: response.focusScore,
            productiveHours: response.productiveHours,
            uniqueApps: response.uniqueApps,
            streak: response.streak
          });
          
          setUserProductivityStats({
            focusScore: response.focusScore,
            productiveHours: response.productiveHours,
            uniqueApps: response.uniqueApps,
            streak: response.streak
          });
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInputMessage(question);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Page Header with Productivity Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bot className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">FocusAI Assistant</h1>
                <p className="text-gray-600 mt-1">Personalized Productivity Insights</p>
              </div>
            </div>
            
            {/* Productivity Stats Indicator */}
            {userProductivityStats && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{userProductivityStats.focusScore}%</div>
                    <div className="text-xs opacity-90">Focus Score</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {formatMinutesToHoursAndMinutes(userProductivityStats.productiveHours)}
                    </div>
                    <div className="text-xs opacity-90">Productive</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{userProductivityStats.uniqueApps}</div>
                    <div className="text-xs opacity-90">Apps Used</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{userProductivityStats.streak}</div>
                    <div className="text-xs opacity-90">Day Streak</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Chat Messages Area */}
          <div className="h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start space-x-2 max-w-2xl ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.isUser 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.isUser 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-50 text-gray-900 border border-gray-100'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.isUser 
                          ? message.content 
                          : (message.displayedContent !== undefined ? message.displayedContent : message.content)
                        }
                        {/* Blinking cursor for typing effect */}
                        {!message.isUser && message.isTyping && (
                          <span className="inline-block w-0.5 h-4 bg-blue-600 ml-1 animate-pulse"></span>
                        )}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                        {!message.isUser && message.hasProductivityData && !message.isTyping && (
                          <div className="flex items-center space-x-2 text-xs opacity-70">
                            <Target className="w-3 h-3" />
                            <span>Based on your data</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-gray-600" />
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-gray-600 text-sm">Analyzing your productivity data...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex space-x-3">
                <div className="flex-1 relative">
                  <textarea
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about your productivity data..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                    rows={1}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                    disabled={isLoading}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Questions - Productivity Focused */}
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-100">
          <h3 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>💡 Try these productivity questions:</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <button 
              onClick={() => handleQuickQuestion("What's my focus score today?")}
              className="text-left p-3 hover:bg-blue-100 rounded-lg text-sm text-blue-800 transition-colors border border-blue-200 hover:border-blue-300"
              disabled={isLoading}
            >
              📊 What's my focus score today?
            </button>
            <button 
              onClick={() => handleQuickQuestion("Which apps do I use most?")}
              className="text-left p-3 hover:bg-blue-100 rounded-lg text-sm text-blue-800 transition-colors border border-blue-200 hover:border-blue-300"
              disabled={isLoading}
            >
              🎯 Which apps do I use most?
            </button>
            <button 
              onClick={() => handleQuickQuestion("How can I improve my productivity?")}
              className="text-left p-3 hover:bg-blue-100 rounded-lg text-sm text-blue-800 transition-colors border border-blue-200 hover:border-blue-300"
              disabled={isLoading}
            >
              ⚡ How can I improve my productivity?
            </button>
            <button 
              onClick={() => handleQuickQuestion("Show me my productivity summary")}
              className="text-left p-3 hover:bg-blue-100 rounded-lg text-sm text-blue-800 transition-colors border border-blue-200 hover:border-blue-300"
              disabled={isLoading}
            >
              📈 Show me my productivity summary
            </button>
            <button 
              onClick={() => handleQuickQuestion("What are my distraction patterns?")}
              className="text-left p-3 hover:bg-blue-100 rounded-lg text-sm text-blue-800 transition-colors border border-blue-200 hover:border-blue-300"
              disabled={isLoading}
            >
              🚫 What are my distraction patterns?
            </button>
            <button 
              onClick={() => handleQuickQuestion("Help me plan my work schedule")}
              className="text-left p-3 hover:bg-blue-100 rounded-lg text-sm text-blue-800 transition-colors border border-blue-200 hover:border-blue-300"
              disabled={isLoading}
            >
              📅 Help me plan my work schedule
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatAssistant;
