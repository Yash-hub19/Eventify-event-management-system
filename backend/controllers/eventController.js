const Event = require('../models/Event');
const Review = require('../models/Review');
const slugify = require('slugify');

// @desc  Get all events with search / filter / pagination
// @route GET /api/events
const getEvents = async (req, res, next) => {
  try {
    const {
      search,
      category,
      city,
      dateFrom,
      dateTo,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = { status: 'approved' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { venue: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }
    if (category) query.category = category;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = new Date(dateFrom);
      if (dateTo) query.date.$lte = new Date(dateTo);
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = { date: 1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'rating') sortOption = { ratingAvg: -1 };

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate('category', 'name icon slug')
        .populate('organizer', 'name email')
        .sort(sortOption)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Event.countDocuments(query),
    ]);

    res.json({
      events,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    next(err);
  }
};

// @desc  Get single event by slug or id
// @route GET /api/events/:idOrSlug
const getEventByIdOrSlug = async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
    const event = await Event.findOne(query)
      .populate('category', 'name icon slug')
      .populate('organizer', 'name email avatar');
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const reviews = await Review.find({ event: event._id }).populate('user', 'name avatar').sort({ createdAt: -1 });

    res.json({ event, reviews });
  } catch (err) {
    next(err);
  }
};

// @desc  Get featured / upcoming events for homepage
// @route GET /api/events/meta/featured
const getFeatured = async (req, res, next) => {
  try {
    const events = await Event.find({ status: 'approved', date: { $gte: new Date() } })
      .populate('category', 'name icon slug')
      .sort({ isFeatured: -1, date: 1 })
      .limit(8);
    res.json({ events });
  } catch (err) {
    next(err);
  }
};

const buildSlug = async (title) => {
  let base = slugify(title, { lower: true, strict: true });
  let slug = base;
  let count = 1;
  while (await Event.findOne({ slug })) {
    slug = `${base}-${count++}`;
  }
  return slug;
};

module.exports = { getEvents, getEventByIdOrSlug, getFeatured, buildSlug };
