const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { addReview, deleteReview } = require('../controllers/reviewController');

router.post('/:eventId', protect, addReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
