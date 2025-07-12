"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Plus, Monitor, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface CalendarEvent {
  _id?: string
  id?: string
  eventName: string
  startTime: string
  endTime: string
  category: string
  linkedApps: string[]
  linkedTabs: string[]
  description?: string
}

interface UsageData {
  date: string
  apps: Array<{ name: string; duration: number; category: string }>
  tabs: Array<{ url: string; title: string; duration: number; category: string }>
  summary: {
    productiveHours: number
    distractionHours: number
  }
}

interface EnhancedCalendarProps {
  events: CalendarEvent[]
  usageData: UsageData[] | null
  onEventUpdate: () => void
  userId: string
  apiBaseUrl?: string
}

export function EnhancedCalendar({
  events,
  usageData,
  onEventUpdate,
  userId,
  apiBaseUrl = "http://localhost:5001",
}: EnhancedCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newEvent, setNewEvent] = useState({
    eventName: "",
    startTime: "",
    endTime: "",
    category: "work",
    linkedApps: [] as string[],
    linkedTabs: [] as string[],
    description: "",
  })

  const categories = [
    { value: "work", label: "Work", color: "bg-blue-500" },
    { value: "personal", label: "Personal", color: "bg-green-500" },
    { value: "learning", label: "Learning", color: "bg-purple-500" },
    { value: "break", label: "Break", color: "bg-orange-500" },
    { value: "meeting", label: "Meeting", color: "bg-red-500" },
  ]

  const popularApps = ["VS Code", "Chrome", "Slack", "Notion", "Figma", "Terminal", "Photoshop", "Excel"]
  const popularTabs = [
    "github.com",
    "stackoverflow.com",
    "docs.google.com",
    "youtube.com",
    "linkedin.com",
    "twitter.com",
  ]

  const createEvent = async () => {
    if (!newEvent.eventName || !newEvent.startTime || !newEvent.endTime) {
      toast.error("Please fill in all required fields")
      return
    }

    setCreating(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/calendar/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          ...newEvent,
          startTime: `${selectedDate}T${newEvent.startTime}:00.000Z`,
          endTime: `${selectedDate}T${newEvent.endTime}:00.000Z`,
          userId: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      toast.success("Event created successfully!")
      setShowEventDialog(false)
      setNewEvent({
        eventName: "",
        startTime: "",
        endTime: "",
        category: "work",
        linkedApps: [],
        linkedTabs: [],
        description: "",
      })
      onEventUpdate()
    } catch (error) {
      console.error("Error creating event:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create event")
    } finally {
      setCreating(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/calendar/events/${eventId}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      toast.success("Event deleted successfully!")
      onEventUpdate()
    } catch (error) {
      console.error("Error deleting event:", error)
      toast.error("Failed to delete event")
    }
  }

  const getEventsForDate = (date: string) => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime).toISOString().split("T")[0]
      return eventDate === date
    })
  }

  const getUsageForDate = (date: string) => {
    return usageData?.find((usage) => usage.date === date)
  }

  const generateCalendarDays = () => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    const firstDay = new Date(currentYear, currentMonth, 1)
    const lastDay = new Date(currentYear, currentMonth + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    const current = new Date(startDate)

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return days
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const formatDateTime = (dateTimeString: string) => {
    try {
      return new Date(dateTimeString).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Invalid time"
    }
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Enhanced Calendar
              </CardTitle>
              <CardDescription>Plan your tasks and track your actual usage</CardDescription>
            </div>
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                  <DialogDescription>Plan a focused work session for {selectedDate}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="eventName">Event Name *</Label>
                    <Input
                      id="eventName"
                      value={newEvent.eventName}
                      onChange={(e) => setNewEvent({ ...newEvent, eventName: e.target.value })}
                      placeholder="e.g., Work on Project X"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newEvent.startTime}
                        onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newEvent.endTime}
                        onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newEvent.category}
                      onValueChange={(value) => setNewEvent({ ...newEvent, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Linked Apps (Optional)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {popularApps.map((app) => (
                        <Badge
                          key={app}
                          variant={newEvent.linkedApps.includes(app) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const apps = newEvent.linkedApps.includes(app)
                              ? newEvent.linkedApps.filter((a) => a !== app)
                              : [...newEvent.linkedApps, app]
                            setNewEvent({ ...newEvent, linkedApps: apps })
                          }}
                        >
                          {app}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Linked Websites (Optional)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {popularTabs.map((tab) => (
                        <Badge
                          key={tab}
                          variant={newEvent.linkedTabs.includes(tab) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const tabs = newEvent.linkedTabs.includes(tab)
                              ? newEvent.linkedTabs.filter((t) => t !== tab)
                              : [...newEvent.linkedTabs, tab]
                            setNewEvent({ ...newEvent, linkedTabs: tabs })
                          }}
                        >
                          {tab}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button onClick={createEvent} className="w-full" disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Event"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-medium text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {generateCalendarDays().map((day, index) => {
              const dateStr = day.toISOString().split("T")[0]
              const dayEvents = getEventsForDate(dateStr)
              const dayUsage = getUsageForDate(dateStr)
              const isToday = dateStr === new Date().toISOString().split("T")[0]
              const isSelected = dateStr === selectedDate

              return (
                <div
                  key={index}
                  className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors ${
                    isSelected ? "bg-blue-50 border-blue-300" : "hover:bg-gray-50"
                  } ${isToday ? "ring-2 ring-blue-400" : ""}`}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      day.getMonth() !== new Date().getMonth() ? "text-gray-400" : ""
                    }`}
                  >
                    {day.getDate()}
                  </div>

                  {/* Usage indicator */}
                  {dayUsage && (
                    <div className="flex gap-1 mb-1">
                      <div
                        className="h-1 bg-green-400 rounded"
                        style={{
                          width: `${Math.min((dayUsage.summary.productiveHours / 8) * 100, 100)}%`,
                        }}
                      />
                      <div
                        className="h-1 bg-red-400 rounded"
                        style={{
                          width: `${Math.min((dayUsage.summary.distractionHours / 4) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map((event, eventIndex) => {
                      const category = categories.find((c) => c.value === event.category)
                      return (
                        <div
                          key={eventIndex}
                          className={`text-xs p-1 rounded text-white ${category?.color || "bg-gray-400"}`}
                          title={event.eventName}
                        >
                          {event.eventName.length > 15 ? `${event.eventName.substring(0, 15)}...` : event.eventName}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && <div className="text-xs text-gray-500">+{dayEvents.length - 2} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      <Card>
        <CardHeader>
          <CardTitle>
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Events */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled Events ({getEventsForDate(selectedDate).length})
              </h4>
              <div className="space-y-2">
                {getEventsForDate(selectedDate).map((event, index) => {
                  const category = categories.find((c) => c.value === event.category)
                  return (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${category?.color}`} />
                          <span className="font-medium">{event.eventName}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteEvent(event._id || event.id || "")}
                          className="text-red-500 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(event.startTime)} - {formatDateTime(event.endTime)}
                      </div>
                      {event.linkedApps.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 flex-wrap">
                          <Monitor className="w-3 h-3 text-gray-500" />
                          {event.linkedApps.map((app) => (
                            <Badge key={app} variant="outline" className="text-xs">
                              {app}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {event.linkedTabs.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <span className="text-xs text-gray-500">Sites:</span>
                          {event.linkedTabs.map((tab) => (
                            <Badge key={tab} variant="outline" className="text-xs">
                              {tab}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
                {getEventsForDate(selectedDate).length === 0 && (
                  <div className="text-gray-500 text-center py-4">No events scheduled for this date</div>
                )}
              </div>
            </div>

            {/* Usage */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                Actual Usage
              </h4>
              {(() => {
                const usage = getUsageForDate(selectedDate)
                if (!usage) {
                  return <div className="text-gray-500 text-center py-4">No usage data available for this date</div>
                }

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {formatTime(usage.summary.productiveHours * 60)}
                        </div>
                        <div className="text-sm text-green-700">Productive</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {formatTime(usage.summary.distractionHours * 60)}
                        </div>
                        <div className="text-sm text-red-700">Distracting</div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Top Apps</h5>
                      <div className="space-y-1">
                        {usage.apps.slice(0, 5).map((app, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2">
                              {app.name}
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  app.category === "productive"
                                    ? "text-green-600"
                                    : app.category === "distracting"
                                      ? "text-red-600"
                                      : "text-gray-600"
                                }`}
                              >
                                {app.category}
                              </Badge>
                            </span>
                            <span className="text-gray-600">{formatTime(app.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-2">Top Websites</h5>
                      <div className="space-y-1">
                        {usage.tabs.slice(0, 5).map((tab, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="flex items-center gap-2 truncate">
                              {tab.url}
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  tab.category === "productive"
                                    ? "text-green-600"
                                    : tab.category === "distracting"
                                      ? "text-red-600"
                                      : "text-gray-600"
                                }`}
                              >
                                {tab.category}
                              </Badge>
                            </span>
                            <span className="text-gray-600">{formatTime(tab.duration)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
