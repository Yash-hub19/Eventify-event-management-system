require('dotenv').config();
const mongoose = require('mongoose');
const slugify = require('slugify');
const connectDB = require('../config/db');

const User = require('../models/User');
const Category = require('../models/Category');
const Event = require('../models/Event');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Notification = require('../models/Notification');

const run = async () => {
  await connectDB();

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Event.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  console.log('Creating users...');
  const admin = await User.create({ name: 'Admin', email: 'admin@eventify.com', password: 'password: process.env.ADMIN_PASSWORD', role: 'admin' });
  const organizer = await User.create({ name: 'Priya Sharma', email: 'organizer@eventify.com', password: 'password: process.env.ORGANIZER_PASSWORD', role: 'organizer', organizerStatus: 'approved' });
  const demoUser = await User.create({ name: 'Rahul Verma', email: 'user@eventify.com', password: 'password: process.env.USER_PASSWORD', role: 'user' });

  console.log('Creating categories...');
  const categoryData = [
    { name: 'Education', icon: '🎓' },
    { name: 'Marriage', icon: '💍' },
    { name: 'Birthday', icon: '🎂' },
    { name: 'Concert', icon: '🎵' },
    { name: 'Technology', icon: '💻' },
    { name: 'Sports', icon: '⚽' },
    { name: 'Food & Drink', icon: '🍽️' },
    { name: 'Business', icon: '💼' },
  ];
  const categories = await Category.insertMany(
    categoryData.map((c) => ({ ...c, slug: slugify(c.name, { lower: true, strict: true }) }))
  );
  const catByName = (name) => categories.find((c) => c.name === name)._id;

  console.log('Creating events...');
  const today = new Date();
  const daysFromNow = (n) => new Date(today.getTime() + n * 24 * 60 * 60 * 1000);

  const eventsData = [
    {
      title: 'National EdTech Summit 2026',
      description: 'A gathering of educators, students, and edtech innovators exploring the future of learning. Keynotes, workshops, and networking with leaders shaping how the world learns.',
      category: catByName('Education'),
      venue: 'Grand Convention Center',
      city: 'Pune',
      date: daysFromNow(20),
      time: '09:00 AM',
      price: 499,
      capacity: 300,
      image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=500&fit=crop',
      tags: ['education', 'summit', 'learning'],
      ticketTypes: [
        { name: 'General', price: 499, quantity: 200, sold: 0 },
        { name: 'VIP', price: 1499, quantity: 50, sold: 0 },
      ],
      isFeatured: true,
    },
    {
      title: 'Aarav & Diya - Wedding Celebration',
      description: 'Join us for an elegant evening of celebration as two families come together. An unforgettable night of music, food, and joyous festivities.',
      category: catByName('Marriage'),
      venue: 'Royal Palace Gardens',
      city: 'Jaipur',
      date: daysFromNow(45),
      time: '06:00 PM',
      price: 0,
      capacity: 500,
      image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=500&fit=crop',
      tags: ['wedding', 'celebration'],
      ticketTypes: [{ name: 'Guest Entry', price: 0, quantity: 500, sold: 0 }],
    },
    {
      title: 'Sparkle Birthday Bash - Turning 10!',
      description: 'A magical birthday party full of games, cake, music, and surprises for kids and families. Come celebrate this special milestone with us!',
      category: catByName('Birthday'),
      venue: 'Funland Party Hall',
      city: 'Mumbai',
      date: daysFromNow(12),
      time: '04:00 PM',
      price: 199,
      capacity: 80,
      image: 'https://images.unsplash.com/photo-1464349153735-7db50ed83c84?w=800&h=500&fit=crop',
      tags: ['birthday', 'kids', 'party'],
      ticketTypes: [{ name: 'Entry Pass', price: 199, quantity: 80, sold: 0 }],
    },
    {
      title: 'Starlight Live - Rock Concert',
      description: 'An electrifying night of live rock music featuring top bands and stunning stage visuals. Get ready to sing, dance, and lose yourself in the music.',
      category: catByName('Concert'),
      venue: 'Open Air Amphitheatre',
      city: 'Bengaluru',
      date: daysFromNow(30),
      time: '07:00 PM',
      price: 999,
      capacity: 1000,
      image: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=500&fit=crop',
      tags: ['concert', 'music', 'live'],
      ticketTypes: [
        { name: 'Silver', price: 999, quantity: 600, sold: 0 },
        { name: 'Gold', price: 1999, quantity: 300, sold: 0 },
        { name: 'Platinum', price: 3999, quantity: 100, sold: 0 },
      ],
      isFeatured: true,
    },
    {
      title: 'DevConnect - Full Stack Developer Conference',
      description: 'A full day of talks and hands-on workshops on modern web development, cloud, and AI. Meet fellow developers and industry experts.',
      category: catByName('Technology'),
      venue: 'Tech Hub Auditorium',
      city: 'Hyderabad',
      date: daysFromNow(25),
      time: '10:00 AM',
      price: 799,
      capacity: 250,
      image: 'https://images.unsplash.com/photo-1550439062-609e1531270e?w=800&h=500&fit=crop',
      tags: ['tech', 'developers', 'conference'],
      ticketTypes: [
        { name: 'Standard', price: 799, quantity: 200, sold: 0 },
        { name: 'Workshop Pass', price: 1299, quantity: 50, sold: 0 },
      ],
      isFeatured: true,
    },
    {
      title: 'City Marathon 2026',
      description: 'Lace up for the annual city marathon! Choose from 5K, 10K, and full marathon categories. Includes finisher medal, refreshments, and live cheer zones.',
      category: catByName('Sports'),
      venue: 'City Central Stadium',
      city: 'Delhi',
      date: daysFromNow(50),
      time: '06:00 AM',
      price: 349,
      capacity: 2000,
      image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&h=500&fit=crop',
      tags: ['marathon', 'sports', 'run'],
      ticketTypes: [
        { name: '5K Run', price: 349, quantity: 800, sold: 0 },
        { name: '10K Run', price: 499, quantity: 700, sold: 0 },
        { name: 'Full Marathon', price: 799, quantity: 500, sold: 0 },
      ],
    },
    {
      title: 'Flavors of the City - Food Festival',
      description: 'Taste your way through the best street food, gourmet stalls, and live cooking demos from the city\u2019s top chefs and vendors.',
      category: catByName('Food & Drink'),
      venue: 'Riverside Fairgrounds',
      city: 'Chennai',
      date: daysFromNow(15),
      time: '11:00 AM',
      price: 149,
      capacity: 600,
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=500&fit=crop',
      tags: ['food', 'festival'],
      ticketTypes: [{ name: 'Entry Pass', price: 149, quantity: 600, sold: 0 }],
    },
    {
      title: 'Startup Founders Meetup',
      description: 'Network with founders, investors, and mentors. Pitch sessions, panel discussions, and plenty of coffee-fueled conversations about building great companies.',
      category: catByName('Business'),
      venue: 'Innovation Co-working Space',
      city: 'Pune',
      date: daysFromNow(8),
      time: '05:00 PM',
      price: 0,
      capacity: 120,
      image: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=500&fit=crop',
      tags: ['startup', 'networking', 'business'],
      ticketTypes: [{ name: 'Free Entry', price: 0, quantity: 120, sold: 0 }],
    },
  ];

  const createdEvents = [];
  for (const e of eventsData) {
    const slug = slugify(e.title, { lower: true, strict: true });
    const event = await Event.create({ ...e, slug, organizer: organizer._id, status: 'approved' });
    createdEvents.push(event);
  }

  console.log(`Seed complete: ${createdEvents.length} events created.`);

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});