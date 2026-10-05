const express = require('express');
const router = express.Router();
const { getEvents, getEventByIdOrSlug, getFeatured } = require('../controllers/eventController');

router.get('/', getEvents);
router.get('/meta/featured', getFeatured);
router.get('/:idOrSlug', getEventByIdOrSlug);

module.exports = router;
