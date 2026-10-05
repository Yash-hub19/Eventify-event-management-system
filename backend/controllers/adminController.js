const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Category = require('../models/Category');
const Notification = require('../models/Notification');

// @desc  Admin dashboard stats
// @route GET /api/admin/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalOrganizers, totalEvents, totalBookings, bookings] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'organizer' }),
      Event.countDocuments(),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.find({ status: 'confirmed' }),
    ]);
    const totalRevenue = bookings.reduce((s, b) => s + b.totalAmount, 0);

    res.json({ totalUsers, totalOrganizers, totalEvents, totalBookings, totalRevenue });
  } catch (err) {
    next(err);
  }
};

// @desc  Get all users (with optional role filter)
// @route GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];
    const users = await User.find(query).sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

// @desc  Activate/deactivate a user
// @route PUT /api/admin/users/:id/status
const setUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.isActive = isActive;
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// @desc  Delete a user
// @route DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc  Approve / reject organizer applications
// @route PUT /api/admin/organizers/:id/status
const setOrganizerStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // approved | rejected
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.organizerStatus = status;
    if (status === 'approved') user.role = 'organizer';
    if (status === 'rejected') user.role = 'user';
    await user.save();

    await Notification.create({
      user: user._id,
      title: 'Organizer application update',
      message: `Your organizer application was ${status}.`,
      type: 'system',
    });

    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// @desc  Get all events (admin moderation view)
// @route GET /api/admin/events
const getEvents = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const events = await Event.find(query).populate('organizer', 'name email').populate('category', 'name').sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    next(err);
  }
};

// @desc  Approve / reject an event
// @route PUT /api/admin/events/:id/status
const setEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body; // approved | rejected | cancelled
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    event.status = status;
    await event.save();

    await Notification.create({
      user: event.organizer,
      title: 'Event status updated',
      message: `Your event "${event.title}" was ${status} by admin.`,
      type: 'event',
      relatedEvent: event._id,
    });

    res.json({ event });
  } catch (err) {
    next(err);
  }
};

// @desc  Delete an event permanently
// @route DELETE /api/admin/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    await event.deleteOne();
    res.json({ message: 'Event deleted permanently' });
  } catch (err) {
    next(err);
  }
};

// @desc  Manage categories - create
// @route POST /api/admin/categories
const createCategory = async (req, res, next) => {
  try {
    const { name, icon } = req.body;
    const slugify = require('slugify');
    const slug = slugify(name, { lower: true, strict: true });
    const category = await Category.create({ name, icon: icon || '🎫', slug });
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
};

// @desc  Delete category
// @route DELETE /api/admin/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
};

// @desc  Reports - revenue & bookings by category / month
// @route GET /api/admin/reports
const getReports = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ status: 'confirmed' }).populate({ path: 'event', populate: { path: 'category' } });

    const byMonth = {};
    const byCategory = {};
    bookings.forEach((b) => {
      const month = b.createdAt.toISOString().slice(0, 7);
      byMonth[month] = (byMonth[month] || 0) + b.totalAmount;
      const catName = b.event?.category?.name || 'Uncategorized';
      byCategory[catName] = (byCategory[catName] || 0) + b.totalAmount;
    });

    const topEvents = await Event.find().sort({ registeredCount: -1 }).limit(5).select('title registeredCount price city');

    res.json({ byMonth, byCategory, topEvents });
  } catch (err) {
    next(err);
  }
};

// @desc  System activity log (recent signups, events, bookings)
// @route GET /api/admin/activity
const getActivity = async (req, res, next) => {
  try {
    const [recentUsers, recentEvents, recentBookings] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
      Event.find().sort({ createdAt: -1 }).limit(5).select('title status createdAt organizer').populate('organizer', 'name'),
      Booking.find().sort({ createdAt: -1 }).limit(5).populate('event', 'title').populate('user', 'name'),
    ]);
    res.json({ recentUsers, recentEvents, recentBookings });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getUsers,
  setUserStatus,
  deleteUser,
  setOrganizerStatus,
  getEvents,
  setEventStatus,
  deleteEvent,
  createCategory,
  deleteCategory,
  getReports,
  getActivity,
};
