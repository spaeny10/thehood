# Architecture & Technology Overview

## System Architecture

```
┌───────────────────────────────────────────────────────────┐
│                       RAILWAY                             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Express 5 Server (:3001)                           │  │
│  │                                                     │  │
│  │  ┌──────────────┐    ┌──────────────────────────┐   │  │
│  │  │  REST API     │    │  Static File Server      │   │  │
│  │  │  /api/*       │    │  (Vite build output)     │   │  │
│  │  └──────┬───────┘    └──────────────────────────┘   │  │
│  │         │                                           │  │
│  │  ┌──────┴───────┐                                   │  │
│  │  │  node-cron   │  Scheduled data collection        │  │
│  │  │  services    │  every 5 min (weather + lake)     │  │
│  │  └──────┬───────┘                                   │  │
│  └─────────┼───────────────────────────────────────────┘  │
│            │                                              │
│  ┌─────────┴───────────────────────────────────────────┐  │
│  │  PostgreSQL (Managed)                               │  │
│  │  Tables: weather_data, lake_data, users, alerts,    │  │
│  │  alert_history, settings, lots, discussions, posts  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
    Ambient Weather   USGS Water    Open-Meteo
    Station API       Services API  Forecast API
```

## Frontend Stack

| Package        | Version | Purpose                                             |
|----------------|---------|-----------------------------------------------------|
| React          | 19.2    | UI component framework                              |
| Vite           | 7.3     | Development server and production bundler            |
| Tailwind CSS   | 4.1     | Utility-first CSS styling                           |
| Recharts       | 3.7     | Interactive charts (temperature, humidity, etc.)     |
| Lucide React   | 0.574   | Icon library (100+ icons used across the app)       |
| Axios          | 1.13    | HTTP client for API communication                   |
| date-fns       | 4.1     | Date formatting and manipulation                    |

### Component Architecture

| Component           | Responsibility                                         |
|---------------------|--------------------------------------------------------|
| `App.jsx`           | Root layout, routing, auth modal, data fetching        |
| `WeatherCard.jsx`   | Current outdoor conditions grid (temp, wind, rain, etc.) |
| `ForecastPanel.jsx` | 5-day forecast cards with weather icons                |
| `LakePanel.jsx`     | Lake conditions, historical trend charts, KDWP fishing report |
| `WeatherChart.jsx`  | Recharts-based 24-hour trend graphs                    |
| `AlertsPanel.jsx`   | Alert toggle, creation, deletion, and history          |
| `AdminPage.jsx`     | Settings, indoor monitoring, alerts, data management   |
| `CourtMap.jsx`      | Interactive SVG-like lot grid with edit modal           |
| `DiscussPage.jsx`   | Community discussion board with threads and replies     |
| `AuthContext.jsx`   | React context for auth state, login/register/logout     |

## Backend Stack

| Package           | Version | Purpose                                           |
|-------------------|---------|---------------------------------------------------|
| Express           | 5.2     | HTTP server and REST API framework                |
| PostgreSQL (pg)   | 8.18    | Database driver                                   |
| Passport          | 0.7     | Authentication middleware framework               |
| passport-facebook | 3.0     | Facebook OAuth 2.0 strategy                       |
| jsonwebtoken      | 9.0     | JWT token generation and verification             |
| bcryptjs          | 3.0     | Password hashing                                  |
| node-cron         | 4.2     | Scheduled task runner for data collection         |
| Axios             | 1.13    | HTTP client for external API calls                |
| dotenv            | 17.3    | Environment variable management                   |
| express-session   | 1.19    | Session management for Passport                   |

### API Endpoints

| Endpoint                   | Method | Auth     | Description                     |
|----------------------------|--------|----------|---------------------------------|
| `/api/weather/current`     | GET    | —        | Latest weather reading          |
| `/api/weather/historical`  | GET    | —        | 24-hour weather history         |
| `/api/lake`                | GET    | —        | Current lake conditions         |
| `/api/lake/historical`     | GET    | —        | Historical lake data (configurable hours/limit) |
| `/api/fishing`             | GET    | —        | KDWP fishing report (scraped, 24h cache) |
| `/api/forecast`            | GET    | —        | 5-day weather forecast          |
| `/api/alerts`              | GET    | —        | Active alerts                   |
| `/api/alerts`              | POST   | Login    | Create new alert                |
| `/api/alerts/:id`          | DELETE | Login    | Delete an alert                 |
| `/api/alerts/history`      | GET    | —        | Alert trigger history           |
| `/api/auth/register`       | POST   | —        | Create local account            |
| `/api/auth/login`          | POST   | —        | Login with username/password    |
| `/api/auth/facebook`       | GET    | —        | Start Facebook OAuth flow       |
| `/api/lots`                | GET    | —        | All court map lots              |
| `/api/lots/:id`            | PUT    | Login    | Update lot details              |
| `/api/discussions`         | GET    | —        | All discussion threads          |
| `/api/discussions`         | POST   | Login    | Create discussion thread        |
| `/api/discussions/:id/posts` | POST | Login    | Reply to a thread              |
| `/api/settings`            | GET    | Admin    | All settings                    |
| `/api/settings`            | PUT    | Admin    | Update settings                 |
| `/api/settings/stats`      | GET    | Admin    | Database statistics             |
| `/api/settings/purge/:type`| DELETE | Admin    | Purge data by type              |

### Database Schema

- **weather_data** — Timestamped outdoor/indoor sensor readings
- **lake_data** — USGS lake elevation, water temp, outflow, storage
- **users** — Local + Facebook accounts with roles (member/admin)
- **alerts** — Configurable weather threshold alerts
- **alert_history** — Log of triggered alert events
- **settings** — Key/value app configuration
- **lots** — Court map lot data (63 lots with owners and statuses)
- **discussions** — Community board threads
- **posts** — Replies to discussion threads

## External Data Sources

| Source          | Data Provided                          | Update Frequency |
|-----------------|----------------------------------------|------------------|
| Ambient Weather | Temp, humidity, wind, rain, pressure, lightning, battery | Every 5 min |
| USGS Water Services | Lake elevation, water temp, dam outflow, storage | Every 5 min |
| Open-Meteo      | 5-day forecast (high/low, precip, description) | On demand |
| RainViewer      | Interactive weather radar map (iframe) | Real-time |
| KDWP (ksoutdoors.gov) | Kanopolis Reservoir fishing report (species, ratings, baits) | Scraped every 24h |

## Security Model

- **Passwords** hashed with bcryptjs (salt rounds: 10)
- **Sessions** use JWT tokens stored in localStorage
- **Admin detection** at registration: display name containing "Spaeny" → admin role
- **Route protection**: `requireAuth` middleware for login-required endpoints, `requireAdmin` for settings
- **Frontend gating**: Settings page and footer link hidden for non-admins; lot editing requires login
