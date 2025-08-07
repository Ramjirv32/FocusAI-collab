"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Star, Target, Zap, Award, TrendingUp, Crown, Medal, Users, Camera } from 'lucide-react'
import { toast } from "sonner"
import { useAuth } from "@/context/AuthContext"

interface LeaderboardUser {
  userId: string
  points: {
    total: number
    daily: number
    weekly: number
    monthly: number
  }
  level: {
    current: number
  }
  badges: Array<{
    badgeName: string
    icon: string
    rarity: string
  }>
  statistics: {
    averageFocusScore: number
    totalFocusTime: number
    sessionsCompleted: number
  }
  profile: Array<{
    displayName: string
    profilePhoto: string
    location: string
    jobTitle: string
    company: string
  }>
}

interface GamificationData {
  userId: string
  points: {
    total: number
    daily: number
    weekly: number
    monthly: number
  }
  level: {
    current: number
    progress: number
    pointsToNext: number
  }
  badges: Array<{
    badgeName: string
    earnedDate: string
    description: string
    icon: string
    rarity: string
    category: string
  }>
  challenges: Array<{
    challengeId: string
    name: string
    description: string
    progress: number
    target: number
    reward: number
    completed: boolean
    claimed?: boolean
    category: string
  }>
  streaks: {
    current: number
    longest: number
  }
  statistics: {
    averageFocusScore: number
    totalFocusTime: number
    sessionsCompleted: number
    bestFocusScore: number
  }
}

interface GamificationDashboardProps {
  compact?: boolean
  onDataUpdate?: () => void
  apiBaseUrl?: string
}

export function GamificationDashboard({ 
  compact = false, 
  onDataUpdate,
  apiBaseUrl = "http://localhost:5001"
}: GamificationDashboardProps) {
  const { user } = useAuth()
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [userRank, setUserRank] = useState<{ rank: number; total: number; points: number } | null>(null)
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null)
  const [claimingReward, setClaimingReward] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<'total' | 'daily' | 'weekly' | 'monthly'>('total')

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchGamificationData = async () => {
    if (!user) return

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${apiBaseUrl}/api/gamification/data`, { headers })
      
      if (!response.ok) throw new Error('Failed to fetch gamification data')
      
      const data = await response.json()
      setGamificationData(data)
    } catch (error) {
      console.error('Error fetching gamification data:', error)
      toast.error('Failed to load gamification data')
    }
  }

  const fetchLeaderboard = async () => {
    if (!user) return

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${apiBaseUrl}/api/gamification/leaderboard?timeFrame=${selectedTimeFrame}&limit=10`, { headers })
      
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      
      const data = await response.json()
      setLeaderboard(data)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      toast.error('Failed to load leaderboard')
    }
  }

  const fetchUserRank = async () => {
    if (!user) return

    try {
      const headers = getAuthHeaders()
      const response = await fetch(`${apiBaseUrl}/api/gamification/rank?timeFrame=${selectedTimeFrame}`, { headers })
      
      if (!response.ok) throw new Error('Failed to fetch user rank')
      
      const data = await response.json()
      setUserRank(data)
    } catch (error) {
      console.error('Error fetching user rank:', error)
    }
  }

  useEffect(() => {
    if (user) {
      const loadData = async () => {
        setLoading(true)
        await Promise.all([
          fetchGamificationData(),
          fetchLeaderboard(),
          fetchUserRank()
        ])
        setLoading(false)
      }
      loadData()
    }
  }, [user, selectedTimeFrame])

  const badgeIcons = {
    "Focus Master": Trophy,
    "Distraction Slayer": Target,
    "Early Bird": Star,
    "Streak Champion": Zap,
    "Productivity Pro": Award,
    "Time Optimizer": TrendingUp,
    "Consistency Champion": Crown,
    "Productivity Wizard": Medal,
    "Night Owl": Star,
    "Marathon Runner": Zap,
    "Perfectionist": Award
  }

  const claimReward = async (challengeId: string) => {
    if (claimingReward) return
    
    setClaimingReward(challengeId)
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/gamification/claim-reward`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ 
          challengeId, 
          userId: gamificationData?.userId 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast.success(`Reward claimed! +${result.pointsAwarded} points`)
      onDataUpdate?.()
    } catch (error) {
      console.error("Error claiming reward:", error)
      toast.error(error instanceof Error ? error.message : "Failed to claim reward")
    } finally {
      setClaimingReward(null)
    }
  }

  const testGamificationAPI = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/gamification/award`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          userId: gamificationData?.userId,
          usageData: {
            productiveHours: 3,
            distractionHours: 0.5,
            date: new Date().toISOString().split('T')[0]
          }
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast.success(`Test completed! Earned ${result.pointsEarned} points`)
      onDataUpdate?.()
    } catch (error) {
      console.error("Error testing gamification:", error)
      toast.error("Failed to test gamification system")
    }
  }

  if (!gamificationData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Your Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{gamificationData.points}</div>
            <div className="text-sm text-gray-500">Total Points</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">Level {gamificationData.level}</div>
            <div className="text-sm text-gray-500">Current Level</div>
          </div>

          <div className="text-center">
            <div className="text-xl font-bold text-orange-600">{gamificationData.streaks.current}</div>
            <div className="text-sm text-gray-500">Day Streak</div>
          </div>

          <div className="flex justify-center gap-2 flex-wrap">
            {gamificationData.badges.slice(0, 3).map((badge, index) => {
              const IconComponent = badgeIcons[badge.badgeName as keyof typeof badgeIcons] || Trophy
              return (
                <div key={index} className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                  <IconComponent className="w-4 h-4 text-yellow-600" />
                  <span className="text-xs text-yellow-700">{badge.badgeName}</span>
                </div>
              )
            })}
            {gamificationData.badges.length > 3 && (
              <div className="text-xs text-gray-500">+{gamificationData.badges.length - 3} more</div>
            )}
          </div>

          {/* Test Button for Development */}
          <Button 
            size="sm" 
            variant="outline" 
            onClick={testGamificationAPI}
            className="w-full"
          >
            Test Gamification
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{gamificationData.points}</div>
            <div className="text-sm text-gray-500">Total Points</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600">Level {gamificationData.level}</div>
            <div className="text-sm text-gray-500">Current Level</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{gamificationData.badges.length}</div>
            <div className="text-sm text-gray-500">Badges Earned</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600">{gamificationData.streaks.current}</div>
            <div className="text-sm text-gray-500">Current Streak</div>
            <div className="text-xs text-gray-400">Best: {gamificationData.streaks.longest}</div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Your Badges ({gamificationData.badges.length})
          </CardTitle>
          <CardDescription>Achievements you've unlocked</CardDescription>
        </CardHeader>
        <CardContent>
          {gamificationData.badges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No badges earned yet. Start being productive to unlock achievements!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gamificationData.badges.map((badge, index) => {
                const IconComponent = badgeIcons[badge.badgeName as keyof typeof badgeIcons] || Trophy
                return (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedBadge(selectedBadge === badge.badgeName ? null : badge.badgeName)}
                  >
                    <div className="text-center space-y-2">
                      <IconComponent className="w-8 h-8 mx-auto text-yellow-500" />
                      <div className="font-medium text-sm">{badge.badgeName}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(badge.earnedDate).toLocaleDateString()}
                      </div>
                      {selectedBadge === badge.badgeName && (
                        <div className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          {badge.description}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Active Challenges ({gamificationData.challenges.length})
          </CardTitle>
          <CardDescription>Complete these to earn points and badges</CardDescription>
        </CardHeader>
        <CardContent>
          {gamificationData.challenges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No active challenges. New challenges will appear as you use the app!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gamificationData.challenges.map((challenge) => (
                <div key={challenge.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">{challenge.name}</h4>
                      <p className="text-sm text-gray-600">{challenge.description}</p>
                    </div>
                    <Badge variant={challenge.completed ? "default" : "secondary"}>
                      {challenge.reward} pts
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>
                        {challenge.progress}/{challenge.target}
                      </span>
                    </div>
                    <Progress value={(challenge.progress / challenge.target) * 100} className="h-2" />
                  </div>

                  {challenge.completed && !challenge.claimed && (
                    <Button 
                      size="sm" 
                      className="mt-3" 
                      onClick={() => claimReward(challenge.id)}
                      disabled={claimingReward === challenge.id}
                    >
                      {claimingReward === challenge.id ? "Claiming..." : "Claim Reward"}
                    </Button>
                  )}

                  {challenge.claimed && (
                    <Badge variant="outline" className="mt-3">
                      Reward Claimed
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Development Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Development Tools</CardTitle>
          <CardDescription>Test gamification features</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={testGamificationAPI} variant="outline">
            Simulate Productive Session
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
