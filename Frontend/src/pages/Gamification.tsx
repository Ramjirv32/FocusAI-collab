import React from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Target, Award, Star, Calendar, TrendingUp, Medal, Crown } from 'lucide-react';

const Gamification = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gamification</h2>
          <p className="text-muted-foreground">
            Track your achievements and rewards for staying productive
          </p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Level
              </CardTitle>
              <Trophy className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Level 15</div>
              <p className="text-xs text-muted-foreground">
                Productivity Champion
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Experience Points
              </CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,450 XP</div>
              <div className="mt-1 space-y-1">
                <p className="text-xs text-muted-foreground">
                  750 XP to next level
                </p>
                <Progress value={76} className="h-2" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Achievements
              </CardTitle>
              <Medal className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15/42</div>
              <p className="text-xs text-muted-foreground">
                3 earned this week
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Streak
              </CardTitle>
              <Calendar className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">7 days</div>
              <p className="text-xs text-muted-foreground">
                Best: 14 days
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
            <CardDescription>Accomplishments you've unlocked</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Target className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Focus Master</h3>
                    <Badge variant="outline">500 XP</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Maintained 90% focus score for 5 consecutive days</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Productivity Wizard</h3>
                    <Badge variant="outline">250 XP</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Reduced distraction time by 30% in a week</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Early Bird</h3>
                    <Badge variant="outline">200 XP</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Started productive work before 8 AM for 3 consecutive days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Challenges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Challenges</CardTitle>
              <CardDescription>Complete these to earn bonus XP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Maintain 2 hours of focus time</span>
                  </div>
                  <Badge>100 XP</Badge>
                </div>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">1h 30m / 2h completed</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Limit social media to 30 minutes</span>
                  </div>
                  <Badge>50 XP</Badge>
                </div>
                <Progress value={40} className="h-2" />
                <p className="text-xs text-muted-foreground">18m / 30m used</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Complete 5 productive sessions</span>
                  </div>
                  <Badge>75 XP</Badge>
                </div>
                <Progress value={60} className="h-2" />
                <p className="text-xs text-muted-foreground">3 / 5 sessions completed</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>See how you compare to other users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-yellow-800">1</div>
                    <span className="font-medium">Sarah J.</span>
                  </div>
                  <div className="text-sm font-semibold">3,850 XP</div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-gray-800">2</div>
                    <span className="font-medium">Michael T.</span>
                  </div>
                  <div className="text-sm font-semibold">3,245 XP</div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b bg-blue-50">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-blue-800">3</div>
                    <span className="font-medium">You</span>
                  </div>
                  <div className="text-sm font-semibold">2,450 XP</div>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-gray-800">4</div>
                    <span className="font-medium">David L.</span>
                  </div>
                  <div className="text-sm font-semibold">2,240 XP</div>
                </div>
                
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-gray-100 w-7 h-7 rounded-full grid place-items-center text-sm font-bold text-gray-800">5</div>
                    <span className="font-medium">Emma R.</span>
                  </div>
                  <div className="text-sm font-semibold">1,980 XP</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Gamification;
