"use client"

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import {
  Trophy,
  Medal,
  Star,
  CheckCircle,
  Clock,
  Award,
  Flame,
  Target,
  Calendar,
  Zap,
  Users,
  Rocket,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Lock,
} from 'lucide-react';

// Define achievement badge types
type BadgeType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'legendary';

// Define achievement interface
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  progress: number;
  target: number;
  completed: boolean;
  completedAt?: string;
  pointsAwarded: number;
  category: string;
}

// Define challenge interface
interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: BadgeType;
  progress: number;
  target: number;
  completed: boolean;
  deadline?: string;
  completedAt?: string;
  pointsAwarded: number;
  category: string;
  isActive: boolean;
}

// Define leaderboard entry interface
interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  points: number;
  level: number;
  position: number;
  streak: number;
}

// Define user gamification stats interface
interface GamificationStats {
  level: number;
  points: number;
  pointsToNextLevel: number;
  totalPointsForLevel: number;
  achievements: {
    total: number;
    completed: number;
  };
  challenges: {
    total: number;
    completed: number;
    active: number;
  };
  streak: {
    current: number;
    longest: number;
  };
  badges: {
    bronze: number;
    silver: number;
    gold: number;
    platinum: number;
    diamond: number;
    master: number;
    legendary: number;
  };
}

const Gamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChallengeFilter, setActiveChallengeFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Function to fetch gamification data
  const fetchGamificationData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const [statsResponse, achievementsResponse, challengesResponse, leaderboardResponse] = await Promise.all([
        axios.get('http://localhost:5001/api/gamification/stats', { headers: getAuthHeader() }),
        axios.get('http://localhost:5001/api/gamification/achievements', { headers: getAuthHeader() }),
        axios.get('http://localhost:5001/api/gamification/challenges', { headers: getAuthHeader() }),
        axios.get('http://localhost:5001/api/gamification/leaderboard', { headers: getAuthHeader() }),
      ]);
      
      setStats(statsResponse.data);
      setAchievements(achievementsResponse.data);
      setChallenges(challengesResponse.data);
      setLeaderboard(leaderboardResponse.data);
    } catch (err) {
      console.error('Failed to fetch gamification data:', err);
      setError('Failed to fetch gamification data. Please try again.');
      
      // Create fallback sample data
      generateFallbackData();
    } finally {
      setIsLoading(false);
    }
  };

  // Claim achievement reward
  const claimAchievementReward = async (achievementId: string) => {
    try {
      await axios.post(
        `http://localhost:5001/api/gamification/achievements/${achievementId}/claim`, 
        {}, 
        { headers: getAuthHeader() }
      );
      
      // Update UI
      setAchievements(achievements.map(achievement => {
        if (achievement.id === achievementId) {
          return {
            ...achievement,
            claimed: true
          };
        }
        return achievement;
      }));
      
      toast({
        title: "Achievement Claimed!",
        description: `You've earned ${achievements.find(a => a.id === achievementId)?.pointsAwarded || 0} points!`,
      });
      
      // Refresh stats
      fetchGamificationData();
    } catch (err) {
      console.error('Failed to claim achievement reward:', err);
      toast({
        title: "Error",
        description: "Failed to claim achievement reward. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Join challenge function
  const joinChallenge = async (challengeId: string) => {
    try {
      await axios.post(
        `http://localhost:5001/api/gamification/challenges/${challengeId}/join`, 
        {}, 
        { headers: getAuthHeader() }
      );
      
      // Update UI
      setChallenges(challenges.map(challenge => {
        if (challenge.id === challengeId) {
          return {
            ...challenge,
            isActive: true
          };
        }
        return challenge;
      }));
      
      toast({
        title: "Challenge Joined!",
        description: "You've successfully joined the challenge. Good luck!",
      });
    } catch (err) {
      console.error('Failed to join challenge:', err);
      toast({
        title: "Error",
        description: "Failed to join challenge. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Generate fallback data for demo/development purposes
  const generateFallbackData = () => {
    // Sample stats
    setStats({
      level: 5,
      points: 2750,
      pointsToNextLevel: 750,
      totalPointsForLevel: 1000,
      achievements: {
        total: 20,
        completed: 12,
      },
      challenges: {
        total: 15,
        completed: 8,
        active: 3,
      },
      streak: {
        current: 4,
        longest: 7,
      },
      badges: {
        bronze: 7,
        silver: 3,
        gold: 1,
        platinum: 1,
        diamond: 0,
        master: 0,
        legendary: 0,
      }
    });
    
    // Sample achievements
    setAchievements([
      {
        id: 'a1',
        name: 'First Steps',
        description: 'Complete your first hour of focused work',
        icon: 'Clock',
        type: 'bronze',
        progress: 60,
        target: 60,
        completed: true,
        completedAt: '2023-05-15T10:30:00',
        pointsAwarded: 50,
        category: 'Focus',
      },
      {
        id: 'a2',
        name: 'Early Bird',
        description: 'Start working before 8 AM for 5 days',
        icon: 'Clock',
        type: 'silver',
        progress: 3,
        target: 5,
        completed: false,
        pointsAwarded: 100,
        category: 'Habits',
      },
      {
        id: 'a3',
        name: 'Focus Warrior',
        description: 'Maintain focus score above 80% for a week',
        icon: 'Target',
        type: 'gold',
        progress: 5,
        target: 7,
        completed: false,
        pointsAwarded: 200,
        category: 'Focus',
      },
      {
        id: 'a4',
        name: 'App Explorer',
        description: 'Use the extension for 30 days',
        icon: 'Calendar',
        type: 'silver',
        progress: 28,
        target: 30,
        completed: false,
        pointsAwarded: 150,
        category: 'Engagement',
      },
      {
        id: 'a5',
        name: 'Distraction Fighter',
        description: 'Reduce daily distractions by 50% for a week',
        icon: 'Zap',
        type: 'platinum',
        progress: 7,
        target: 7,
        completed: true,
        completedAt: '2023-06-02T15:45:00',
        pointsAwarded: 300,
        category: 'Focus',
      },
      {
        id: 'a6',
        name: 'Knowledge Seeker',
        description: 'Spend 10 hours on educational websites',
        icon: 'Book',
        type: 'bronze',
        progress: 6,
        target: 10,
        completed: false,
        pointsAwarded: 75,
        category: 'Learning',
      },
    ]);
    
    // Sample challenges
    setChallenges([
      {
        id: 'c1',
        name: 'Weekend Warrior',
        description: 'Complete 4 hours of focused work this weekend',
        icon: 'Calendar',
        type: 'silver',
        progress: 2.5,
        target: 4,
        completed: false,
        deadline: '2023-06-25T23:59:59',
        pointsAwarded: 150,
        category: 'Focus',
        isActive: true,
      },
      {
        id: 'c2',
        name: 'Digital Detox',
        description: 'Reduce social media usage by 30% this week',
        icon: 'Zap',
        type: 'gold',
        progress: 100,
        target: 100,
        completed: true,
        completedAt: '2023-06-10T17:20:00',
        pointsAwarded: 250,
        category: 'Wellbeing',
        isActive: false,
      },
      {
        id: 'c3',
        name: 'Morning Routine',
        description: 'Start work before 9 AM for 5 consecutive days',
        icon: 'Clock',
        type: 'bronze',
        progress: 3,
        target: 5,
        completed: false,
        deadline: '2023-06-30T08:59:59',
        pointsAwarded: 100,
        category: 'Habits',
        isActive: true,
      },
    ]);
    
    // Sample leaderboard
    setLeaderboard([
      {
        id: 'u1',
        name: 'Alex Johnson',
        points: 4250,
        level: 8,
        position: 1,
        streak: 12,
      },
      {
        id: 'u2',
        name: 'Maria Garcia',
        points: 3800,
        level: 7,
        position: 2,
        streak: 9,
      },
      {
        id: 'u3',
        name: 'Sam Wilson',
        points: 3650,
        level: 7,
        position: 3,
        streak: 5,
      },
      {
        id: 'currentUser',
        name: 'You',
        points: 2750,
        level: 5,
        position: 4,
        streak: 4,
      },
      {
        id: 'u5',
        name: 'Jamie Smith',
        points: 2500,
        level: 5,
        position: 5,
        streak: 3,
      },
    ]);
  };

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchGamificationData();
    }
  }, [user]);

  // Filter challenges based on active filter
  const filteredChallenges = challenges.filter(challenge => {
    if (activeChallengeFilter === 'all') return true;
    if (activeChallengeFilter === 'active') return challenge.isActive && !challenge.completed;
    if (activeChallengeFilter === 'completed') return challenge.completed;
    return true;
  });

  // Function to render achievement badge with correct styling
  const renderBadge = (type: BadgeType) => {
    const badgeColors = {
      bronze: 'bg-amber-200 text-amber-800',
      silver: 'bg-gray-300 text-gray-700',
      gold: 'bg-yellow-300 text-yellow-800',
      platinum: 'bg-cyan-200 text-cyan-800',
      diamond: 'bg-indigo-200 text-indigo-800',
      master: 'bg-purple-200 text-purple-800',
      legendary: 'bg-rose-200 text-rose-800',
    };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeColors[type]}`}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </span>
    );
  };

  // Function to render icon based on name
  const renderIcon = (iconName: string) => {
    const icons = {
      Trophy: <Trophy className="h-5 w-5" />,
      Medal: <Medal className="h-5 w-5" />,
      Star: <Star className="h-5 w-5" />,
      CheckCircle: <CheckCircle className="h-5 w-5" />,
      Clock: <Clock className="h-5 w-5" />,
      Award: <Award className="h-5 w-5" />,
      Flame: <Flame className="h-5 w-5" />,
      Target: <Target className="h-5 w-5" />,
      Calendar: <Calendar className="h-5 w-5" />,
      Zap: <Zap className="h-5 w-5" />,
      Users: <Users className="h-5 w-5" />,
      Rocket: <Rocket className="h-5 w-5" />,
      TrendingUp: <TrendingUp className="h-5 w-5" />,
    };
    
    return icons[iconName as keyof typeof icons] || <Award className="h-5 w-5" />;
  };

  // Loading UI
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-6 w-32 mt-2" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle><Skeleton className="h-6 w-64" /></CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gamification Dashboard</h2>
            <p className="text-muted-foreground">
              Track your achievements, challenges and level progress
            </p>
          </div>
          <Button onClick={fetchGamificationData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* User stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> 
                Level {stats?.level}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>Progress to Level {(stats?.level || 0) + 1}</span>
                <span>
                  {stats?.points} / {(stats?.points || 0) + (stats?.pointsToNextLevel || 0)} points
                </span>
              </div>
              <Progress 
                value={stats?.totalPointsForLevel ? 
                  ((stats?.points % stats.totalPointsForLevel) / stats.totalPointsForLevel) * 100 : 0} 
                className="h-2" 
              />
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  {stats?.pointsToNextLevel} more points to reach level {(stats?.level || 0) + 1}
                </p>
              </div>
            </CardContent>
          </Card>
          
          {/* Achievements card */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5 text-emerald-500" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between mb-1">
                <span className="text-2xl font-bold">{stats?.achievements.completed}</span>
                <span className="text-muted-foreground">
                  of {stats?.achievements.total} completed
                </span>
              </div>
              <Progress 
                value={stats?.achievements.total ? 
                  (stats.achievements.completed / stats.achievements.total) * 100 : 0} 
                className="h-2" 
              />
              <div className="flex justify-center gap-4 mt-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="font-medium">{stats?.badges.bronze || 0}</span>
                    <div className="h-3 w-3 rounded-full bg-amber-300"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Bronze</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="font-medium">{stats?.badges.silver || 0}</span>
                    <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Silver</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <span className="font-medium">{stats?.badges.gold || 0}</span>
                    <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Gold</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Streak card */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end mb-2">
                <div className="text-3xl font-bold">{stats?.streak.current} days</div>
                <div className="text-muted-foreground text-sm">
                  Best: {stats?.streak.longest} days
                </div>
              </div>
              <div className="flex gap-1 mt-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div 
                    key={i}
                    className={`flex-1 h-8 rounded-sm ${
                      i < (stats?.streak.current || 0) % 7 
                        ? 'bg-orange-400' 
                        : 'bg-gray-200'
                    }`}
                  ></div>
                ))}
              </div>
              <div className="text-center mt-2">
                <p className="text-xs text-muted-foreground">Last 7 days</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main tabs for achievements, challenges and leaderboard */}
        <Tabs defaultValue="achievements" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>
          
          {/* Achievements tab */}
          <TabsContent value="achievements">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Your Achievements</CardTitle>
                    <CardDescription>
                      Track your progress and earn rewards
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100">
                      {stats?.achievements.completed} Completed
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                      {stats?.achievements.total && stats?.achievements.completed 
                        ? stats.achievements.total - stats.achievements.completed 
                        : 0} In Progress
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <Card 
                      key={achievement.id}
                      className={`border ${
                        achievement.completed 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-gray-200'
                      }`}
                    >
                      <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${
                            achievement.completed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {renderIcon(achievement.icon)}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{achievement.name}</h4>
                            <div className="mt-1">
                              {renderBadge(achievement.type)}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm text-muted-foreground mb-3">
                          {achievement.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span className={achievement.completed ? 'text-green-600' : ''}>
                              {achievement.progress} / {achievement.target}
                            </span>
                          </div>
                          <Progress 
                            value={(achievement.progress / achievement.target) * 100} 
                            className={`h-1.5 ${
                              achievement.completed 
                                ? 'bg-green-100' 
                                : 'bg-blue-100'
                            }`}
                          />
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5" fill="currentColor" />
                            <span className="text-xs font-medium">
                              {achievement.pointsAwarded} pts
                            </span>
                          </div>
                          {achievement.completedAt && (
                            <span className="text-xs text-muted-foreground">
                              Completed: {new Date(achievement.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        {achievement.completed ? (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completed
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            In Progress
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {achievements.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-1">No achievements yet</h3>
                      <p className="text-sm text-muted-foreground">
                        Start using the app to earn your first achievement!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Challenges tab */}
          <TabsContent value="challenges">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Challenges</CardTitle>
                    <CardDescription>
                      Complete challenges to earn points and rewards
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={activeChallengeFilter === 'all' ? 'bg-primary/10' : ''}
                      onClick={() => setActiveChallengeFilter('all')}
                    >
                      All
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={activeChallengeFilter === 'active' ? 'bg-primary/10' : ''}
                      onClick={() => setActiveChallengeFilter('active')}
                    >
                      Active
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={activeChallengeFilter === 'completed' ? 'bg-primary/10' : ''}
                      onClick={() => setActiveChallengeFilter('completed')}
                    >
                      Completed
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredChallenges.map((challenge) => (
                    <Card 
                      key={challenge.id}
                      className={`border ${
                        challenge.completed 
                          ? 'border-green-200 bg-green-50' 
                          : challenge.isActive
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200'
                      }`}
                    >
                      <CardHeader className="p-4 pb-0 flex flex-row items-start justify-between space-y-0">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-full ${
                            challenge.completed 
                              ? 'bg-green-100 text-green-800' 
                              : challenge.isActive
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {renderIcon(challenge.icon)}
                          </div>
                          <div>
                            <h4 className="font-medium text-sm">{challenge.name}</h4>
                            <div className="mt-1 flex items-center gap-2">
                              {renderBadge(challenge.type)}
                              {challenge.deadline && !challenge.completed && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(challenge.deadline) > new Date() 
                                    ? `Ends ${new Date(challenge.deadline).toLocaleDateString()}`
                                    : 'Expired'
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-2">
                        <p className="text-sm text-muted-foreground mb-3">
                          {challenge.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span className={challenge.completed ? 'text-green-600' : ''}>
                              {challenge.progress} / {challenge.target}
                            </span>
                          </div>
                          <Progress 
                            value={(challenge.progress / challenge.target) * 100} 
                            className={`h-1.5 ${
                              challenge.completed 
                                ? 'bg-green-100' 
                                : challenge.isActive
                                  ? 'bg-blue-100'
                                  : 'bg-gray-100'
                            }`}
                          />
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center">
                          <div className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3.5 w-3.5" fill="currentColor" />
                            <span className="text-xs font-medium">
                              {challenge.pointsAwarded} pts
                            </span>
                          </div>
                          {challenge.completedAt && (
                            <span className="text-xs text-muted-foreground">
                              Completed: {new Date(challenge.completedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="p-4 pt-0">
                        {challenge.completed ? (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Completed
                          </Button>
                        ) : challenge.isActive ? (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <Rocket className="h-4 w-4 mr-2" />
                            In Progress
                          </Button>
                        ) : (
                          <Button 
                            className="w-full" 
                            variant="outline"
                            size="sm"
                            onClick={() => joinChallenge(challenge.id)}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Join Challenge
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  ))}
                  
                  {filteredChallenges.length === 0 && (
                    <div className="col-span-full text-center py-12">
                      <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-1">No challenges available</h3>
                      <p className="text-sm text-muted-foreground">
                        {activeChallengeFilter === 'all' 
                          ? 'Check back later for new challenges!'
                          : activeChallengeFilter === 'active'
                            ? 'You have no active challenges. Join some to get started!'
                            : 'You haven\'t completed any challenges yet.'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Leaderboard tab */}
          <TabsContent value="leaderboard">
            <Card>
              <CardHeader>
                <CardTitle>Leaderboard</CardTitle>
                <CardDescription>
                  See how you rank compared to other users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        entry.name === 'You' || entry.id === user?.id
                          ? 'bg-blue-50 border border-blue-100'
                          : index % 2 === 0
                            ? 'bg-gray-50'
                            : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                          entry.position === 1
                            ? 'bg-amber-100 text-amber-800'
                            : entry.position === 2
                              ? 'bg-gray-200 text-gray-800'
                              : entry.position === 3
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-primary/10 text-primary/80'
                        }`}>
                          {entry.position}
                        </div>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.avatar} />
                            <AvatarFallback>
                              {entry.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{entry.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Level {entry.level}</span>
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-orange-500" />
                                {entry.streak}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold">{entry.points.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                        {entry.position <= 3 && (
                          <div>
                            {entry.position === 1 && (
                              <Trophy className="h-6 w-6 text-amber-500" />
                            )}
                            {entry.position === 2 && (
                              <Medal className="h-6 w-6 text-gray-400" />
                            )}
                            {entry.position === 3 && (
                              <Medal className="h-6 w-6 text-orange-400" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {leaderboard.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-1">No leaderboard data available</h3>
                      <p className="text-sm text-muted-foreground">
                        Start using the app to compete with other users!
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Badges and milestones explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Badges and Rewards</CardTitle>
            <CardDescription>
              Learn about the different badge types and how to earn them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 border rounded-lg bg-amber-50 border-amber-100">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center">
                    <Award className="h-6 w-6 text-amber-700" />
                  </div>
                </div>
                <h3 className="font-medium text-center mb-1">Bronze</h3>
                <p className="text-xs text-center text-muted-foreground">
                  Basic achievements for new users
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-gray-50 border-gray-100">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    <Award className="h-6 w-6 text-gray-700" />
                  </div>
                </div>
                <h3 className="font-medium text-center mb-1">Silver</h3>
                <p className="text-xs text-center text-muted-foreground">
                  Intermediate goals and challenges
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-100">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center">
                    <Award className="h-6 w-6 text-yellow-700" />
                  </div>
                </div>
                <h3 className="font-medium text-center mb-1">Gold</h3>
                <p className="text-xs text-center text-muted-foreground">
                  Advanced achievements for dedicated users
                </p>
              </div>
              
              <div className="p-4 border rounded-lg bg-indigo-50 border-indigo-100">
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-200 flex items-center justify-center">
                    <Award className="h-6 w-6 text-indigo-700" />
                  </div>
                </div>
                <h3 className="font-medium text-center mb-1">Platinum</h3>
                <p className="text-xs text-center text-muted-foreground">
                  Expert level challenges and milestones
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="font-medium mb-3">How to Earn Points</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-3 bg-green-50 border-green-100">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Complete Achievements
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Earn between 50-500 points by completing various achievements
                  </p>
                </div>
                
                <div className="border rounded-lg p-3 bg-blue-50 border-blue-100">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    Finish Challenges
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Complete time-limited challenges to earn bonus points
                  </p>
                </div>
                
                <div className="border rounded-lg p-3 bg-orange-50 border-orange-100">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-orange-600" />
                    Maintain Streaks
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Earn daily streak bonuses for consistent app usage
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Gamification;
