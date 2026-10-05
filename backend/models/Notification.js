const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'booking', 'event', 'system'], default: 'info' },
    isRead: { type: Boolean, default: false },
    relatedEvent: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
