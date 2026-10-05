# Eventify — Full-Stack Event Management System (MERN-style)

A complete event management platform with three roles — **User**, **Organizer**, and **Admin** —
built with **MongoDB, Express, Node.js** on the backend and **plain HTML/CSS/JavaScript** on the frontend
(no framework, as requested).

---

## ✨ What's included

### 👤 User side
- Register / Login with **JWT** auth, passwords hashed with **bcrypt**
- Forgot / reset password flow (emails are sent via Nodemailer if configured, otherwise
  logged to the server console **and** returned in the API response in dev mode so you can test without SMTP)
- Editable profile (name, phone, bio) + change password
- Browse, search, and filter events by **category, location, date, price**
- Event details page with reviews & ratings
- Book tickets (supports multiple ticket types per event, e.g. General/VIP)
- **Simulated payment** — no real payment gateway, as requested. A "Confirm & Pay" button
  instantly marks the booking as paid.
- Auto-generated **QR code ticket** + unique booking code
- Booking history, ticket download (downloads a self-contained HTML ticket file), cancel booking
- Favorite events (heart icon)
- In-app notifications (booking confirmations, cancellations, organizer announcements)

### 🧑‍💼 Organizer side
- Dashboard: total events, total registrations, revenue, upcoming events, recent bookings
- Create / edit / cancel events
- Upload an event image (stored locally via Multer, served from `/uploads`)
- Set venue, date/time, price, capacity, and **multiple ticket types** (name/price/quantity each)
- View registered users per event, manage bookings
- Per-event analytics (revenue, tickets sold, % capacity filled, breakdown by ticket type)
- Send a notification to everyone who booked a given event

### 👑 Admin side
- Platform-wide dashboard: total users, organizers, events, bookings, revenue
- Manage users (activate/deactivate/delete)
- Approve/reject organizer applications
- Approve/reject/delete events (moderation)
- Manage event categories
- Reports: revenue by category/month, top events
- System activity feed (recent signups, events, bookings)

### Pre-seeded content
The seed script creates **8 sample events** across 8 categories (Education, Marriage, Birthday,
Concert, Technology, Sports, Food & Drink, Business) plus 3 demo accounts. Any event an organizer
creates afterward shows up in the **same browse grid**, sorted the same way as the seed events —
there's no special-casing, it's just one shared `events` collection.

---

## 🧱 Tech stack

| Layer | Tech |
|---|---|
| Frontend | HTML + CSS + vanilla JavaScript (fetch-based SPA-ish multi-page app) |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt |
| API style | REST |
| Image uploads | Multer (local disk storage under `backend/uploads/events`) |
| Tickets | `qrcode` npm package (QR encodes booking code + event + attendee) |
| Payments | **Simulated only** — no Stripe/Razorpay/etc. integration |
| Email | Nodemailer (falls back to console logging if SMTP env vars aren't set) |

---

## 🚀 Getting started

### 1. Prerequisites
- Node.js 18+
- A MongoDB instance — either a local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# edit .env: set MONGO_URI to your MongoDB connection string, and set a real JWT_SECRET
npm run seed     # populates the DB with categories, demo users, and 8 sample events
npm run dev      # starts the API on http://localhost:5000 (nodemon)
# or: npm start
```

Demo accounts created by the seed script:
| Role | Email | Password |
|---|---|---|
| Admin | admin@eventify.com | admin123 |
| Organizer | organizer@eventify.com | organizer123 |
| User | user@eventify.com | user1234 |

### 3. Frontend setup
The frontend is static HTML/CSS/JS — no build step. Serve it with any static server, e.g.:
```bash
cd frontend
npx serve .          # or: python3 -m http.server 5500
```
Then open the printed URL (e.g. `http://localhost:5500`). The frontend calls the API at
`http://localhost:5000/api` (see `frontend/js/api.js` — change `API_BASE` if your backend runs elsewhere).

> Because this isn't a bundler-based app, just double-clicking the HTML files (`file://`) will run
> into CORS/relative-path quirks — always serve `frontend/` over `http://localhost`.

### 4. (Optional) Email
By default, no SMTP credentials are required — password-reset and booking-confirmation emails are
simply printed to the backend console, and the forgot-password API response includes a `devResetUrl`
you can click directly. To send real emails, fill in `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env`
(e.g. a Gmail App Password).

---

## 📁 Project structure

```
eventify/
├── backend/
│   ├── config/db.js
│   ├── controllers/        # business logic per resource
│   ├── middleware/         # auth (JWT), multer upload, error handler
│   ├── models/             # User, Event, Booking, Category, Review, Notification
│   ├── routes/             # REST endpoints, mounted under /api/*
│   ├── utils/              # JWT signing, email sending, QR/booking-code generation
│   ├── seed/seed.js         # demo data
│   ├── uploads/events/      # uploaded event images served at /uploads/events/...
│   └── server.js
└── frontend/
    ├── css/style.css                # design system (tokens, components)
    ├── js/
    │   ├── api.js            # fetch wrapper + token storage
    │   ├── layout.js         # shared navbar/footer, auth guard, notifications
    │   ├── toast.js
    │   ├── main.js            # homepage: search/filter/grid
    │   ├── event-details.js   # booking flow, reviews
    │   ├── profile.js         # profile/bookings/favorites tabs, ticket modal
    │   ├── organizer.js       # organizer dashboard + event CRUD form
    │   └── admin.js           # admin dashboard
    ├── index.html
    ├── login.html / register.html / forgot-password.html / reset-password.html
    ├── event-details.html
    ├── profile.html
    ├── become-organizer.html
    ├── organizer-dashboard.html
    └── admin-dashboard.html
```

## 🔌 Key API endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me

GET    /api/events?search=&category=&city=&dateFrom=&maxPrice=&sort=&page=
GET    /api/events/:idOrSlug
GET    /api/events/meta/featured
GET    /api/categories

POST   /api/bookings
GET    /api/bookings/my
PUT    /api/bookings/:id/cancel

POST   /api/reviews/:eventId

PUT    /api/users/profile
POST   /api/users/favorites/:eventId
POST   /api/users/request-organizer

GET    /api/organizer/dashboard
POST   /api/organizer/events            (multipart/form-data, field "image")
PUT    /api/organizer/events/:id
DELETE /api/organizer/events/:id
GET    /api/organizer/events/:id/bookings
GET    /api/organizer/events/:id/analytics
POST   /api/organizer/events/:id/notify

GET    /api/admin/dashboard
GET    /api/admin/users
PUT    /api/admin/organizers/:id/status
GET    /api/admin/events
PUT    /api/admin/events/:id/status
POST   /api/admin/categories
GET    /api/admin/reports
GET    /api/admin/activity
```

## Notes & next steps if you extend this
- Organizer accounts registered directly (not via admin approval) are auto-marked `approved` by
  `register`'s default, but their events go live immediately; wire `organizerStatus === 'pending'`
  into event creation if you want stricter gating.
- File uploads are stored on local disk — swap `middleware/upload.js` for a Cloudinary/S3 storage
  engine for production use.
- The QR code just encodes booking metadata as JSON — pair it with a real scanner endpoint
  (`GET /api/bookings/verify/:code`) if you want check-in scanning at the venue.
