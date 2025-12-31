import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, TrendingUp, Clock, Target, Zap, Plus, Trash2, History, ArrowLeft, Square } from 'lucide-react';
import { chatService } from '../services/chatService';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { format, formatDistanceToNow } from 'date-fns';
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
interface ChatHistory {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage: Date;
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
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isLoadingHistories, setIsLoadingHistories] = useState(false);
  const [loadingHistoryId, setLoadingHistoryId] = useState<string | null>(null);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typewriterIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    loadChatHistories();
  }, []);
  const loadChatHistories = async () => {
    try {
      setIsLoadingHistories(true);
      const histories = await chatService.getChatHistories();
      setChatHistories(histories);
    } catch (error) {
      console.error('Failed to load chat histories:', error);
      toast({
        title: 'Error loading chat history',
        description: 'Could not load your previous conversations.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistories(false);
    }
  };
  const formatMinutesToHoursAndMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    } else {
      return `${mins}m`;
    }
  };
  const startTypewriterEffect = (messageId: string, fullContent: string) => {
    let currentIndex = 0;
    const typingSpeed = 15;
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
      scrollToBottom();
      if (currentIndex >= fullContent.length) {
        clearInterval(typewriterInterval);
        typewriterIntervals.current.delete(messageId);
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
  useEffect(() => {
    return () => {
      typewriterIntervals.current.forEach(interval => clearInterval(interval));
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);
  const stopResponse = () => {
    console.log('🛑 Stopping AI response...');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    typewriterIntervals.current.forEach(interval => clearInterval(interval));
    typewriterIntervals.current.clear();
    setMessages(prev => prev.map(msg => ({ ...msg, isTyping: false })));
    setIsLoading(false);
    toast({
      title: 'Response stopped',
      description: 'AI generation was interrupted.',
    });
  };
  const isAnyMessageTyping = messages.some(msg => msg.isTyping);
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
      let userData = null;
      try {
        userData = await chatService.getUserProductivityData();
        if (userData) {
          console.log('📊 Retrieved user data to send with message');
        } else {
          console.log('⚠️ No user data available to send with message');
        }
      } catch (dataError) {
        console.error('Could not fetch user productivity data:', dataError);
      }
      abortControllerRef.current = new AbortController();
      const response = await chatService.sendMessage(inputMessage, currentHistoryId, userData, abortControllerRef.current.signal);
      abortControllerRef.current = null;
      console.log('📨 Received response from AI:', response);
      if (response.success) {
        console.log('✅ Response successful, content length:', response.response.length);
        console.log('🔄 Has productivity data:', response.hasProductivityData ? 'Yes' : 'No');
        if (response.historicalDataPoints) {
          console.log('📈 Historical data points available:', response.historicalDataPoints);
        }
        if (response.historyId && !currentHistoryId) {
          setCurrentHistoryId(response.historyId);
          console.log('📝 Created new chat history with ID:', response.historyId);
          loadChatHistories();
        }
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
        setMessages(prev => [...prev, aiMessage]);
        setTimeout(() => {
          console.log('⌨️ Starting typewriter effect for message:', aiMessageId);
          startTypewriterEffect(aiMessageId, response.response);
        }, 100);
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
      } else {
        console.error('❌ Error in AI response:', response.error || 'Unknown error');
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.response || "Sorry, I'm having trouble connecting right now. Please try again.",
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
        toast({
          title: 'Error',
          description: response.error || 'Failed to get response',
          variant: 'destructive',
        });
      }
    } catch (error) {
      if (error.name === 'AbortError' || error.message === 'canceled') {
        console.log('🚫 API request was aborted by user');
        return;
      }
      console.error('❌ Failed to send message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        title: 'Connection error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 Message processing complete');
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
  const startNewChat = async () => {
    try {
      await chatService.createChatHistory();
      setMessages([{
        id: '1',
        content: "Hi! I'm your FocusAI assistant 🤖 I can analyze your real productivity data and give you personalized insights! Try asking me about your focus score, productive apps, or how to improve your productivity patterns. What would you like to know?",
        isUser: false,
        timestamp: new Date()
      }]);
      setCurrentHistoryId(null);
      await loadChatHistories();
    } catch (error) {
      console.error('Failed to start new chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to start a new chat',
        variant: 'destructive',
      });
    }
  };
  const loadChatHistory = async (historyId: string) => {
    if (loadingHistoryId) return;
    try {
      setLoadingHistoryId(historyId);
      const history = await chatService.getChatHistoryById(historyId);
      if (history && history.messages && history.messages.length > 0) {
        console.log('📜 Loading chat history with messages:', history.messages);
        const formattedMessages: Message[] = history.messages.map((msg: any) => ({
          id: msg._id || Date.now().toString() + Math.random().toString(),
          content: msg.content,
          isUser: msg.isUser,
          timestamp: new Date(msg.timestamp),
          hasProductivityData: msg.productivityData?.hasProductivityData,
          focusScore: msg.productivityData?.focusScore,
          productiveHours: msg.productivityData?.productiveHours,
          uniqueApps: msg.productivityData?.uniqueApps,
          streak: msg.productivityData?.streak,
          isTyping: false
        }));
        setMessages(formattedMessages);
        setCurrentHistoryId(historyId);
        const lastAiMessage = [...history.messages]
          .reverse()
          .find((msg: any) => !msg.isUser && msg.productivityData?.hasProductivityData);
        if (lastAiMessage && lastAiMessage.productivityData) {
          console.log('📊 Setting productivity stats from history:', lastAiMessage.productivityData);
          setUserProductivityStats({
            focusScore: lastAiMessage.productivityData.focusScore,
            productiveHours: lastAiMessage.productivityData.productiveHours,
            uniqueApps: lastAiMessage.productivityData.uniqueApps,
            streak: lastAiMessage.productivityData.streak
          });
        } else {
          setUserProductivityStats(null);
        }
        if (window.innerWidth < 768) {
          setShowSidebar(false);
        }
        toast({
          title: 'Chat history loaded',
          description: `Loaded conversation "${history.title}"`,
        });
      } else {
        console.log('⚠️ No messages found in this chat history');
        toast({
          title: 'Empty conversation',
          description: 'This chat history has no messages',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history',
        variant: 'destructive',
      });
    } finally {
      setLoadingHistoryId(null);
    }
  };
  const deleteChatHistory = async (historyId: string) => {
    try {
      await chatService.deleteChatHistory(historyId);
      if (historyId === currentHistoryId) {
        setMessages([{
          id: '1',
          content: "Hi! I'm your FocusAI assistant 🤖 I can analyze your real productivity data and give you personalized insights! Try asking me about your focus score, productive apps, or how to improve your productivity patterns. What would you like to know?",
          isUser: false,
          timestamp: new Date()
        }]);
        setCurrentHistoryId(null);
      }
      await loadChatHistories();
      toast({
        title: 'Success',
        description: 'Chat history deleted',
      });
    } catch (error) {
      console.error('Failed to delete chat history:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete chat history',
        variant: 'destructive',
      });
    }
  };
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {}
        <div
          className={`bg-gray-50 border-r border-gray-200 transition-all duration-300 overflow-hidden ${showSidebar ? 'w-72' : 'w-0'
            } md:relative fixed left-0 top-0 h-full z-20`}
        >
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Chat History</h2>
              <Button
                variant="outline"
                size="sm"
                className="w-full flex items-center justify-center gap-2"
                onClick={startNewChat}
              >
                <Plus size={16} />
                <span>New Chat</span>
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {isLoadingHistories ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              ) : chatHistories.length === 0 ? (
                <div className="text-center p-4 text-gray-500">
                  <p>No chat history yet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {chatHistories.map((history) => (
                    <div
                      key={history.id}
                      className={`p-2 rounded-md hover:bg-gray-100 cursor-pointer flex justify-between items-start group ${currentHistoryId === history.id ? 'bg-blue-50 border border-blue-100' : ''
                        }`}
                      onClick={() => loadChatHistory(history.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{history.title}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(history.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                      {loadingHistoryId === history.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                      ) : (
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChatHistory(history.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {}
                <button
                  className="md:hidden p-1.5 rounded hover:bg-gray-100"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  {showSidebar ?
                    <ArrowLeft className="h-5 w-5" /> :
                    <History className="h-5 w-5" />
                  }
                </button>
                <div className="flex items-center gap-2">
                  <Bot className="w-7 h-7 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">FocusAI Assistant</h1>
                    <p className="text-xs text-gray-500">Personalized Productivity Insights</p>
                  </div>
                </div>
              </div>
              {}
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1"
                onClick={startNewChat}
              >
                <Plus size={16} />
                <span>New</span>
              </Button>
            </div>
            {}
            {userProductivityStats && (
              <div className="mt-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">{userProductivityStats.focusScore}%</div>
                    <div className="text-xs opacity-90">Focus Score</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {formatMinutesToHoursAndMinutes(userProductivityStats.productiveHours)}
                    </div>
                    <div className="text-xs opacity-90">Productive</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{userProductivityStats.uniqueApps}</div>
                    <div className="text-xs opacity-90">Apps Used</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{userProductivityStats.streak}</div>
                    <div className="text-xs opacity-90">Day Streak</div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-2xl ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                    {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`rounded-lg p-3 shadow-sm ${message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-100'
                    }`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.isUser
                        ? message.content
                        : (message.displayedContent !== undefined ? message.displayedContent : message.content)
                      }
                      {}
                      {!message.isUser && message.isTyping && (
                        <span className="inline-block w-0.5 h-4 bg-blue-600 ml-1 animate-pulse"></span>
                      )}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs opacity-70">
                        {format(message.timestamp, 'h:mm a')}
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
                  <div className="bg-white border border-gray-100 rounded-lg p-3 shadow-sm flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-gray-600 text-sm">Analyzing your productivity data...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="max-w-4xl mx-auto flex space-x-3">
              <div className="flex-1 relative">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your productivity data..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white shadow-sm"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={(isLoading || isAnyMessageTyping) ? stopResponse : sendMessage}
                disabled={(!inputMessage.trim() && !isLoading && !isAnyMessageTyping)}
                className={`${(isLoading || isAnyMessageTyping) ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors duration-200 shadow-sm`}
                style={{ minHeight: '44px', minWidth: '44px' }}
                title={(isLoading || isAnyMessageTyping) ? "Stop Response" : "Send Message"}
              >
                {(isLoading || isAnyMessageTyping) ? <Square className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {}
            <div className="max-w-4xl mx-auto mt-3">
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => handleQuickQuestion("What's my focus score today?")}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700 border border-blue-200"
                  disabled={isLoading}
                >
                  📊 What's my focus score?
                </button>
                <button
                  onClick={() => handleQuickQuestion("Which apps do I use most?")}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700 border border-blue-200"
                  disabled={isLoading}
                >
                  🎯 Which apps do I use most?
                </button>
                <button
                  onClick={() => handleQuickQuestion("How can I improve my productivity?")}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700 border border-blue-200"
                  disabled={isLoading}
                >
                  ⚡ How can I improve?
                </button>
                <button
                  onClick={() => handleQuickQuestion("What are my distraction patterns?")}
                  className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700 border border-blue-200"
                  disabled={isLoading}
                >
                  🚫 My distraction patterns
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
export default ChatAssistant;
