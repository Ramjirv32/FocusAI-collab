import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Award, Star, Calendar, TrendingUp, Medal, Crown, SendHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getFallbackResponse, getMockProductivityMetrics } from '@/services/productivityAssistantService';

const ChatAssistant = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Hi! I\'m FocusAI, your productivity assistant. How can I help you improve your productivity today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [productivityMetrics, setProductivityMetrics] = useState({
    productivityScore: 91,
    distractedScore: 22,
    distractedApps: ['Twitter', 'YouTube', 'Instagram'],
    productiveApps: ['VS Code', 'GitHub', 'Notion', 'Slack'],
    focusTime: '3h 45m',
    totalBrowsingTime: '5h 30m'
  });

  // Function to handle sending messages to the AI assistant
  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    // Add user message to chat
    const userMessage = inputMessage;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      // In a real implementation, you'd fetch this from your API
      // For now, we'll use mock data
      const metrics = {
        productivityScore: productivityMetrics.productivityScore,
        distractedScore: productivityMetrics.distractedScore,
        distractedApps: productivityMetrics.distractedApps,
        productiveApps: productivityMetrics.productiveApps,
        focusTime: productivityMetrics.focusTime,
        totalBrowsingTime: productivityMetrics.totalBrowsingTime
      };
      
      // Format the prompt with user metrics for the Phi model
      const prompt = `
You are FocusAI, a friendly productivity assistant. 

User question: "${userMessage}"

User's productivity metrics:
- Productivity Score: ${metrics.productivityScore}/100
- Distracted Score: ${metrics.distractedScore}/100
- Productive Apps: ${metrics.productiveApps.join(', ')}
- Distracting Apps: ${metrics.distractedApps.join(', ')}
- Focus Time Today: ${metrics.focusTime}
- Total Browsing Time: ${metrics.totalBrowsingTime}

Instructions:
- If user greets you (hi, hello, hey), respond warmly as FocusAI
- For productivity questions, reference their specific score of ${metrics.productivityScore}%
- For improvement requests, suggest specific actions based on their distracting apps
- Always be encouraging and provide actionable advice
- Keep responses concise but helpful

Respond as FocusAI:
`;

      try {
        // Try to call Ollama API
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'phi',
            prompt: prompt,
            stream: false
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } else {
          throw new Error('Failed to get response from Ollama');
        }
      } catch (error) {
        console.error('Error communicating with Ollama:', error);
        // Use the enhanced fallback response
        const fallbackResponse = getFallbackResponse(userMessage, metrics);
        setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle clicking on suggested questions
  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
    // Optionally auto-send the message
    setTimeout(() => {
      if (question) {
        setMessages(prev => [...prev, { role: 'user', content: question }]);
        setInputMessage('');
        setIsLoading(true);
        
        // Use fallback response for demonstration
        const fallbackResponse = getFallbackResponse(question, productivityMetrics);
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }]);
          setIsLoading(false);
        }, 1000);
      }
    }, 100);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
  };

  // Handle pressing Enter to send message
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">AI Productivity Assistant</h2>
          <p className="text-muted-foreground">
            Get personalized productivity advice and insights from your AI assistant
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle>Productivity Assistant</CardTitle>
                <CardDescription>
                  Ask questions about your productivity or get advice
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 bg-muted/30 rounded-md p-4 mb-4 overflow-auto">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      message.role === 'assistant' ? (
                        // AI Message
                        <div key={index} className="flex gap-3 max-w-[80%]">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                            <Trophy className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm whitespace-pre-line">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      ) : (
                        // User Message
                        <div key={index} className="flex flex-row-reverse gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <div className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                            <p className="text-sm">
                              {message.content}
                            </p>
                          </div>
                        </div>
                      )
                    ))}
                    
                    {isLoading && (
                      <div className="flex gap-3 max-w-[80%]">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <p className="text-sm">Thinking...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Message Input */}
                <div className="flex gap-2">
                  <Input 
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask something about your productivity..." 
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={isLoading || !inputMessage.trim()}
                    className="flex items-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
                    <span>Send</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Suggested Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button 
                  onClick={() => handleSuggestedQuestion('Hello')}
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm"
                >
                  Hello (Try greeting FocusAI)
                </button>
                <button 
                  onClick={() => handleSuggestedQuestion('What is my productivity score?')}
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm"
                >
                  What is my productivity score?
                </button>
                <button 
                  onClick={() => handleSuggestedQuestion('How can I improve my productivity?')}
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm"
                >
                  How can I improve my productivity?
                </button>
                <button 
                  onClick={() => handleSuggestedQuestion('What apps distract me the most?')}
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm"
                >
                  What apps distract me the most?
                </button>
                <button 
                  onClick={() => handleSuggestedQuestion('Give me a productivity tip')}
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm"
                >
                  Give me a productivity tip
                </button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Productivity Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-1" />
                  <p className="text-sm">Take regular breaks to maintain high focus levels</p>
                </div>
                <div className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-1" />
                  <p className="text-sm">Block distracting apps during your peak productivity hours</p>
                </div>
                <div className="flex items-start gap-2">
                  <Star className="h-4 w-4 text-yellow-500 mt-1" />
                  <p className="text-sm">Group similar tasks together to reduce context switching</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ChatAssistant;
