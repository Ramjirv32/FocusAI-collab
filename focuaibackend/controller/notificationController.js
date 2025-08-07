const Notification = require('../models/Notification');

const notificationController = {
  // Get user notifications
  async getNotifications(req, res) {
    try {
      const { limit = 20, type, unreadOnly = false } = req.query;
      
      let query = { userId: req.user._id };
      
      if (type && type !== 'all') {
        query.type = type;
      }
      
      if (unreadOnly === 'true') {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      const unreadCount = await Notification.countDocuments({
        userId: req.user._id,
        read: false
      });

      res.json({
        notifications,
        unreadCount,
        total: notifications.length
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { notificationId } = req.params;
      
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId: req.user._id },
        { read: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json(notification);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to update notification' });
    }
  },

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      await Notification.updateMany(
        { userId: req.user._id, read: false },
        { read: true, readAt: new Date() }
      );

      res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to update notifications' });
    }
  },

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { notificationId } = req.params;
      
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        userId: req.user._id
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
    }
  },

  // Create notification
  async createNotification(req, res) {
    try {
      const {
        type,
        title,
        message,
        data = {},
        priority = 'medium',
        expiresAt,
        actionUrl,
        actionLabel
      } = req.body;

      const notification = new Notification({
        userId: req.user._id,
        email: req.user.email,
        type,
        title,
        message,
        data,
        priority,
        expiresAt,
        actionUrl,
        actionLabel
      });

      await notification.save();

      res.status(201).json(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
    }
  },

  // Get notification statistics
  async getNotificationStats(req, res) {
    try {
      const stats = await Notification.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
            unreadCount: {
              $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
            }
          }
        }
      ]);

      const totalCount = await Notification.countDocuments({ userId: req.user._id });
      const totalUnread = await Notification.countDocuments({ 
        userId: req.user._id, 
        read: false 
      });

      res.json({
        total: totalCount,
        unread: totalUnread,
        byType: stats
      });
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      res.status(500).json({ error: 'Failed to fetch notification statistics' });
    }
  }
};

// Helper function to create system notifications
const createSystemNotification = async (userId, email, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      userId,
      email,
      type,
      title,
      message,
      data,
      priority: 'medium'
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating system notification:', error);
  }
};

// Helper function to create achievement notification
const createAchievementNotification = async (userId, email, badgeName, points) => {
  return createSystemNotification(
    userId,
    email,
    'achievement',
    'New Achievement Unlocked! 🏆',
    `Congratulations! You've earned the "${badgeName}" badge and gained ${points} points!`,
    { badgeName, points }
  );
};

// Helper function to create focus reminder
const createFocusReminder = async (userId, email, focusScore) => {
  let message = 'Time for a focus session! Let\'s boost your productivity.';
  
  if (focusScore < 60) {
    message = 'Your focus score is low today. Let\'s get back on track!';
  } else if (focusScore > 80) {
    message = 'Great focus today! Keep up the excellent work.';
  }

  return createSystemNotification(
    userId,
    email,
    'focus',
    'Focus Reminder 🎯',
    message,
    { focusScore }
  );
};

module.exports = {
  notificationController,
  createSystemNotification,
  createAchievementNotification,
  createFocusReminder
};
