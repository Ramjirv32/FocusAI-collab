import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Flame, Trophy, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import BadgeCelebrationModal from './BadgeCelebrationModal';
import axios from 'axios';

interface StreakBadge {
  id: string;
  days: number;
  label: string;
  description: string;
  isUnlocked: boolean;
  isClaimed: boolean;
  color: string;
  bgColor: string;
  borderColor: string;
}

interface StreakAchievementsProps {
  currentStreak: number;
  claimedBadges?: string[];
  onBadgeClaimed?: () => void;
}

const StreakAchievements: React.FC<StreakAchievementsProps> = ({
  currentStreak = 0,
  claimedBadges = [],
  onBadgeClaimed
}) => {
  const { toast } = useToast();
  const [celebrationBadge, setCelebrationBadge] = useState<any>(null);
  const [isClaimingBadge, setIsClaimingBadge] = useState<string | null>(null);
  const streakBadges: StreakBadge[] = [
    {
      id: 'streak-7',
      days: 7,
      label: '1 Week Streak',
      description: '7 consecutive days of focus',
      isUnlocked: currentStreak >= 7,
      isClaimed: claimedBadges.includes('streak_7'),
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'streak-30',
      days: 30,
      label: '1 Month Streak',
      description: '30 consecutive days of focus',
      isUnlocked: currentStreak >= 30,
      isClaimed: claimedBadges.includes('streak_30'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300'
    },
    {
      id: 'streak-50',
      days: 50,
      label: '50 Days Streak',
      description: '50 consecutive days of focus',
      isUnlocked: currentStreak >= 50,
      isClaimed: claimedBadges.includes('streak_50'),
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      id: 'streak-100',
      days: 100,
      label: '100 Days Streak',
      description: '100 consecutive days of focus',
      isUnlocked: currentStreak >= 100,
      isClaimed: claimedBadges.includes('streak_100'),
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      id: 'streak-150',
      days: 150,
      label: '150 Days Streak',
      description: '150 consecutive days of focus',
      isUnlocked: currentStreak >= 150,
      isClaimed: claimedBadges.includes('streak_150'),
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200'
    },
    {
      id: 'streak-200',
      days: 200,
      label: '200 Days Streak',
      description: '200 consecutive days of focus',
      isUnlocked: currentStreak >= 200,
      isClaimed: claimedBadges.includes('streak_200'),
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-300'
    },
    {
      id: 'streak-250',
      days: 250,
      label: '250 Days Streak',
      description: '250 consecutive days of focus',
      isUnlocked: currentStreak >= 250,
      isClaimed: claimedBadges.includes('streak_250'),
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-400'
    },
    {
      id: 'streak-365',
      days: 365,
      label: '365 Days Streak',
      description: 'A full year of consistent focus and dedication',
      isUnlocked: currentStreak >= 365,
      isClaimed: claimedBadges.includes('streak_365'),
      color: 'text-red-700',
      bgColor: 'bg-gradient-to-br from-red-100 to-orange-100',
      borderColor: 'border-red-400'
    }
  ];

  const handleClaimBadge = async (badge: StreakBadge) => {
    try {
      setIsClaimingBadge(badge.id);
      const token = localStorage.getItem('token');

      const response = await axios.post(
        'http://localhost:5001/api/gamification/streak/claim',
        { streakDays: badge.days },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        
        setCelebrationBadge({
          name: badge.label,
          days: badge.days,
          rarity: response.data.badge.rarity,
          focusScore: response.data.badge.focusScore,
          points: response.data.pointsAwarded
        });

        
        if (onBadgeClaimed) {
          onBadgeClaimed();
        }

        toast({
          title: '🎉 Badge Claimed!',
          description: `You earned ${response.data.pointsAwarded} points!`,
        });
      }
    } catch (error: any) {
      console.error('Error claiming badge:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to claim badge',
        variant: 'destructive',
      });
    } finally {
      setIsClaimingBadge(null);
    }
  };

  return (
    <Card className="w-full border-primary/10 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Flame className="h-6 w-6 text-orange-500" />
              Streak Achievements
            </CardTitle>
            <CardDescription className="mt-1">
              Build consecutive days of productivity to unlock badges
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-orange-600">{currentStreak}</div>
            <div className="text-xs text-muted-foreground">Current Streak</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {streakBadges.map((badge) => (
            <div
              key={badge.id}
              className={`relative group overflow-hidden rounded-lg border-2 ${badge.borderColor} ${badge.bgColor} p-4 transition-all duration-300 ${badge.isUnlocked
                ? 'hover:shadow-lg hover:scale-105 cursor-pointer'
                : 'opacity-60'
                }`}
            >
              {}
              {badge.isUnlocked && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              )}

              <div className="relative z-10">
                {}
                <div className="flex justify-center mb-3">
                  <div className={`p-3 rounded-full ${badge.bgColor} border-2 ${badge.borderColor}`}>
                    <Flame className={`h-6 w-6 ${badge.color} ${badge.isUnlocked ? 'fill-current' : ''}`} />
                  </div>
                </div>

                {}
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-sm">{badge.label}</h3>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>

                  {}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className={`text-lg font-bold ${badge.color}`}>
                      {badge.isUnlocked ? badge.days : `${currentStreak}/${badge.days}`}
                    </span>
                    <span className="text-xs text-muted-foreground">days</span>
                  </div>

                  {}
                  <div className="pt-2 space-y-2">
                    {badge.isClaimed ? (
                      <Badge className="bg-green-500 hover:bg-green-600 text-white gap-1">
                        <Trophy className="h-3 w-3" />
                        Claimed
                      </Badge>
                    ) : badge.isUnlocked ? (
                      <Button
                        onClick={() => handleClaimBadge(badge)}
                        disabled={isClaimingBadge === badge.id}
                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold shadow-lg transform transition hover:scale-105"
                        size="sm"
                      >
                        {isClaimingBadge === badge.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Trophy className="h-3 w-3 mr-1" />
                            Claim Badge
                          </>
                        )}
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Star className="h-3 w-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>

                  {}
                  {!badge.isUnlocked && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-full ${badge.color.replace('text-', 'bg-')} transition-all duration-300`}
                        style={{
                          width: `${Math.min((currentStreak / badge.days) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {}
              {badge.isUnlocked && (
                <div className="absolute top-1 right-1">
                  <div className="relative">
                    <div className="absolute inset-0 bg-yellow-400 rounded-full blur-sm opacity-75"></div>
                    <div className="relative w-2 h-2 bg-yellow-300 rounded-full"></div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">💡 Tip:</span> Keep your focus streak alive to unlock badges! Each badge represents a milestone in your productivity journey.
          </p>
        </div>
      </CardContent>

      {}
      <BadgeCelebrationModal
        isOpen={celebrationBadge !== null}
        onClose={() => setCelebrationBadge(null)}
        badge={celebrationBadge}
      />
    </Card>
  );
};

export default StreakAchievements;
