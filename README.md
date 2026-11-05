# 🅿️ SmartPark Mall

A responsive web application that allows visitors to check and reserve parking slots at a mall before arriving. Simulated IoT sensors automatically detect parking space availability, and a management dashboard provides real-time parking condition monitoring.

## ✨ Features

### 👤 User Features
- **Onboarding** — Beautiful 3-screen introduction with animations
- **Authentication** — Sign in / Register with email & password (Supabase Auth)
- **Dashboard** — Real-time parking overview with animated statistics
- **Parking Map** — Interactive floor-by-floor visual parking grid
- **Reserve Parking** — Step-by-step reservation flow with cost calculation
- **My Reservations** — View, filter, and cancel reservations
- **Profile** — Manage personal info, vehicle plates, and preferences
- **Account Deletion** — Secure account removal with confirmation
- **Feedback** — Star rating and categorized feedback submission

### 🔧 Management Features
- **Admin Dashboard** — Real-time occupancy metrics, charts, and sensor status
- **Occupancy Trends** — Hourly and daily occupancy/revenue bar charts
- **IoT Sensor Panel** — Simulated sensor health monitoring per floor
- **Event Log** — Recent parking entry/exit events table

### 🤖 IoT Simulation
Since no real IoT devices are available, the system includes:
- **Client-side simulator** (`parkingSimulator.js`) — Generates realistic occupancy data based on time of day, with periodic random updates
- **Server-side simulator** (`server.js`) — Express API that maintains parking state with automatic 15-second update cycles
- Realistic patterns: higher occupancy during business hours (8am–9pm), peak lunch/evening times, lower at night

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Framer Motion |
| Backend | Node.js, Express |
| Database & Auth | Supabase (PostgreSQL + Auth) |
| Styling | CSS with custom properties (white & navy blue theme) |
| Icons | React Icons |

## 📁 Project Structure

```
SmartPark Mall/
├── client/                    # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/        # Layout, Modal, LoadingSpinner
│   │   ├── contexts/          # AuthContext (Supabase auth)
│   │   ├── lib/               # Supabase client
│   │   ├── pages/             # All page components
│   │   │   ├── Onboarding     # 3-screen intro
│   │   │   ├── SignIn/Register # Authentication
│   │   │   ├── Dashboard      # Main overview
│   │   │   ├── ParkingMap     # Visual parking grid
│   │   │   ├── Reserve        # Step-by-step booking
│   │   │   ├── MyReservations # Booking management
│   │   │   ├── AdminDashboard # Management panel
│   │   │   ├── Profile        # User profile & deletion
│   │   │   └── Feedback       # Rating & feedback
│   │   └── utils/             # Parking simulator
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                    # Node.js backend
│   ├── server.js              # Express API + IoT simulation
│   └── package.json
├── supabase-schema.sql        # Database schema
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-schema.sql`
3. Copy your project URL and anon key from **Settings → API**

### 2. Environment Variables

Create `client/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### 4. Run the Application

```bash
# Terminal 1 — Start the backend
cd server
npm run dev

# Terminal 2 — Start the frontend
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#1B2A4A` (Navy Blue) |
| Primary Light | `#2C3E6B` |
| Primary Dark | `#0F1D36` |
| Accent | `#3B82F6` |
| Success | `#10B981` |
| Warning | `#F59E0B` |
| Danger | `#EF4444` |
| Background | `#F8FAFC` |
| Card | `#FFFFFF` |
| Font | Inter |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/parking/status` | All parking data + statistics |
| GET | `/api/parking/floor/:id` | Specific floor data |
| POST | `/api/parking/reserve` | Reserve a parking slot |
| POST | `/api/parking/cancel` | Cancel a reservation |
| POST | `/api/parking/simulate-update` | Trigger manual sensor update |
| GET | `/api/parking/history` | 24-hour occupancy history |
| POST | `/api/feedback` | Submit feedback |
| GET | `/api/health` | Server health check |

## 📝 Notes

- The app works as a **prototype** with or without Supabase. Without Supabase credentials, auth functions will fail gracefully, and data falls back to localStorage.
- The parking simulator generates **realistic data** based on time of day (business hours vs. night).
- The parking structure includes **140 total slots** across 4 floors (B1, B2, F1, F2) with regular, disabled-accessible, EV charging, and VIP slot types.
- First 2 hours of parking are **free**; additional hours cost \$2/hour.

## 📄 License

MIT

