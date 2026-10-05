const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { buildSlug } = require('./eventController');

const requireApprovedOrganizer = (user) => user.role === 'organizer' && user.organizerStatus !== 'rejected';

// @desc  Organizer dashboard summary
// @route GET /api/organizer/dashboard
const getDashboard = async (req, res, next) => {
  try {
    const organizerId = req.user._id;
    const events = await Event.find({ organizer: organizerId });
    const eventIds = events.map((e) => e._id);

    const bookings = await Booking.find({ event: { $in: eventIds }, status: 'confirmed' }).populate('event', 'title');

    const totalRegistrations = bookings.reduce((sum, b) => sum + b.quantity, 0);
    const revenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);
    const upcomingEvents = events.filter((e) => new Date(e.date) >= new Date()).length;
    const recentBookings = bookings
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8)
      .map((b) => ({
        id: b._id,
        eventTitle: b.event?.title,
        attendee: b.attendeeName,
        quantity: b.quantity,
        amount: b.totalAmount,
        code: b.bookingCode,
        date: b.createdAt,
      }));

    res.json({
      totalEvents: events.length,
      totalRegistrations,
      revenue,
      upcomingEvents,
      recentBookings,
    });
  } catch (err) {
    next(err);
  }
};

// @desc  Get organizer's own events
// @route GET /api/organizer/events
const getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).populate('category', 'name icon').sort({ createdAt: -1 });
    res.json({ events });
  } catch (err) {
    next(err);
  }
};

// @desc  Create event
// @route POST /api/organizer/events
const createEvent = async (req, res, next) => {
  try {
    const {
      title, description, category, venue, city, date, endDate, time,
      price, capacity, ticketTypes, tags,
    } = req.body;

    if (!title || !description || !category || !venue || !city || !date || !time) {
      return res.status(400).json({ message: 'Missing required event fields' });
    }

    const slug = await buildSlug(title);
    const image = req.file ? `/uploads/events/${req.file.filename}` : (req.body.image || '');

    let parsedTicketTypes = [];
    if (ticketTypes) {
      parsedTicketTypes = typeof ticketTypes === 'string' ? JSON.parse(ticketTypes) : ticketTypes;
    }

    const event = await Event.create({
      title,
      slug,
      description,
      category,
      organizer: req.user._id,
      image,
      venue,
      city,
      date,
      endDate: endDate || undefined,
      time,
      price: price || (parsedTicketTypes[0]?.price ?? 0),
      capacity: capacity || 100,
      ticketTypes: parsedTicketTypes,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t) => t.trim()) : tags) : [],
      status: 'approved', // auto-approved for demo; admin can still moderate
    });

    res.status(201).json({ event });
  } catch (err) {
    next(err);
  }
};

// @desc  Update event
// @route PUT /api/organizer/events/:id
const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const fields = ['title', 'description', 'category', 'venue', 'city', 'date', 'endDate', 'time', 'price', 'capacity', 'tags'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) event[f] = req.body[f];
    });

    if (req.body.tags && typeof req.body.tags === 'string') {
      event.tags = req.body.tags.split(',').map((t) => t.trim());
    }
    if (req.body.ticketTypes) {
      event.ticketTypes = typeof req.body.ticketTypes === 'string' ? JSON.parse(req.body.ticketTypes) : req.body.ticketTypes;
    }
    if (req.file) {
      event.image = `/uploads/events/${req.file.filename}`;
    }
    if (req.body.title) {
      event.slug = await buildSlug(req.body.title);
    }

    await event.save();
    res.json({ event });
  } catch (err) {
    next(err);
  }
};

// @desc  Delete / cancel event
// @route DELETE /api/organizer/events/:id
const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    event.status = 'cancelled';
    await event.save();

    const bookings = await Booking.find({ event: event._id, status: 'confirmed' });
    await Promise.all(
      bookings.map((b) =>
        Notification.create({
          user: b.user,
          title: 'Event cancelled',
          message: `"${event.title}" has been cancelled by the organizer.`,
          type: 'event',
          relatedEvent: event._id,
        })
      )
    );

    res.json({ message: 'Event cancelled', event });
  } catch (err) {
    next(err);
  }
};

// @desc  Get registrations/bookings for a specific event
// @route GET /api/organizer/events/:id/bookings
const getEventBookings = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const bookings = await Booking.find({ event: event._id }).populate('user', 'name email').sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

// @desc  Event analytics (bookings over time, ticket type breakdown)
// @route GET /api/organizer/events/:id/analytics
const getEventAnalytics = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const bookings = await Booking.find({ event: event._id, status: 'confirmed' });

    const byTicketType = {};
    bookings.forEach((b) => {
      byTicketType[b.ticketTypeName] = (byTicketType[b.ticketTypeName] || 0) + b.quantity;
    });

    const byDate = {};
    bookings.forEach((b) => {
      const d = b.createdAt.toISOString().slice(0, 10);
      byDate[d] = (byDate[d] || 0) + b.quantity;
    });

    res.json({
      totalRevenue: bookings.reduce((s, b) => s + b.totalAmount, 0),
      totalTicketsSold: bookings.reduce((s, b) => s + b.quantity, 0),
      capacity: event.capacity,
      percentFilled: event.capacity ? Math.round((event.registeredCount / event.capacity) * 100) : 0,
      byTicketType,
      byDate,
      ratingAvg: event.ratingAvg,
      ratingCount: event.ratingCount,
    });
  } catch (err) {
    next(err);
  }
};

// @desc  Send notification to all attendees of an event
// @route POST /api/organizer/events/:id/notify
const notifyAttendees = async (req, res, next) => {
  try {
    const { title, message } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const bookings = await Booking.find({ event: event._id, status: 'confirmed' }).distinct('user');
    await Promise.all(
      bookings.map((userId) =>
        Notification.create({
          user: userId,
          title: title || `Update: ${event.title}`,
          message,
          type: 'event',
          relatedEvent: event._id,
        })
      )
    );

    res.json({ message: `Notification sent to ${bookings.length} attendees` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getMyEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventBookings,
  getEventAnalytics,
  notifyAttendees,
};
