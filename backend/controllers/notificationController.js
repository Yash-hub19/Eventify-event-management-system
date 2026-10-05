const Notification = require('../models/Notification');

// @desc  Get my notifications
// @route GET /api/notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) {
    next(err);
  }
};

// @desc  Mark notification(s) as read
// @route PUT /api/notifications/read
const markRead = async (req, res, next) => {
  try {
    const { id } = req.body; // optional single id, else mark all read
    if (id) {
      await Notification.updateOne({ _id: id, user: req.user._id }, { isRead: true });
    } else {
      await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
    }
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, markRead };
