"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GamificationDashboard } from "@/components/Gamifications/Gamifications"
import { EnhancedCalendar } from "@/components/Gamifications/enhanced-calendar"
import { UsageStats } from "@/components/Gamifications/usage-stats"
import { Trophy, Calendar, BarChart3, Target, AlertCircle } from 'lucide-react'
import { toast } from "sonner"

const API_BASE_URL = "http://localhost:5001"

export default function FocusAIDashboard() {
  const [user, setUser] = useState({ id: "user123", name: "John Doe" })
  const [gamificationData, setGamificationData] = useState(null)
  const [usageData, setUsageData] = useState(null)
  const [calendarEvents, setCalendarEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      await Promise.all([
        fetchGamificationData(),
        fetchUsageData(),
        fetchCalendarEvents()
      ])
    } catch (err) {
      setError("Failed to load dashboard data. Please check if the backend is running on localhost:5001")
      toast.error("Failed to connect to backend server")
    } finally {
      setLoading(false)
    }
  }

  const fetchGamificationData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gamification/${user.id}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setGamificationData(data)
    } catch (error) {
      console.error("Error fetching gamification data:", error)
      throw error
    }
  }

  const fetchUsageData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/usage/${user.id}?limit=7`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setUsageData(data)
    } catch (error) {
      console.error("Error fetching usage data:", error)
      throw error
    }
  }

  const fetchCalendarEvents = async () => {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
      
      const response = await fetch(
        `${API_BASE_URL}/api/calendar/events/${user.id}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setCalendarEvents(data)
    } catch (error) {
      console.error("Error fetching calendar events:", error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading Focus AI Dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
              <CardContent className="p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={initializeData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry Connection
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Focus AI Dashboard</h1>
          <p className="text-gray-600">Track your productivity, earn rewards, and optimize your focus</p>
          <div className="mt-2 text-sm text-gray-500">
            Connected to: {API_BASE_URL}
          </div>
        </header>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="gamification" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="challenges" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Challenges
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <UsageStats usageData={usageData} />
              </div>
              <div>
                <GamificationDashboard 
                  gamificationData={gamificationData} 
                  compact={true}
                  apiBaseUrl={API_BASE_URL}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="gamification">
            <GamificationDashboard 
              gamificationData={gamificationData} 
              onDataUpdate={fetchGamificationData}
              apiBaseUrl={API_BASE_URL}
            />
          </TabsContent>

          <TabsContent value="calendar">
            <EnhancedCalendar 
              events={calendarEvents} 
              usageData={usageData} 
              onEventUpdate={fetchCalendarEvents}
              userId={user.id}
              apiBaseUrl={API_BASE_URL}
            />
          </TabsContent>

          <TabsContent value="challenges">
            <Card>
              <CardHeader>
                <CardTitle>Active Challenges</CardTitle>
                <CardDescription>Complete challenges to earn badges and points</CardDescription>
              </CardHeader>
              <CardContent>
                {gamificationData?.challenges ? (
                  <div className="space-y-4">
                    {gamificationData.challenges.map((challenge) => (
                      <div key={challenge.id} className="p-4 border rounded-lg">
                        <h4 className="font-medium">{challenge.name}</h4>
                        <p className="text-sm text-gray-600">{challenge.description}</p>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{challenge.progress}/{challenge.target}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No active challenges</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
