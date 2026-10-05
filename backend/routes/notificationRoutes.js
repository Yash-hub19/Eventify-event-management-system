const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotifications, markRead } = require('../controllers/notificationController');

router.use(protect);
router.get('/', getNotifications);
router.put('/read', markRead);

module.exports = router;
