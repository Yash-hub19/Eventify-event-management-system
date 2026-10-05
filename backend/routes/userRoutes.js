const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateProfile, changePassword, toggleFavorite, getFavorites, requestOrganizer } = require('../controllers/userController');

router.use(protect);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.get('/favorites', getFavorites);
router.post('/favorites/:eventId', toggleFavorite);
router.post('/request-organizer', requestOrganizer);

module.exports = router;
