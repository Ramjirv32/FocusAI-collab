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
  ServerOff,
  AlertCircle,
  PlusCircle,
  ShieldCheck,
  BarChart,
  History,
  BookOpen,
  Timer,
  Coffee,
  Lightbulb,
  BadgeCheck
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Define API base URL
const API_BASE_URL = 'http://localhost:5001';

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
  claimed?: boolean;
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
  focusScore?: number;
  productiveTime?: number;
  sessionsCount?: number;
  isCurrentUser?: boolean;
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

// Define timeline event interface
interface TimelineEvent {
  id: string;
  type: 'badge' | 'challenge' | 'improvement' | 'streak' | 'level';
  title: string;
  description: string;
  icon: string;
  date: string;
  category: string;
  points?: number;
  level?: number;
  badgeType?: BadgeType;
  focusScore?: number;
  improvement?: number;
  streak?: number;
}

const Gamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChallengeFilter, setActiveChallengeFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showingFallbackData, setShowingFallbackData] = useState(false);

  // Get auth headers
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      await axios.get(`${API_BASE_URL}/api/health`, { timeout: 3000 });
      setBackendStatus('connected');
      return true;
    } catch (err) {
      console.error("Backend connection check failed:", err);
      setBackendStatus('disconnected');
      return false;
    }
  };

  // Function to fetch gamification data
  const fetchGamificationData = async () => {
    try {
      setIsLoading(true);
      setError('');
      setShowingFallbackData(false);
      
      // Check backend connection first
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to backend server. Please ensure the server is running at ' + API_BASE_URL);
      }
      
      console.log('Fetching gamification data...');
      
      // Fetch data sequentially to better identify which endpoint fails
      const statsResponse = await axios.get(`${API_BASE_URL}/api/gamification/stats`, { 
        headers: getAuthHeader(),
        timeout: 5000
      });
      console.log('Stats data fetched successfully');
      
      const achievementsResponse = await axios.get(`${API_BASE_URL}/api/gamification/achievements`, { 
        headers: getAuthHeader(),
        timeout: 5000
      });
      console.log('Achievements data fetched successfully');
      
      const challengesResponse = await axios.get(`${API_BASE_URL}/api/gamification/challenges`, { 
        headers: getAuthHeader(),
        timeout: 5000
      });
      console.log('Challenges data fetched successfully');
      
      const leaderboardResponse = await axios.get(`${API_BASE_URL}/api/gamification/leaderboard`, { 
        headers: getAuthHeader(),
        timeout: 5000
      });
      console.log('Leaderboard data fetched successfully');
      
      // Handle the response data properly
      setStats(statsResponse.data.stats);
      setAchievements(achievementsResponse.data.achievements || []);
      setChallenges(challengesResponse.data.challenges || []);
      setLeaderboard(leaderboardResponse.data.leaderboard || []);
      
      // Try to fetch timeline data but don't fail if it's not available
      try {
        const timelineResponse = await axios.get(`${API_BASE_URL}/api/gamification/timeline`, { 
          headers: getAuthHeader(),
          timeout: 5000
        });
        console.log('Timeline data fetched successfully');
        setTimeline(timelineResponse.data.timeline || []);
      } catch (err) {
        console.log("Timeline endpoint not available, using empty timeline");
        setTimeline([]);
      }
      
      // Update backend status and reset fallback flag
      setBackendStatus('connected');
      setShowingFallbackData(false);
      
    } catch (err) {
      console.error('Failed to fetch gamification data:', err);
      
      // Handle different error types
      if (axios.isAxiosError(err)) {
        if (err.code === 'ECONNABORTED') {
          setError('Request timed out. The server is taking too long to respond.');
        } else if (err.code === 'ERR_NETWORK') {
          setError('Network error. Please check if the backend server is running.');
        } else if (err.response) {
          setError(`Server error: ${err.response.status} - ${err.response.data?.message || 'Unknown error'}`);
        } else {
          setError(`Connection error: ${err.message}`);
        }
      } else {
        setError(err.message || 'An unknown error occurred');
      }
      
      // Create fallback sample data
      generateFallbackData();
      setShowingFallbackData(true);
      
      toast({
        title: "Showing Sample Data",
        description: "Unable to connect to the server. Displaying sample data for demonstration.",
        variant: "default"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Claim achievement reward
  const claimAchievementReward = async (achievementId: string) => {
    try {
      if (backendStatus === 'disconnected') {
        // Simulate claiming with fallback data
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
          title: "Achievement Claimed (Demo)",
          description: `This is a demo action since the server is disconnected.`,
        });
        return;
      }
      
      // Use the correct endpoint for claiming achievements
      // This endpoint maps to the completeChallenge controller function
      await axios.post(
        `${API_BASE_URL}/api/gamification/challenge/complete`, 
        { challengeId: achievementId }, 
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
      if (backendStatus === 'disconnected') {
        // Simulation logic for offline mode
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
          title: "Challenge Joined (Demo)",
          description: "This is a demo action since the server is disconnected.",
        });
        return;
      }
      
      // Show loading toast
      toast({
        title: "Joining Challenge...",
        description: "Please wait while we process your request.",
      });
      
      // Use the correct endpoint for joining challenges
      const response = await axios.post(
        `${API_BASE_URL}/api/gamification/challenges/${challengeId}/join`, 
        {}, 
        { headers: getAuthHeader() }
      );
      
      // Check if response was successful
      if (response.data.success) {
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
        
        // Refresh data to show updated challenges
        fetchGamificationData();
      } else {
        // Handle unexpected success=false response
        toast({
          title: "Error",
          description: response.data.error || "Failed to join challenge for an unknown reason.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to join challenge:', err);
      
      // Provide more specific error messages
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) {
          toast({
            title: "Challenge Not Found",
            description: "The challenge you're trying to join doesn't exist or has been removed.",
            variant: "destructive",
          });
        } else if (err.response?.status === 403) {
          toast({
            title: "Not Authorized",
            description: "You don't have permission to join this challenge.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Server Error",
            description: err.response?.data?.error || "Failed to join challenge. Please try again.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to join challenge. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Complete challenge function
  const completeChallenge = async (challengeId: string) => {
    try {
      if (backendStatus === 'disconnected') {
        // Simulate completing with fallback data
        setChallenges(challenges.map(challenge => {
          if (challenge.id === challengeId) {
            return {
              ...challenge,
              completed: true,
              completedAt: new Date().toISOString()
            };
          }
          return challenge;
        }));
        
        toast({
          title: "Challenge Completed (Demo)",
          description: `This is a demo action since the server is disconnected.`,
        });
        return;
      }
      
      // Use the correct endpoint for completing challenges
      const response = await axios.post(
        `${API_BASE_URL}/api/gamification/challenge/complete`,
        { challengeId },
        { headers: getAuthHeader() }
      );
      
      if (response.data.success || response.status === 200) {
        // Update challenges list
        setChallenges(challenges.map(challenge => {
          if (challenge.id === challengeId) {
            return {
              ...challenge,
              completed: true,
              completedAt: new Date().toISOString()
            };
          }
          return challenge;
        }));
        
        // Show toast notification
        toast({
          title: "Challenge Completed!",
          description: `You've earned ${response.data.pointsAwarded} points!`,
        });
        
        // If user leveled up, show special notification
        if (response.data.leveledUp) {
          toast({
            title: "Level Up!",
            description: `Congratulations! You've reached level ${response.data.newLevel}!`,
            variant: "default",
          });
        }
        
        // Refresh stats
        fetchGamificationData();
      }
    } catch (err) {
      console.error('Failed to complete challenge:', err);
      toast({
        title: "Error",
        description: "Failed to complete challenge. Please try again.",
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
        claimed: true
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
        claimed: false
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
      {
        id: 'c4',
        name: 'Deep Work Master',
        description: 'Complete 3 focus sessions of at least 1 hour each',
        icon: 'Target',
        type: 'silver',
        progress: 1,
        target: 3,
        completed: false,
        deadline: '2023-07-07T23:59:59',
        pointsAwarded: 150,
        category: 'Focus',
        isActive: false,
      },
      {
        id: 'c5',
        name: 'Learning Sprint',
        description: 'Visit educational websites for at least 2 hours',
        icon: 'BookOpen',
        type: 'bronze',
        progress: 0.5,
        target: 2,
        completed: false,
        deadline: '2023-07-10T23:59:59',
        pointsAwarded: 75,
        category: 'Learning',
        isActive: false,
      },
    ]);
    
    // Sample leaderboard
    setLeaderboard([
      {
        id: 'u1',
        name: 'Alex Johnson',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=Alex',
        points: 4250,
        level: 8,
        position: 1,
        streak: 12,
      },
      {
        id: 'u2',
        name: 'Maria Garcia',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=Maria',
        points: 3800,
        level: 7,
        position: 2,
        streak: 9,
      },
      {
        id: 'u3',
        name: 'Sam Wilson',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=Sam',
        points: 3650,
        level: 7,
        position: 3,
        streak: 5,
      },
      {
        id: 'currentUser',
        name: user?.email ? user.email.split('@')[0] : 'You',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=You',
        points: 2750,
        level: 5,
        position: 4,
        streak: 4,
      },
      {
        id: 'u5',
        name: 'Jamie Smith',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=Jamie',
        points: 2500,
        level: 5,
        position: 5,
        streak: 3,
      },
      {
        id: 'u6',
        name: 'Taylor Green',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=Taylor',
        points: 2350,
        level: 4,
        position: 6,
        streak: 2,
      },
      {
        id: 'u7',
        name: 'Jordan Lee',
        avatar: 'https://api.dicebear.com/6.x/avataaars/svg?seed=Jordan',
        points: 2100,
        level: 4,
        position: 7,
        streak: 5,
      },
    ]);
  };

  // Fetch data on component mount
  useEffect(() => {
    if (user) {
      fetchGamificationData();
    } else {
      generateFallbackData();
      setShowingFallbackData(true);
      setIsLoading(false);
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
    const icons: { [key: string]: JSX.Element } = {
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
      BookOpen: <ShieldCheck className="h-5 w-5" />,
      Book: <ShieldCheck className="h-5 w-5" />,
    };
    
    return icons[iconName] || <Award className="h-5 w-5" />;
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
                  <Skeleton className="h-4 w-24 mb-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-3" />
                  <Skeleton className="h-2 w-full mb-4" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }
  
  // Check if we should display a backend connection error
  const showConnectionError = backendStatus === 'disconnected' && showingFallbackData;
  
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
        
        {showConnectionError && (
          <Alert variant="destructive">
            <ServerOff className="h-4 w-4" />
            <AlertTitle>Backend Connection Error</AlertTitle>
            <AlertDescription>
              Cannot connect to the backend server. Please make sure it's running at http://localhost:5001.
              Showing sample data for demonstration purposes.
              <div className="mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchGamificationData}
                >
                  <RefreshCw className="h-3 w-3 mr-2" /> Retry Connection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {error && !showConnectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {showingFallbackData && !showConnectionError && !error && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sample Data</AlertTitle>
            <AlertDescription>
              Showing sample gamification data for demonstration. Connect to the backend to see your actual progress.
            </AlertDescription>
          </Alert>
        )}
        
        {/* User stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Level card */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Level {stats?.level || 0}
              </CardTitle>
              <CardDescription>
                {stats?.pointsToNextLevel ? `${stats.pointsToNextLevel} points to next level` : 'Keep earning points to level up'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span>{stats?.points || 0} points</span>
                <span>{stats?.points && stats?.totalPointsForLevel ? 
                  `${stats.points % stats.totalPointsForLevel}/${stats.totalPointsForLevel}` : 
                  '0/1000'}</span>
              </div>
              <Progress 
                value={stats?.totalPointsForLevel ? 
                  ((stats?.points % stats.totalPointsForLevel) / stats.totalPointsForLevel) * 100 : 0} 
                className="h-2" 
              />
              <p className="mt-4 text-sm text-muted-foreground">
                Complete challenges and achievements to earn points and level up
              </p>
            </CardContent>
          </Card>
          
          {/* Achievements card */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Medal className="h-5 w-5 text-green-500" />
                Achievements
              </CardTitle>
              <CardDescription>
                {stats?.achievements ? 
                  `${stats.achievements.completed} of ${stats.achievements.total} completed` : 
                  'Track your achievements'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span>Progress</span>
                <span>{stats?.achievements ? 
                  `${Math.round((stats.achievements.completed / stats.achievements.total) * 100)}%` : 
                  '0%'}</span>
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
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
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
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
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
                        
                        {/* Progress visualization */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs">
                            <span>Progress</span>
                            <span className={challenge.completed ? 'text-green-600 font-medium' : ''}>
                              {challenge.progress} / {challenge.target}
                              {challenge.target >= 60 && challenge.target % 60 === 0 && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  ({Math.floor(challenge.progress / 60)}h / {Math.floor(challenge.target / 60)}h)
                                </span>
                              )}
                            </span>
                          </div>
                          
                          {/* Enhanced progress bar */}
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                            <div 
                              className={`h-full rounded-full absolute left-0 top-0 ${
                                challenge.completed 
                                  ? 'bg-green-500' 
                                  : challenge.isActive
                                    ? 'bg-blue-500'
                                    : 'bg-gray-300'
                              }`}
                              style={{ width: `${Math.min(100, Math.floor((challenge.progress / challenge.target) * 100))}%` }}
                            ></div>
                            
                            {/* Milestone markers */}
                            {[25, 50, 75].map(milestone => (
                              <div 
                                key={milestone} 
                                className="absolute top-0 h-full border-l border-white"
                                style={{ left: `${milestone}%` }}
                              ></div>
                            ))}
                          </div>
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
                            variant={challenge.progress >= challenge.target ? "default" : "outline"}
                            size="sm"
                            disabled={challenge.progress < challenge.target}
                            onClick={() => completeChallenge(challenge.id)}
                          >
                            {challenge.progress >= challenge.target ? (
                              <>
                                <BadgeCheck className="h-4 w-4 mr-2" />
                                Complete Challenge
                              </>
                            ) : (
                              <>
                                <Rocket className="h-4 w-4 mr-2" />
                                {Math.floor((challenge.progress / challenge.target) * 100)}% Complete
                              </>
                            )}
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
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg ${
                        entry.name.includes('(You)') || entry.isCurrentUser
                          ? 'bg-blue-50 border border-blue-100'
                          : index % 2 === 0
                            ? 'bg-gray-50'
                            : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto mb-2 sm:mb-0">
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
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                        {/* Focus score tag */}
                        {entry.focusScore !== undefined && (
                          <div className="flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full text-xs">
                            <Target className="h-3 w-3 text-blue-600" />
                            <span className="font-medium text-blue-700">{entry.focusScore}%</span>
                          </div>
                        )}
                        
                        {/* Productive time tag */}
                        {entry.productiveTime !== undefined && (
                          <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full text-xs">
                            <Clock className="h-3 w-3 text-green-600" />
                            <span className="font-medium text-green-700">
                              {entry.productiveTime >= 60 
                                ? `${Math.floor(entry.productiveTime / 60)}h ${entry.productiveTime % 60}m` 
                                : `${entry.productiveTime}m`}
                            </span>
                          </div>
                        )}
                        
                        {/* Points */}
                        <div className="text-right">
                          <p className="font-bold">{entry.points.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">points</p>
                        </div>
                        
                        {/* Trophy for top 3 */}
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
          
          {/* Timeline tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>
                  Track your gamification journey and achievements over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timeline.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-1">No timeline events yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Start using the app more to see your journey unfold here!
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-8 pb-2">
                    {/* Vertical line */}
                    <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-gray-200"></div>
                    
                    {/* Timeline items */}
                    <div className="space-y-8">
                      {timeline.map((event) => (
                        <div key={event.id} className="relative">
                          {/* Dot */}
                          <div className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center ${
                            event.type === 'badge' ? 'bg-amber-100' :
                            event.type === 'challenge' ? 'bg-green-100' :
                            event.type === 'improvement' ? 'bg-blue-100' :
                            event.type === 'streak' ? 'bg-orange-100' :
                            'bg-purple-100'
                          }`}>
                            {event.type === 'badge' && <Award className="h-3 w-3 text-amber-600" />}
                            {event.type === 'challenge' && <Target className="h-3 w-3 text-green-600" />}
                            {event.type === 'improvement' && <TrendingUp className="h-3 w-3 text-blue-600" />}
                            {event.type === 'streak' && <Flame className="h-3 w-3 text-orange-600" />}
                            {event.type === 'level' && <Trophy className="h-3 w-3 text-purple-600" />}
                          </div>
                          
                          {/* Content */}
                          <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                              <h4 className="font-medium">{event.title}</h4>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(event.date).toLocaleDateString()} • {new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-2">
                              {event.points && event.points > 0 && (
                                <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100">
                                  <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                                  {event.points} points
                                </Badge>
                              )}
                              
                              {event.badgeType && (
                                <Badge variant="outline" className={`
                                  ${event.badgeType === 'bronze' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                    event.badgeType === 'silver' ? 'bg-gray-100 text-gray-700 border-gray-200' :
                                    event.badgeType === 'gold' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                    event.badgeType === 'platinum' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                                    event.badgeType === 'diamond' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    event.badgeType === 'master' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                                    'bg-rose-50 text-rose-700 border-rose-200'}
                                `}>
                                  {event.badgeType.charAt(0).toUpperCase() + event.badgeType.slice(1)}
                                </Badge>
                              )}
                              
                              {event.level && (
                                <Badge variant="secondary" className="bg-purple-50 text-purple-700 hover:bg-purple-100">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Level {event.level}
                                </Badge>
                              )}
                              
                              {event.focusScore && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                                  <Target className="h-3 w-3 mr-1" />
                                  {event.focusScore}% Focus
                                </Badge>
                              )}
                              
                              {event.streak && (
                                <Badge variant="secondary" className="bg-orange-50 text-orange-700 hover:bg-orange-100">
                                  <Flame className="h-3 w-3 mr-1" />
                                  {event.streak} day streak
                                </Badge>
                              )}
                              
                              <Badge variant="outline" className="bg-gray-50 border-gray-100">
                                {event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
        
        {/* Timeline section */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
            <CardDescription>
              Monitor your recent activities, achievements, and challenges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.length === 0 && (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-1">No recent activity</h3>
                  <p className="text-sm text-muted-foreground">
                    Your activity will appear here as you complete challenges and earn achievements.
                  </p>
                </div>
              )}
              
              {timeline.map((event) => (
                <div key={event.id} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10">
                    {renderIcon(event.icon)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {event.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.date).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {event.description}
                    </p>
                    
                    {/* Points, level, badge, focus score, improvement, streak details */}
                    <div className="mt-2 flex flex-wrap gap-2">
                      {event.points && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500" />
                          <span className="text-xs font-medium">{event.points} pts</span>
                        </div>
                      )}
                      
                      {event.level && (
                        <div className="flex items-center gap-1">
                          <Trophy className="h-4 w-4 text-emerald-500" />
                          <span className="text-xs font-medium">Level {event.level}</span>
                        </div>
                      )}
                      
                      {event.badgeType && (
                        <div className="flex items-center gap-1">
                          <Award className="h-4 w-4 text-indigo-500" />
                          <span className="text-xs font-medium">
                            {event.badgeType.charAt(0).toUpperCase() + event.badgeType.slice(1)} Badge
                          </span>
                        </div>
                      )}
                      
                      {event.focusScore !== undefined && (
                        <div className="flex items-center gap-1">
                          <Lightbulb className="h-4 w-4 text-yellow-500" />
                          <span className="text-xs font-medium">
                            Focus: {event.focusScore}%
                          </span>
                        </div>
                      )}
                      
                      {event.improvement !== undefined && (
                        <div className="flex items-center gap-1">
                          <BadgeCheck className="h-4 w-4 text-green-500" />
                          <span className="text-xs font-medium">
                            Improvement: {event.improvement}%
                          </span>
                        </div>
                      )}
                      
                      {event.streak !== undefined && (
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="text-xs font-medium">
                            Streak: {event.streak} days
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Gamification;
