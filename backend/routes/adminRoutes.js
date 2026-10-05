const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboard, getUsers, setUserStatus, deleteUser, setOrganizerStatus,
  getEvents, setEventStatus, deleteEvent, createCategory, deleteCategory,
  getReports, getActivity,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.put('/users/:id/status', setUserStatus);
router.delete('/users/:id', deleteUser);
router.put('/organizers/:id/status', setOrganizerStatus);
router.get('/events', getEvents);
router.put('/events/:id/status', setEventStatus);
router.delete('/events/:id', deleteEvent);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);
router.get('/reports', getReports);
router.get('/activity', getActivity);

module.exports = router;
