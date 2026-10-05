const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getDashboard, getMyEvents, createEvent, updateEvent, deleteEvent,
  getEventBookings, getEventAnalytics, notifyAttendees,
} = require('../controllers/organizerController');

router.use(protect, authorize('organizer', 'admin'));

router.get('/dashboard', getDashboard);
router.get('/events', getMyEvents);
router.post('/events', upload.single('image'), createEvent);
router.put('/events/:id', upload.single('image'), updateEvent);
router.delete('/events/:id', deleteEvent);
router.get('/events/:id/bookings', getEventBookings);
router.get('/events/:id/analytics', getEventAnalytics);
router.post('/events/:id/notify', notifyAttendees);

module.exports = router;
