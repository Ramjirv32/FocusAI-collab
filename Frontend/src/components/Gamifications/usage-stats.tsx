"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Monitor, Globe, Clock, AlertCircle } from "lucide-react"

interface UsageData {
  date: string
  apps: Array<{ name: string; duration: number; category: string }>
  tabs: Array<{ url: string; title: string; duration: number; category: string }>
  summary: {
    productiveHours: number
    distractionHours: number
    neutralHours?: number
    totalActiveHours: number
    focusScore: number
  }
}

interface UsageStatsProps {
  usageData: UsageData[] | null
}

export function UsageStats({ usageData }: UsageStatsProps) {
  if (!usageData || usageData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No usage data available</p>
            <p className="text-sm text-gray-400 mt-2">Start using your computer to see productivity insights here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const today = usageData[0] // Most recent data
  const yesterday = usageData[1]

  const productiveChange =
    yesterday && yesterday.summary.productiveHours > 0
      ? ((today.summary.productiveHours - yesterday.summary.productiveHours) / yesterday.summary.productiveHours) * 100
      : 0

  const focusScoreChange =
    yesterday && yesterday.summary.focusScore > 0 ? today.summary.focusScore - yesterday.summary.focusScore : 0

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "productive":
        return "bg-green-500"
      case "neutral":
        return "bg-yellow-500"
      case "distracting":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getCategoryTextColor = (category: string) => {
    switch (category) {
      case "productive":
        return "text-green-600"
      case "neutral":
        return "text-yellow-600"
      case "distracting":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  return (
    <div className="space-y-6">
      {/* Today's Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Today's Activity
          </CardTitle>
          <CardDescription>Your productivity summary for {new Date(today.date).toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{formatTime(today.summary.productiveHours * 60)}</div>
              <div className="text-sm text-green-700">Productive Time</div>
              {productiveChange !== 0 && (
                <div
                  className={`flex items-center justify-center gap-1 text-xs mt-1 ${
                    productiveChange > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {productiveChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(productiveChange).toFixed(1)}% vs yesterday
                </div>
              )}
            </div>

            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{formatTime(today.summary.distractionHours * 60)}</div>
              <div className="text-sm text-red-700">Distraction Time</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{today.summary.focusScore.toFixed(1)}%</div>
              <div className="text-sm text-blue-700">Focus Score</div>
              {focusScoreChange !== 0 && (
                <div
                  className={`flex items-center justify-center gap-1 text-xs mt-1 ${
                    focusScoreChange > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {focusScoreChange > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {focusScoreChange > 0 ? "+" : ""}
                  {focusScoreChange.toFixed(1)}
                </div>
              )}
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(today.summary.totalActiveHours * 60)}
              </div>
              <div className="text-sm text-purple-700">Total Active</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      {usageData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Trend</CardTitle>
            <CardDescription>Your productivity over the last {Math.min(usageData.length, 7)} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageData.slice(0, 7).map((dayData, index) => {
                const date = new Date(dayData.date)
                const isToday = index === 0

                return (
                  <div key={dayData.date} className="flex items-center gap-4">
                    <div className="w-20 text-sm">
                      {isToday
                        ? "Today"
                        : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{dayData.summary.focusScore.toFixed(0)}%</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${dayData.summary.focusScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-1 text-xs text-gray-600">
                        <span>Productive: {formatTime(dayData.summary.productiveHours * 60)}</span>
                        <span>•</span>
                        <span>Distracting: {formatTime(dayData.summary.distractionHours * 60)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Apps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Top Applications
          </CardTitle>
          <CardDescription>Most used applications today</CardDescription>
        </CardHeader>
        <CardContent>
          {today.apps.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No application usage data available</div>
          ) : (
            <div className="space-y-3">
              {today.apps.slice(0, 8).map((app, index) => {
                const totalTime = today.apps.reduce((sum, a) => sum + a.duration, 0)
                const percentage = totalTime > 0 ? (app.duration / totalTime) * 100 : 0

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium truncate">{app.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getCategoryTextColor(app.category)} border-current`}
                        >
                          {app.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 whitespace-nowrap">{formatTime(app.duration)}</div>
                    </div>
                    <div className="w-24 ml-4">
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Websites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Top Websites
          </CardTitle>
          <CardDescription>Most visited websites today</CardDescription>
        </CardHeader>
        <CardContent>
          {today.tabs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No website usage data available</div>
          ) : (
            <div className="space-y-3">
              {today.tabs.slice(0, 8).map((tab, index) => {
                const totalTime = today.tabs.reduce((sum, t) => sum + t.duration, 0)
                const percentage = totalTime > 0 ? (tab.duration / totalTime) * 100 : 0

                let domain = tab.url
                try {
                  domain = new URL(`https://${tab.url}`).hostname.replace("www.", "")
                } catch {
                  // If URL parsing fails, use the original URL
                  domain = tab.url.replace("www.", "")
                }

                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-medium truncate" title={tab.title}>
                          {domain}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getCategoryTextColor(tab.category)} border-current`}
                        >
                          {tab.category}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 whitespace-nowrap">{formatTime(tab.duration)}</div>
                    </div>
                    <div className="w-24 ml-4">
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
