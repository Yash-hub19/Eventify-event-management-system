const Review = require('../models/Review');
const Event = require('../models/Event');
const Booking = require('../models/Booking');

const recalcRating = async (eventId) => {
  const stats = await Review.aggregate([
    { $match: { event: eventId } },
    { $group: { _id: '$event', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const event = await Event.findById(eventId);
  if (stats.length > 0) {
    event.ratingAvg = Math.round(stats[0].avg * 10) / 10;
    event.ratingCount = stats[0].count;
  } else {
    event.ratingAvg = 0;
    event.ratingCount = 0;
  }
  await event.save();
};

// @desc  Add review to an event (must have booked it)
// @route POST /api/reviews/:eventId
const addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const { eventId } = req.params;

    const hasBooking = await Booking.findOne({ event: eventId, user: req.user._id, status: 'confirmed' });
    if (!hasBooking) {
      return res.status(403).json({ message: 'You can only review events you have booked' });
    }

    const existing = await Review.findOne({ event: eventId, user: req.user._id });
    if (existing) return res.status(400).json({ message: 'You already reviewed this event' });

    const review = await Review.create({ event: eventId, user: req.user._id, rating, comment });
    await recalcRating(eventId);

    const populated = await review.populate('user', 'name avatar');
    res.status(201).json({ review: populated });
  } catch (err) {
    next(err);
  }
};

// @desc  Delete own review
// @route DELETE /api/reviews/:id
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const eventId = review.event;
    await review.deleteOne();
    await recalcRating(eventId);
    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { addReview, deleteReview };
