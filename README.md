# Kanopolanes — Weather Dashboard

A personal weather dashboard for Kanopolanes Park at Lake Kanopolis, Kansas. Displays real-time weather data from an Ambient Weather station, USGS lake conditions, Open-Meteo forecasts, and a live weather radar — all in a sleek dark-mode interface.

## Features

- **Current Conditions** — Outdoor temperature, humidity, wind speed/direction, rain, pressure, and lightning data from Shawn & Jenn's porch weather station
- **Lake Conditions** — Live lake elevation, water temperature, dam outflow, and storage percentage from USGS sensors
- **5-Day Forecast** — Daily high/low, precipitation probability, and weather descriptions via Open-Meteo
- **24-Hour Trend Charts** — Interactive historical graphs for temperature, humidity, wind, rain, pressure, and lightning
- **Weather Radar** — Embedded RainViewer radar centered on Lake Kanopolis
- **Court Map** — Interactive map of all 63 lots with owner names, statuses, and editable details (login required)
- **Community Board (Discuss)** — Threaded discussion forum for Kanopolanes residents
- **Admin Settings** — Indoor monitoring, alert configuration, data collection intervals, data retention, and database management (admin-only)
- **Authentication** — Local email/password registration and Facebook OAuth login
- **Role-Based Access** — Admin-gated settings page; login required for editing lots

## Tech Stack

| Layer       | Technology                                             |
|-------------|--------------------------------------------------------|
| Frontend    | React 19, Vite 7, Tailwind CSS 4, Recharts, Lucide    |
| Backend     | Node.js, Express 5, PostgreSQL (via `pg`)              |
| Auth        | Passport.js, Facebook OAuth, JWT, bcryptjs             |
| Data APIs   | Ambient Weather, USGS Water Services, Open-Meteo       |
| Hosting     | Railway (app + managed PostgreSQL)                     |
| Scheduling  | `node-cron` for automated weather/lake data collection |

## Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/spaeny10/thehood.git
cd thehood

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Set up environment variables
# Create backend/.env with required keys (see SETUP_GUIDE.md)

# 4. Start dev servers
cd backend && npm run dev    # API on :3001
cd frontend && npm run dev   # UI on :5173
```

## Environment Variables

| Variable              | Description                                |
|-----------------------|--------------------------------------------|
| `DATABASE_URL`        | PostgreSQL connection string               |
| `JWT_SECRET`          | Secret key for JWT token signing           |
| `FB_APP_ID`           | Facebook OAuth App ID                      |
| `FB_APP_SECRET`       | Facebook OAuth App Secret                  |
| `FB_CALLBACK_URL`     | Facebook OAuth callback URL                |
| `ADMIN_FACEBOOK_NAME` | Name keyword for auto-admin (default: Spaeny) |
| `FRONTEND_URL`        | Frontend URL for CORS (production)         |

## Admin Access

Admin role is automatically assigned when a user registers with a display name containing **"Spaeny"** (case-insensitive). Admins can access the Settings page, which is hidden from non-admin users.

## Project Structure

```
Weather2000/
├── backend/
│   └── src/
│       ├── server.js              # Express server entry point
│       ├── config/database.js     # PostgreSQL connection + schema + seeding
│       ├── controllers/           # Route handlers (9 modules)
│       ├── routes/                # Express route definitions
│       ├── services/              # Data collection (weather, lake, forecast)
│       └── middleware/auth.js     # JWT + admin middleware
├── frontend/
│   └── src/
│       ├── App.jsx                # Main app layout + routing
│       ├── components/            # UI components (8 modules)
│       │   ├── AdminPage.jsx      # Settings + indoor monitoring + alerts
│       │   ├── AlertsPanel.jsx    # Alert configuration & history
│       │   ├── CourtMap.jsx       # Interactive lot map
│       │   ├── DiscussPage.jsx    # Community discussion board
│       │   ├── ForecastPanel.jsx  # 5-day forecast cards
│       │   ├── LakePanel.jsx      # Lake conditions display
│       │   ├── WeatherCard.jsx    # Current conditions cards
│       │   └── WeatherChart.jsx   # Recharts historical graphs
│       ├── context/AuthContext.jsx # React auth context + hooks
│       ├── services/api.js        # Axios API client
│       └── utils/formatters.js    # Data formatting helpers
└── railway.json                   # Railway deployment config
```

## Deployment

The app auto-deploys to Railway when code is pushed to the `main` branch on GitHub. Railway builds the frontend (`vite build`) and serves it as static files from the Express backend.

## License

Private project — Kanopolanes Park residents.
