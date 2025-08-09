"use client"

import React, { useState, useEffect } from "react"
import DashboardLayout from "@/components/Layout/DashboardLayout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trophy, Target, Award, Star, Calendar, TrendingUp, Medal, Crown, RefreshCw, Users, Clock, Zap, ListOrdered, CheckCircle2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import axios from "axios"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const Gamification = () => {
  const { user, token } = useAuth()
  const [userStats, setUserStats] = useState<any>(null)
  const [gamificationData, setGamificationData] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeFrame, setSelectedTimeFrame] = useState("weekly")

  // Format hours for display
  const formatHours = (hours: number) => {
    if (!hours) return "0h"
    return `${hours.toFixed(1)}h`
  }

  // Get auth headers
  const getAuthHeader = () => {
    const authToken = token || (typeof window !== "undefined" ? localStorage.getItem("token") : null)
    return authToken ? { Authorization: `Bearer ${authToken}` } : {}
  }

  // Fetch user statistics and gamification data
  const fetchUserStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const headers = getAuthHeader()

      const [statsResponse, gamificationResponse, profileResponse] = await Promise.all([
        axios.get("http://localhost:5001/api/user-stats", {
          headers,
          params: { timeFrame: selectedTimeFrame },
        }),
        axios.get("http://localhost:5001/api/gamification/data", {
          headers,
        }).catch(() => ({ data: null })), // Handle if gamification doesn't exist yet
        axios.get("http://localhost:5001/api/profile", {
          headers,
        }).catch(() => ({ data: null })), // Handle if profile doesn't exist yet
      ])

      setUserStats(statsResponse.data)
      setGamificationData(gamificationResponse.data)
      setUserProfile(profileResponse.data)
    } catch (err) {
      console.error("Error fetching user data:", err)
      setError("Failed to load user data. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      const headers = getAuthHeader()
      const leaderboardResponse = await axios.get("http://localhost:5001/api/leaderboard", {
        headers,
        params: { timeFrame: selectedTimeFrame, limit: 10 },
      })
      setLeaderboard(leaderboardResponse.data.leaderboard || [])
    } catch (err) {
      console.error("Error fetching leaderboard:", err)
    }
  }

  // Load data when component mounts or timeframe changes
  useEffect(() => {
    if (user) {
      fetchUserStats()
      fetchLeaderboard()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedTimeFrame])

  // Handle refresh
  const handleRefresh = async () => {
    await Promise.all([fetchUserStats(), fetchLeaderboard()])
  }

  // Calculate daily challenges progress (mock data for now)
  const getDailyChallenges = () => {
    if (!userStats) return []
    const focusHours = userStats.productiveHours || 0
    const distractionHours = userStats.distractionHours || 0
    return [
      {
        title: "Maintain 2 hours of focus time",
        progress: Math.min(100, (focusHours / 2) * 100),
        current: focusHours,
        target: 2,
        unit: "hours",
        xp: 100,
      },
      {
        title: "Keep focus score above 70%",
        progress: userStats.focusScore >= 70 ? 100 : (userStats.focusScore / 70) * 100,
        current: userStats.focusScore,
        target: 70,
        unit: "%",
        xp: 150,
      },
      {
        title: "Limit distraction time to 1 hour",
        progress: distractionHours <= 1 ? 100 : Math.max(0, ((2 - distractionHours) / 1) * 100),
        current: distractionHours,
        target: 1,
        unit: "hours",
        xp: 75,
      },
    ]
  }

  const formatTime = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`
    return `${hours.toFixed(1)}h`
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>Please log in to view your gamification data.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading your achievements...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gamification Hub</h2>
            <p className="text-muted-foreground">
              Track achievements, compete with others, and earn rewards for staying productive
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="min-w-[180px]">
              <Select
                value={selectedTimeFrame}
                onValueChange={(val) => setSelectedTimeFrame(val)}
              >
                <SelectTrigger aria-label="Select timeframe" className="w-[180px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="gap-2">
              <Star className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="gap-2">
              <ListOrdered className="h-4 w-4" />
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="achievements" className="gap-2">
              <Award className="h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-2">
              <Target className="h-4 w-4" />
              Challenges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* User Profile Card */}
            <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg">
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20 ring-4 ring-white shadow-lg">
                      <AvatarImage
                        src={userProfile?.profilePhoto || "/placeholder.svg"}
                        alt={userProfile?.displayName || user?.email || "User"}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {(userProfile?.displayName || user?.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {gamificationData?.level?.current &&
                      gamificationData.level.current > 1 && (
                        <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-white text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center border-2 border-white">
                          {gamificationData.level.current}
                        </div>
                      )}
                  </div>

                  <div className="flex-1">
                    <CardTitle className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {userProfile?.displayName ||
                        user?.email?.split("@")[0] ||
                        "User"}
                    </CardTitle>

                    <CardDescription className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-lg">
                      {gamificationData && (
                        <>
                          <span className="flex items-center gap-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm font-medium">
                            <Trophy className="h-4 w-4" />
                            Level {gamificationData.level?.current || 1}
                          </span>
                          <span className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                            <Target className="h-4 w-4" />
                            {gamificationData.points?.total || 0} XP
                          </span>
                        </>
                      )}
                      {userStats && (
                        <span className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                          <TrendingUp className="h-4 w-4" />
                          Rank #{userStats.rank || "N/A"}
                        </span>
                      )}
                    </CardDescription>

                    {userProfile?.bio && (
                      <div className="mt-4 p-3 bg-white/50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-700 italic">
                          {"\"" + userProfile.bio + "\""}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <div
                      className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      aria-live="polite"
                    >
                      {Math.round(userStats?.focusScore || 0)}%
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">
                      Focus Score
                    </div>
                    <div className="w-56 bg-gray-200 rounded-full h-2 mt-2 ml-auto">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(userStats?.focusScore || 0)}%`,
                        }}
                        aria-label="Focus score progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(userStats?.focusScore || 0)}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-yellow-800">
                    Level Progress
                  </CardTitle>
                  <Crown className="h-6 w-6 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-700">
                    {gamificationData?.level?.current || 1}
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-3 mt-3">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${gamificationData?.level?.progress || 0}%`,
                      }}
                      aria-label="Level progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(
                        gamificationData?.level?.progress || 0
                      )}
                    />
                  </div>
                  <p className="text-xs text-yellow-600 mt-2 font-medium">
                    {gamificationData?.level?.pointsToNext || 100} XP to next
                    level
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-800">
                    Total XP
                  </CardTitle>
                  <Star className="h-6 w-6 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-700">
                    {gamificationData?.points?.total || 0}
                  </div>
                  <p className="text-xs text-purple-600 font-medium">
                    +{gamificationData?.points?.daily || 0} earned today
                  </p>
                  <div className="flex items-center mt-2">
                    <Zap className="h-3 w-3 text-purple-500 mr-1" />
                    <span className="text-xs text-purple-600">Keep going!</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-800">
                    Focus Time
                  </CardTitle>
                  <Clock className="h-6 w-6 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">
                    {formatHours(userStats?.productiveHours || 0)}
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    {selectedTimeFrame} total
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">
                      {userStats?.productiveHours > 0
                        ? "Great progress!"
                        : "Start focusing!"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-800">
                    Streak
                  </CardTitle>
                  <Zap className="h-6 w-6 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-700">
                    {gamificationData?.streaks?.current || 0}
                  </div>
                  <p className="text-xs text-orange-600 font-medium">
                    days (best: {gamificationData?.streaks?.longest || 0})
                  </p>
                  <div className="flex items-center mt-2">
                    <Medal className="h-3 w-3 text-orange-500 mr-1" />
                    <span className="text-xs text-orange-600">
                      {(gamificationData?.streaks?.current || 0) > 0
                        ? "On fire!"
                        : "Start your streak!"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Badges */}
            {gamificationData?.badges && gamificationData.badges.length > 0 && (
              <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Award className="h-6 w-6 text-amber-600" />
                    <CardTitle className="text-amber-800">
                      Recent Achievements
                    </CardTitle>
                  </div>
                  <CardDescription>
                    Your latest earned badges and milestones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {gamificationData.badges.slice(0, 6).map((badge: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-4 bg-white/70 rounded-xl border border-amber-200 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                        aria-label={`${badge.badgeName} badge`}
                      >
                        <div className="text-3xl" aria-hidden="true">
                          {badge.icon || "🏆"}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-amber-800">
                            {badge.badgeName}
                          </div>
                          <div className="text-sm text-amber-600">
                            {badge.description}
                          </div>
                          <Badge
                            variant="secondary"
                            className={`mt-2 text-xs font-medium ${
                              badge.rarity === "legendary"
                                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
                                : badge.rarity === "epic"
                                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                                : badge.rarity === "rare"
                                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
                                : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                            }`}
                          >
                            ✨ {badge.rarity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {gamificationData.badges.length > 6 && (
                    <div className="text-center mt-4">
                      <Button
                        variant="outline"
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        View All {gamificationData.badges.length} Achievements
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Top Performers ({selectedTimeFrame})
                </CardTitle>
                <CardDescription>
                  See how you rank against other users based on productivity
                  metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length > 0 ? (
                  <div className="space-y-4">
                    {leaderboard.map((entry, index) => {
                      const isMe =
                        (entry?.email && user?.email && entry.email === user.email) ||
                        (entry?.userId && (user as any)?.id && entry.userId === (user as any).id)

                      return (
                        <div
                          key={entry.userId ?? `${entry.email}-${index}`}
                          className={`flex flex-col gap-4 p-4 rounded-lg border sm:flex-row sm:items-center ${
                            isMe
                              ? "bg-blue-50 border-blue-200"
                              : "bg-gray-50 border-border/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                index === 0
                                  ? "bg-yellow-100 text-yellow-800"
                                  : index === 1
                                  ? "bg-gray-100 text-gray-800"
                                  : index === 2
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                              aria-label={`Rank ${index + 1}`}
                            >
                              {index < 3
                                ? index === 0
                                  ? "🥇"
                                  : index === 1
                                  ? "🥈"
                                  : "🥉"
                                : entry.rank ?? index + 1}
                            </div>

                            <Avatar className="h-10 w-10">
                              <AvatarImage
                                src={entry.profilePhoto || "/placeholder.svg"}
                                alt={entry.name}
                              />
                              <AvatarFallback>
                                {entry.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>

                            <div>
                              <div className="font-medium">{entry.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.email}
                              </div>
                            </div>
                          </div>

                          <div className="flex-1" />

                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-blue-600">
                                {entry.focusScore}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Focus
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                {entry.productiveHours}h
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Productive
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-purple-600">
                                {entry.experiencePoints}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                XP
                              </div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-orange-600">
                                {entry.daysActive}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Days
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No leaderboard data available</p>
                    <Button onClick={handleRefresh} variant="outline" className="mt-4">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Achievements</CardTitle>
                <CardDescription>
                  Browse all available badges and your progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Placeholder content */}
                  <div className="text-center py-8 text-muted-foreground col-span-full">
                    <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Achievement system coming soon!</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Challenges */}
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-6 w-6 text-blue-600" />
                    <CardTitle className="text-blue-800">Daily Challenges</CardTitle>
                  </div>
                  <CardDescription>
                    Complete today&apos;s challenges to earn XP and level up
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getDailyChallenges().map((challenge: any, index: number) => (
                    <div
                      key={index}
                      className="space-y-3 p-4 bg-white/70 rounded-lg border border-blue-200"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-blue-800">
                          {challenge.title}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium"
                        >
                          +{challenge.xp} XP
                        </Badge>
                      </div>

                      <div className="w-full bg-blue-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${challenge.progress}%` }}
                          aria-label={`${challenge.title} progress`}
                          role="progressbar"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(challenge.progress)}
                        />
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="text-blue-600 font-medium">
                          {challenge.current.toFixed(1)} / {challenge.target}{" "}
                          {challenge.unit}
                        </span>
                        <span className="text-blue-500 font-semibold">
                          {Math.round(challenge.progress)}% Complete
                        </span>
                      </div>

                      {challenge.progress >= 100 && (
                        <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Challenge Completed! 🎉
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Weekly Goals */}
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-6 w-6 text-purple-600" />
                    <CardTitle className="text-purple-800">Weekly Goals</CardTitle>
                  </div>
                  <CardDescription>
                    Long-term objectives for sustained growth and productivity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-purple-600">
                    <Target className="h-16 w-16 mx-auto mb-4 opacity-60" />
                    <p className="text-lg font-medium mb-2">
                      Weekly challenges coming soon!
                    </p>
                    <p className="text-sm opacity-75">
                      We&apos;re preparing exciting weekly goals to help you stay
                      motivated and productive.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      Get Notified
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}

export default Gamification
