# Prime Property Full Upgrade

Beginner-friendly full-stack real estate project with:
- mandatory login before homepage access
- Node.js + Express + MongoDB backend
- JWT authentication
- profile dashboard and booking history
- admin users/bookings view
- dedicated step-by-step payment page (secure mock flow)

## Project Structure

- `newindex.html` - main user site
- `admin.html` - admin entry page
- `payment.html` - new payment flow page
- `js/app.js` - frontend app logic + auth + dashboard
- `js/admin.js` - admin API rendering
- `js/payment.js` - payment page logic
- `css/styles.css` - responsive styles and animations
- `server/` - backend API and MongoDB models

## Backend Setup

1. Copy `.env.example` to `.env` inside project root.
2. Update values:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT`
3. Install and run backend:

```bash
cd server
npm install
npm run seed
npm run dev
```

Backend URL: `http://localhost:5000`

## Frontend Setup

Open `newindex.html` using Live Server (recommended) or browser.

Important: backend must be running for login/data operations.

## Demo Credentials

- Admin Email: `admin@prime.in`
- Admin Password: `admin`

## Main API Routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/properties`
- `GET /api/properties/:id`
- `GET /api/bookings/mine`
- `GET /api/bookings/all` (admin)
- `GET /api/bookings/users` (admin)
- `PATCH /api/bookings/profile`
- `POST /api/payment/mock-confirm`

## End-to-End Flow

1. Website opens -> login required.
2. Login/signup with API -> JWT stored.
3. Properties load from MongoDB.
4. User profile updates saved in MongoDB.
5. Book button opens `payment.html`.
6. Payment steps complete -> booking saved in MongoDB.
7. Admin can view users/bookings and export list.
# Prime Property Project (Beginner Friendly)

This is a front-end real estate project made with HTML, CSS, and JavaScript.
It includes user login/signup, property search/filter, booking flow, admin panel, and invoice generation.

## Project Files

- `newindex.html` - main public website
- `admin.html` - admin login page
- `view3d.html` - simple 3D/locality view page
- `css/styles.css` - main styles
- `css/invoice.css` - invoice styles
- `js/app.js` - core app logic (auth, booking, dashboard)
- `js/admin.js` - admin-specific features
- `js/ai-chat.js` - AI chat widget

## How To Run

1. Open the project folder.
2. Double-click `newindex.html` to open the website in a browser.
3. Use `admin.html` for direct admin portal access.

No backend/server is required. Data is stored in browser `localStorage`.

## Demo Login Details

- Admin Email: `admin@prime.in`
- Admin Password: `admin`

You can also create a new public user from Sign Up on the main page.

## Main Features

- Public signup/login with pending approval flow
- Admin approval/reject for users
- Property listing with filters and search
- Property comparison (up to 4 properties)
- Booking with payment method simulation (Card/UPI/Bank)
- User dashboard with profile and booking history
- Invoice print/download page
- Admin booking analytics and Excel export

## Notes For Beginners

- All app data is in `localStorage`, so clearing browser data will reset users/bookings.
- This is a learning/demo project (not production security).
- You can start code reading from `js/app.js`, then `js/admin.js`.
