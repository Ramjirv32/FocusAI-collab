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
import LeetCodeStyleHeatmap from '@/components/Gamification/LeetCodeStyleHeatmap';
import StreakAchievements from '@/components/Gamification/StreakAchievements';
const API_BASE_URL = 'http://localhost:5001';
type BadgeType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'legendary';
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
const getLevelName = (level: number) => {
  const names = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  return names[Math.min(level - 1, 4)] || 'Bronze';
};
const Gamification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChallengeFilter, setActiveChallengeFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showingFallbackData, setShowingFallbackData] = useState(false);
  const [heatmapData, setHeatmapData] = useState<{ date: string; score: number }[]>([]);
  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };
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
  const fetchGamificationData = async () => {
    try {
      setIsLoading(true);
      setError('');
      setShowingFallbackData(false);
      const isConnected = await checkBackendConnection();
      if (!isConnected) {
        throw new Error('Cannot connect to backend server. Please ensure the server is running at ' + API_BASE_URL);
      }
      console.log('Fetching gamification data...');
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
      setStats(statsResponse.data.stats);
      setAchievements(achievementsResponse.data.achievements || []);
      setChallenges(challengesResponse.data.challenges || []);
      try {
        const heatmapResponse = await axios.get(`${API_BASE_URL}/api/gamification/heatmap`, {
          headers: getAuthHeader(),
          timeout: 5000
        });
        if (heatmapResponse.data.success) {
          setHeatmapData(heatmapResponse.data.heatmap);
        }
      } catch (hmErr) {
        console.error('Error fetching heatmap data:', hmErr);
      }
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
      setBackendStatus('connected');
      setShowingFallbackData(false);
    } catch (err) {
      console.error('Failed to fetch gamification data:', err);
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
  const claimAchievementReward = async (achievementId: string) => {
    try {
      if (backendStatus === 'disconnected') {
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
      await axios.post(
        `${API_BASE_URL}/api/gamification/challenge/complete`,
        { challengeId: achievementId },
        { headers: getAuthHeader() }
      );
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
  const joinChallenge = async (challengeId: string) => {
    try {
      if (backendStatus === 'disconnected') {
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
      toast({
        title: "Joining Challenge...",
        description: "Please wait while we process your request.",
      });
      const response = await axios.post(
        `${API_BASE_URL}/api/gamification/challenges/${challengeId}/join`,
        {},
        { headers: getAuthHeader() }
      );
      if (response.data.success) {
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
        fetchGamificationData();
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to join challenge for an unknown reason.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to join challenge:', err);
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
  const completeChallenge = async (challengeId: string) => {
    try {
      if (backendStatus === 'disconnected') {
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
      const response = await axios.post(
        `${API_BASE_URL}/api/gamification/challenge/complete`,
        { challengeId },
        { headers: getAuthHeader() }
      );
      if (response.data.success || response.status === 200) {
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
          title: "Challenge Completed!",
          description: `You've earned ${response.data.pointsAwarded} points!`,
        });
        if (response.data.leveledUp) {
          toast({
            title: "Level Up!",
            description: `Congratulations! You've reached level ${response.data.newLevel}!`,
            variant: "default",
          });
        }
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
  const generateFallbackData = () => {
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
  };
  useEffect(() => {
    if (user) {
      fetchGamificationData();
    } else {
      generateFallbackData();
      setShowingFallbackData(true);
      setIsLoading(false);
    }
  }, [user]);
  const filteredChallenges = challenges.filter(challenge => {
    if (activeChallengeFilter === 'all') return true;
    if (activeChallengeFilter === 'active') return challenge.isActive && !challenge.completed;
    if (activeChallengeFilter === 'completed') return challenge.completed;
    return true;
  });
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
        {}
        <LeetCodeStyleHeatmap
          data={heatmapData}
          title="Focus Activity Heatmap"
          description="Your 1-year contribution graph - Track your daily focus streaks"
        />
        {}
        <StreakAchievements
          currentStreak={stats?.streak.current || 0}
          claimedBadges={achievements
            .filter(a => a.category === 'streak')
            .map(a => a.id)
          }
          onBadgeClaimed={fetchGamificationData}
        />
      </div>
    </DashboardLayout>
  );
};
export default Gamification;
