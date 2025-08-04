import React from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Award, Star, Calendar, TrendingUp, Medal, Crown } from 'lucide-react';

const ChatAssistant = () => {
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
                    {/* AI Message */}
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">
                          Hello! I'm your productivity assistant. How can I help you today?
                        </p>
                      </div>
                    </div>
                    
                    {/* User Message */}
                    <div className="flex flex-row-reverse gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <div className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-primary text-primary-foreground p-3 rounded-lg">
                        <p className="text-sm">
                          What are my most productive hours today?
                        </p>
                      </div>
                    </div>
                    
                    {/* AI Response */}
                    <div className="flex gap-3 max-w-[80%]">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Trophy className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-sm">
                          Based on your activity today, your most productive hours were between 9:00 AM and 11:00 AM. You had high focus scores during this period and completed several tasks with minimal distractions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Message Input */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ask something about your productivity..." 
                    className="flex-1 px-3 py-2 border rounded-md"
                  />
                  <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
                    Send
                  </button>
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
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                  What tasks should I prioritize today?
                </button>
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                  How can I improve my focus time?
                </button>
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                  What apps distract me the most?
                </button>
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm">
                  Compare my productivity today vs. yesterday
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
