const notificationService = require('../services/notificationService');

/**
 * Get notifications for current user
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const notifications = await notificationService.getUserNotifications(userId, userRole);
    
    res.json({
      success: true,
      data: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    next(error);
  }
}

module.exports = {
  getNotifications
};

