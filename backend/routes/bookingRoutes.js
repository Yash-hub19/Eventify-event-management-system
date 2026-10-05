const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { createBooking, getMyBookings, getBooking, cancelBooking } = require('../controllers/bookingController');

router.use(protect);
router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:id', getBooking);
router.put('/:id/cancel', cancelBooking);

module.exports = router;
