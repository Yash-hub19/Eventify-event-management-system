const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const sendEmail = require('../utils/sendEmail');
const { generateBookingCode, generateQRCode } = require('../utils/generateTicket');

// @desc  Book tickets for an event (simulated payment)
// @route POST /api/bookings
const createBooking = async (req, res, next) => {
  try {
    const { eventId, ticketTypeName, quantity = 1, attendeeName, attendeeEmail } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status !== 'approved') return res.status(400).json({ message: 'This event is not open for booking' });

    let ticketType;
    let unitPrice;
    if (event.ticketTypes && event.ticketTypes.length > 0) {
      ticketType = event.ticketTypes.id(req.body.ticketTypeId) || event.ticketTypes.find((t) => t.name === ticketTypeName);
      if (!ticketType) return res.status(400).json({ message: 'Invalid ticket type' });
      if (ticketType.sold + Number(quantity) > ticketType.quantity) {
        return res.status(400).json({ message: 'Not enough tickets available for this type' });
      }
      unitPrice = ticketType.price;
    } else {
      if (event.registeredCount + Number(quantity) > event.capacity) {
        return res.status(400).json({ message: 'Event is at full capacity' });
      }
      unitPrice = event.price;
    }

    const totalAmount = unitPrice * Number(quantity);
    const bookingCode = generateBookingCode();

    const booking = await Booking.create({
      event: event._id,
      user: req.user._id,
      ticketTypeName: ticketType ? ticketType.name : 'General Admission',
      ticketPrice: unitPrice,
      quantity,
      totalAmount,
      bookingCode,
      attendeeName: attendeeName || req.user.name,
      attendeeEmail: attendeeEmail || req.user.email,
      paymentStatus: 'paid', // simulated - no real payment gateway
    });

    booking.qrCode = await generateQRCode({
      bookingCode,
      event: event.title,
      attendee: booking.attendeeName,
      quantity,
    });
    await booking.save();

    if (ticketType) {
      ticketType.sold += Number(quantity);
    }
    event.registeredCount += Number(quantity);
    await event.save();

    await Notification.create({
      user: req.user._id,
      title: 'Booking confirmed',
      message: `Your booking for "${event.title}" is confirmed. Code: ${bookingCode}`,
      type: 'booking',
      relatedEvent: event._id,
    });

    sendEmail({
      to: booking.attendeeEmail,
      subject: `Ticket Confirmation - ${event.title}`,
      html: `<p>Hi ${booking.attendeeName},</p><p>Your booking is confirmed!</p><p><b>Event:</b> ${event.title}<br/><b>Date:</b> ${new Date(event.date).toDateString()}<br/><b>Venue:</b> ${event.venue}<br/><b>Booking Code:</b> ${bookingCode}<br/><b>Quantity:</b> ${quantity}<br/><b>Total:</b> $${totalAmount}</p>`,
    }).catch((e) => console.error('Email send failed:', e.message));

    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
};

// @desc  Get logged-in user's bookings
// @route GET /api/bookings/my
const getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({ path: 'event', populate: { path: 'category', select: 'name icon' } })
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

// @desc  Get single booking (for ticket view/download)
// @route GET /api/bookings/:id
const getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('event').populate('user', 'name email');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }
    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

// @desc  Cancel a booking
// @route PUT /api/bookings/:id/cancel
const cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('event');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking already cancelled' });
    }

    booking.status = 'cancelled';
    booking.paymentStatus = 'refunded';
    await booking.save();

    const event = await Event.findById(booking.event._id);
    if (event) {
      event.registeredCount = Math.max(0, event.registeredCount - booking.quantity);
      if (event.ticketTypes && event.ticketTypes.length > 0) {
        const tt = event.ticketTypes.find((t) => t.name === booking.ticketTypeName);
        if (tt) tt.sold = Math.max(0, tt.sold - booking.quantity);
      }
      await event.save();
    }

    await Notification.create({
      user: req.user._id,
      title: 'Booking cancelled',
      message: `Your booking (${booking.bookingCode}) has been cancelled and refunded (simulated).`,
      type: 'booking',
    });

    res.json({ message: 'Booking cancelled successfully', booking });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking, getMyBookings, getBooking, cancelBooking };
