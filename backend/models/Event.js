const mongoose = require('mongoose');

const ticketTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. General, VIP, Early Bird
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    sold: { type: Number, default: 0 },
  },
  { _id: true }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    image: { type: String, default: '' },
    venue: { type: String, required: true },
    city: { type: String, required: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    time: { type: String, required: true },
    price: { type: Number, required: true, default: 0 }, // base/starting price for filtering
    capacity: { type: Number, required: true, default: 100 },
    registeredCount: { type: Number, default: 0 },
    ticketTypes: [ticketTypeSchema],
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'approved' },
    isFeatured: { type: Boolean, default: false },
    tags: [{ type: String }],
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

eventSchema.index({ title: 'text', description: 'text', venue: 'text', city: 'text' });

module.exports = mongoose.model('Event', eventSchema);
