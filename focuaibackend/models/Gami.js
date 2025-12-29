


const mongoose = require("mongoose")


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
          duration: Number, 
          category: String,
        },
      ],
      tabs: [
        {
          url: String,
          title: String,
          duration: Number, 
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


const usageDataSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    date: {
      type: String, 
      required: true,
    },
    apps: [
      {
        name: {
          type: String,
          required: true,
        },
        duration: {
          type: Number, 
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
          type: Number, 
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


gamificationSchema.index({ userId: 1 })
calendarEventSchema.index({ userId: 1, startTime: 1 })
usageDataSchema.index({ userId: 1, date: 1 })
userPreferencesSchema.index({ userId: 1 })


const GamificationModel = mongoose.model("Gamification", gamificationSchema)
const CalendarEventModel = mongoose.model("CalendarEvent", calendarEventSchema)
const UsageModel = mongoose.model("UsageData", usageDataSchema)
const UserPreferencesModel = mongoose.model("UserPreferences", userPreferencesSchema)


module.exports = {
  GamificationModel,
  CalendarEventModel,
  UsageModel,
  UserPreferencesModel,
}




function calculateFocusScore(productiveHours, distractionHours) {
  const totalHours = productiveHours + distractionHours
  if (totalHours === 0) return 0
  return Math.round((productiveHours / totalHours) * 100)
}


function categorizeItem(name, userPreferences) {
  if (userPreferences.tracking.categories.productive.includes(name)) {
    return "productive"
  }
  if (userPreferences.tracking.categories.distracting.includes(name)) {
    return "distracting"
  }
  return "neutral"
}


function generateWeeklyChallenges(userId, userStats) {
  const challenges = []

  
  challenges.push({
    id: `focus_master_${Date.now()}`,
    name: "Focus Master",
    description: "Maintain focus for 5+ hours daily for 5 days this week",
    progress: 0,
    target: 5,
    reward: 150,
    completed: false,
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
  })

  
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
        
        return
      }

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split("T")[0]

      if (lastActiveDate === yesterdayStr) {
        
        gamificationData.streaks.current += 1
      } else {
        
        gamificationData.streaks.current = 1
      }

      
      if (gamificationData.streaks.current > gamificationData.streaks.longest) {
        gamificationData.streaks.longest = gamificationData.streaks.current
      }

      gamificationData.streaks.lastActiveDate = new Date()
    } else {
      
      gamificationData.streaks.current = 0
    }

    await gamificationData.save()
  } catch (error) {
    console.error("Error updating user streak:", error)
  }
}


async function checkAndAwardBadges(userId, usageData) {
  try {
    const gamificationData = await GamificationModel.findOne({ userId })
    if (!gamificationData) return

    const newBadges = []

    
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

    
    const morningHours = usageData.hourlyBreakdown.filter((h) => h.hour < 10).reduce((sum, h) => sum + h.productive, 0)

    if (morningHours >= 2 && !gamificationData.badges.some((b) => b.badgeName === "Early Bird")) {
      newBadges.push({
        badgeName: "Early Bird",
        earnedDate: new Date(),
        description: "Completed 2+ hours of productive work before 10 AM",
        icon: "star",
      })
    }

    
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

      
      newBadges.forEach((badge) => {
        console.log(`🏆 New badge earned: ${badge.badgeName} for user ${userId}`)
        
      })
    }

    return newBadges
  } catch (error) {
    console.error("Error checking and awarding badges:", error)
    return []
  }
}


module.exports.helpers = {
  calculateFocusScore,
  categorizeItem,
  generateWeeklyChallenges,
  updateUserStreak,
  checkAndAwardBadges,
}
