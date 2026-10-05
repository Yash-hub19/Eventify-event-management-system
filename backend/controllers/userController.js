const User = require('../models/User');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

// @desc  Update own profile
// @route PUT /api/users/profile
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (bio !== undefined) user.bio = bio;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// @desc  Change password while logged in
// @route PUT /api/users/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
};

// @desc  Toggle favorite event
// @route POST /api/users/favorites/:eventId
const toggleFavorite = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const idx = user.favorites.findIndex((f) => f.toString() === req.params.eventId);
    let favorited;
    if (idx > -1) {
      user.favorites.splice(idx, 1);
      favorited = false;
    } else {
      user.favorites.push(event._id);
      favorited = true;
    }
    await user.save();
    res.json({ favorited, favorites: user.favorites });
  } catch (err) {
    next(err);
  }
};

// @desc  Get favorite events
// @route GET /api/users/favorites
const getFavorites = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'favorites',
      populate: { path: 'category', select: 'name icon' },
    });
    res.json({ favorites: user.favorites });
  } catch (err) {
    next(err);
  }
};

// @desc  Request organizer role
// @route POST /api/users/request-organizer
const requestOrganizer = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.role === 'organizer' || user.role === 'admin') {
      return res.status(400).json({ message: 'You already have organizer privileges' });
    }
    user.organizerStatus = 'pending';
    await user.save();
    res.json({ message: 'Organizer request submitted for admin approval', organizerStatus: user.organizerStatus });
  } catch (err) {
    next(err);
  }
};

module.exports = { updateProfile, changePassword, toggleFavorite, getFavorites, requestOrganizer };
