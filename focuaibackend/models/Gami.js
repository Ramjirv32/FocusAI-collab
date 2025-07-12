// MongoDB Models for Focus AI Gamification System
// Add these to your existing MongoDB schema file

const mongoose = require("mongoose")

// Gamification Schema
const gamificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
    },
    badges: [
      {
        badgeName: {
          type: String,
          required: true,
        },
        earnedDate: {
          type: Date,
          default: Date.now,
        },
        description: {
          type: String,
          required: true,
        },
        icon: {
          type: String,
          default: "trophy",
        },
      },
    ],
    challenges: [
      {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        progress: {
          type: Number,
          default: 0,
        },
        target: {
          type: Number,
          required: true,
        },
        reward: {
          type: Number,
          required: true,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        claimed: {
          type: Boolean,
          default: false,
        },
        createdDate: {
          type: Date,
          default: Date.now,
        },
        expiryDate: {
          type: Date,
        },
      },
    ],
    streaks: {
      current: {
        type: Number,
        default: 0,
      },
      longest: {
        type: Number,
        default: 0,
      },
      lastActiveDate: {
        type: Date,
      },
    },
    preferences: {
      productiveApps: [
        {
          type: String,
        },
      ],
      distractingApps: [
        {
          type: String,
        },
      ],
      productiveTabs: [
        {
          type: String,
        },
      ],
      distractingTabs: [
        {
          type: String,
        },
      ],
      workingHours: {
        start: {
          type: String,
          default: "09:00",
        },
        end: {
          type: String,
          default: "17:00",
        },
      },
    },
    statistics: {
      totalProductiveHours: {
        type: Number,
        default: 0,
      },
      totalDistractionHours: {
        type: Number,
        default: 0,
      },
      averageFocusScore: {
        type: Number,
        default: 0,
      },
      bestFocusDay: {
        date: Date,
        score: Number,
      },
    },
  },
  {
    timestamps: true,
  },
)

// Calendar Event Schema
const calendarEventSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      enum: ["work", "personal", "learning", "break", "meeting"],
      default: "work",
    },
    linkedApps: [
      {
        type: String,
      },
    ],
    linkedTabs: [
      {
        type: String,
      },
    ],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
    },
    actualUsage: {
      apps: [
        {
          name: String,
          duration: Number, // in minutes
          category: String,
        },
      ],
      tabs: [
        {
          url: String,
          title: String,
          duration: Number, // in minutes
          category: String,
        },
      ],
      adherenceScore: {
        type: Number,
        min: 0,
        max: 100,
      },
    },
    reminders: [
      {
        type: {
          type: String,
          enum: ["email", "browser", "desktop"],
        },
        minutesBefore: {
          type: Number,
          default: 15,
        },
        sent: {
          type: Boolean,
          default: false,
        },
      },
    ],
    recurring: {
      enabled: {
        type: Boolean,
        default: false,
      },
      pattern: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
      },
      endDate: Date,
    },
    externalCalendar: {
      provider: {
        type: String,
        enum: ["google", "outlook", "apple"],
      },
      externalId: String,
      synced: {
        type: Boolean,
        default: false,
      },
      lastSyncDate: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Enhanced Usage Data Schema
const usageDataSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD format
      required: true,
    },
    apps: [
      {
        name: {
          type: String,
          required: true,
        },
        duration: {
          type: Number, // in minutes
          required: true,
        },
        category: {
          type: String,
          enum: ["productive", "neutral", "distracting"],
          default: "neutral",
        },
        sessions: [
          {
            startTime: Date,
            endTime: Date,
            duration: Number,
          },
        ],
        windowTitle: String,
        processId: String,
      },
    ],
    tabs: [
      {
        url: {
          type: String,
          required: true,
        },
        title: {
          type: String,
          required: true,
        },
        duration: {
          type: Number, // in minutes
          required: true,
        },
        category: {
          type: String,
          enum: ["productive", "neutral", "distracting"],
          default: "neutral",
        },
        sessions: [
          {
            startTime: Date,
            endTime: Date,
            duration: Number,
          },
        ],
        domain: String,
        favicon: String,
      },
    ],
    summary: {
      productiveHours: {
        type: Number,
        default: 0,
      },
      distractionHours: {
        type: Number,
        default: 0,
      },
      neutralHours: {
        type: Number,
        default: 0,
      },
      totalActiveHours: {
        type: Number,
        default: 0,
      },
      focusScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      topProductiveApp: {
        name: String,
        duration: Number,
      },
      topDistractingApp: {
        name: String,
        duration: Number,
      },
    },
    hourlyBreakdown: [
      {
        hour: {
          type: Number,
          min: 0,
          max: 23,
        },
        productive: Number,
        distracting: Number,
        neutral: Number,
      },
    ],
    goals: [
      {
        type: {
          type: String,
          enum: ["productive_time", "limit_distracting", "focus_score"],
        },
        target: Number,
        actual: Number,
        achieved: Boolean,
      },
    ],
    contextData: {
      workingHours: {
        start: String,
        end: String,
      },
      breaks: [
        {
          startTime: Date,
          endTime: Date,
          duration: Number,
        },
      ],
      interruptions: [
        {
          time: Date,
          type: String,
          duration: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
  },
)

// User Preferences Schema
const userPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    gamification: {
      enabled: {
        type: Boolean,
        default: true,
      },
      notifications: {
        badges: {
          type: Boolean,
          default: true,
        },
        challenges: {
          type: Boolean,
          default: true,
        },
        streaks: {
          type: Boolean,
          default: true,
        },
      },
      privacy: {
        showOnLeaderboard: {
          type: Boolean,
          default: false,
        },
        shareStats: {
          type: Boolean,
          default: false,
        },
      },
    },
    calendar: {
      defaultView: {
        type: String,
        enum: ["month", "week", "day"],
        default: "month",
      },
      showUsageOverlay: {
        type: Boolean,
        default: true,
      },
      autoCreateEvents: {
        type: Boolean,
        default: false,
      },
      externalSync: {
        google: {
          enabled: Boolean,
          refreshToken: String,
          lastSync: Date,
        },
        outlook: {
          enabled: Boolean,
          refreshToken: String,
          lastSync: Date,
        },
      },
    },
    tracking: {
      categories: {
        productive: [
          {
            type: String,
          },
        ],
        distracting: [
          {
            type: String,
          },
        ],
      },
      excludedApps: [
        {
          type: String,
        },
      ],
      excludedDomains: [
        {
          type: String,
        },
      ],
      trackingHours: {
        start: {
          type: String,
          default: "00:00",
        },
        end: {
          type: String,
          default: "23:59",
        },
      },
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for better performance
gamificationSchema.index({ userId: 1 })
calendarEventSchema.index({ userId: 1, startTime: 1 })
usageDataSchema.index({ userId: 1, date: 1 })
userPreferencesSchema.index({ userId: 1 })

// Create models
const GamificationModel = mongoose.model("Gamification", gamificationSchema)
const CalendarEventModel = mongoose.model("CalendarEvent", calendarEventSchema)
const UsageModel = mongoose.model("UsageData", usageDataSchema)
const UserPreferencesModel = mongoose.model("UserPreferences", userPreferencesSchema)

// Export models
module.exports = {
  GamificationModel,
  CalendarEventModel,
  UsageModel,
  UserPreferencesModel,
}

// Example usage and helper functions

// Helper function to calculate focus score
function calculateFocusScore(productiveHours, distractionHours) {
  const totalHours = productiveHours + distractionHours
  if (totalHours === 0) return 0
  return Math.round((productiveHours / totalHours) * 100)
}

// Helper function to categorize apps/tabs
function categorizeItem(name, userPreferences) {
  if (userPreferences.tracking.categories.productive.includes(name)) {
    return "productive"
  }
  if (userPreferences.tracking.categories.distracting.includes(name)) {
    return "distracting"
  }
  return "neutral"
}

// Helper function to generate challenges
function generateWeeklyChallenges(userId, userStats) {
  const challenges = []

  // Focus Master Challenge
  challenges.push({
    id: `focus_master_${Date.now()}`,
    name: "Focus Master",
    description: "Maintain focus for 5+ hours daily for 5 days this week",
    progress: 0,
    target: 5,
    reward: 150,
    completed: false,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
  })

  // Distraction Slayer Challenge
  if (userStats.averageDistractionHours > 2) {
    challenges.push({
      id: `distraction_slayer_${Date.now()}`,
      name: "Distraction Slayer",
      description: "Reduce daily distractions to under 1 hour for 3 days",
      progress: 0,
      target: 3,
      reward: 100,
      completed: false,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
  }

  // Early Bird Challenge
  challenges.push({
    id: `early_bird_${Date.now()}`,
    name: "Early Bird",
    description: "Start productive work before 9 AM for 4 days",
    progress: 0,
    target: 4,
    reward: 75,
    completed: false,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  })

  return challenges
}

// Helper function to update user streaks
async function updateUserStreak(userId, wasProductiveToday) {
  try {
    const gamificationData = await GamificationModel.findOne({ userId })
    if (!gamificationData) return

    const today = new Date().toISOString().split("T")[0]
    const lastActiveDate = gamificationData.streaks.lastActiveDate
      ? gamificationData.streaks.lastActiveDate.toISOString().split("T")[0]
      : null

    if (wasProductiveToday) {
      if (lastActiveDate === today) {
        // Already counted today
        return
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      if (lastActiveDate === yesterdayStr) {
        // Continue streak
        gamificationData.streaks.current += 1
      } else {
        // Start new streak
        gamificationData.streaks.current = 1
      }

      // Update longest streak
      if (gamificationData.streaks.current > gamificationData.streaks.longest) {
        gamificationData.streaks.longest = gamificationData.streaks.current
      }

      gamificationData.streaks.lastActiveDate = new Date()
    } else {
      // Reset current streak if not productive
      gamificationData.streaks.current = 0
    }

    await gamificationData.save()
  } catch (error) {
    console.error("Error updating user streak:", error)
  }
}

// Helper function to check and award badges
async function checkAndAwardBadges(userId, usageData) {
  try {
    const gamificationData = await GamificationModel.findOne({ userId })
    if (!gamificationData) return

    const newBadges = []

    // Focus Master Badge (5+ hours productive in a day)
    if (
      usageData.summary.productiveHours >= 5 &&
      !gamificationData.badges.some((b) => b.badgeName === "Focus Master")
    ) {
      newBadges.push({
        badgeName: "Focus Master",
        earnedDate: new Date(),
        description: "Achieved 5+ hours of productive work in a single day",
        icon: "trophy",
      })
    }

    // Distraction Slayer Badge (less than 30 min distractions with 2+ hours work)
    if (
      usageData.summary.distractionHours <= 0.5 &&
      usageData.summary.productiveHours >= 2 &&
      !gamificationData.badges.some((b) => b.badgeName === "Distraction Slayer")
    ) {
      newBadges.push({
        badgeName: "Distraction Slayer",
        earnedDate: new Date(),
        description: "Kept distractions under 30 minutes while working 2+ hours",
        icon: "target",
      })
    }

    // Early Bird Badge (2+ hours before 10 AM)
    const morningHours = usageData.hourlyBreakdown.filter((h) => h.hour < 10).reduce((sum, h) => sum + h.productive, 0)

    if (morningHours >= 2 && !gamificationData.badges.some((b) => b.badgeName === "Early Bird")) {
      newBadges.push({
        badgeName: "Early Bird",
        earnedDate: new Date(),
        description: "Completed 2+ hours of productive work before 10 AM",
        icon: "star",
      })
    }

    // Streak Champion Badge (7+ day streak)
    if (
      gamificationData.streaks.current >= 7 &&
      !gamificationData.badges.some((b) => b.badgeName === "Streak Champion")
    ) {
      newBadges.push({
        badgeName: "Streak Champion",
        earnedDate: new Date(),
        description: "Maintained a 7+ day productivity streak",
        icon: "zap",
      })
    }

    // Time Optimizer Badge (90%+ focus score)
    if (usageData.summary.focusScore >= 90 && !gamificationData.badges.some((b) => b.badgeName === "Time Optimizer")) {
      newBadges.push({
        badgeName: "Time Optimizer",
        earnedDate: new Date(),
        description: "Achieved 90%+ focus score for the day",
        icon: "trending-up",
      })
    }

    if (newBadges.length > 0) {
      gamificationData.badges.push(...newBadges)
      await gamificationData.save()

      // Send notifications for new badges
      newBadges.forEach((badge) => {
        console.log(`🏆 New badge earned: ${badge.badgeName} for user ${userId}`)
        // Here you could send push notifications, emails, etc.
      })
    }

    return newBadges
  } catch (error) {
    console.error("Error checking and awarding badges:", error)
    return []
  }
}

// Export helper functions
module.exports.helpers = {
  calculateFocusScore,
  categorizeItem,
  generateWeeklyChallenges,
  updateUserStreak,
  checkAndAwardBadges,
}
