const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketTypeName: { type: String, required: true },
    ticketPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    totalAmount: { type: Number, required: true },
    bookingCode: { type: String, required: true, unique: true },
    qrCode: { type: String, default: '' }, // base64 data URL
    status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
    paymentStatus: { type: String, enum: ['paid', 'refunded'], default: 'paid' }, // simulated payment
    attendeeName: { type: String, required: true },
    attendeeEmail: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Booking', bookingSchema);
