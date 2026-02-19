# Changelog

All notable changes to the Kanopolanes Weather Dashboard.

## [1.6.0] — 2026-02-18

### Added
- **Lake historical trends** — collapsible card with Recharts area/line charts for pool elevation, water temperature, and dam outflow over selectable time ranges (24h, 3d, 7d, 30d)
- **KDWP fishing report** — backend scraper fetches the official Kanopolis Reservoir fishing report from ksoutdoors.gov, caches for 24 hours, and displays all species data (rating, size, baits/methods/location) in a collapsible card
- **Collapsible cards** — Lake Trends and Fishing Report sections fold/unfold with chevron toggle, both collapsed by default for cleaner UI
- New backend files: `fishingReportService.js`, `fishingController.js`, `fishingRoutes.js`
- New API endpoint: `GET /api/fishing` (scraped KDWP data)
- New API endpoint: `GET /api/lake/historical` (historical lake data)

### Changed
- `LakePanel.jsx` — added historical chart integration and fishing report display
- `api.js` — added `lakeApi.getHistorical()` and `lakeApi.getFishingReport()` methods
## [1.5.0] — 2026-02-18

### Added
- **Mobile-responsive header** — hamburger menu with dropdown nav on small screens
- **Mobile-responsive court map** — horizontally scrollable grid, compact lot cells, hidden emergency sidebar on mobile
- **Login required for lot editing** — unauthenticated users see a toast prompt when clicking lots
- **Personalized heading** — "Current Conditions on Shawn & Jenn's Porch"

### Changed
- Header padding and logo size scale with screen width
- Court map footer includes Discuss link
- Search input compacts on mobile

## [1.4.0] — 2026-02-18

### Added
- **Weather radar** — embedded RainViewer radar iframe on main dashboard (centered on Lake Kanopolis)
- **Indoor monitoring panel** on admin settings page (temperature, humidity, battery)
- **Alert configuration** moved to admin settings page
- **Admin-gated settings** — non-admins see "Access Required" message; Settings link hidden in footer

### Removed
- Indoor temperature card from main dashboard
- Indoor humidity bar from main dashboard
- Indoor battery indicator from main dashboard
- Alerts section from main dashboard
- Indoor temperature from historical chart

## [1.3.0] — 2026-02-18

### Fixed
- **Street label positions** — Scotch, Vodka, and Bourbon labels now display between their respective lot columns

### Changed
- Court map lot cells have darker background (`#1c1c2e`) and brighter borders (`#444466`) for better contrast
- Increased lot gap to 2px and street separator width to 14px

## [1.2.0] — 2026-02-17

### Added
- **Street labels** — vertical Scotch St, Vodka St, and Bourbon St labels on the south grid
- **Lot padding** between cells for visual clarity

### Changed
- Court map seed logic changed to one-time insert (only seeds if < 63 lots exist)
- Prevents accidental data loss on server restart

## [1.1.0] — 2026-02-17

### Fixed
- **All 63 lots** fully transcribed from original court map document with correct owner names, statuses, and street assignments
- Missing lots 15–63 added to database seed
- `Invalid time value` crash from PostgreSQL timestamp string parsing

### Changed
- Database seed now deletes and re-inserts all lot data for accuracy (later reverted to one-time seed in v1.2.0)

## [1.0.0] — 2026-02-17

### Added
- **Weather dashboard** — real-time outdoor conditions, humidity, wind, rain, pressure, lightning
- **Lake conditions panel** — USGS elevation, water temperature, dam outflow, storage percentage
- **5-day forecast** from Open-Meteo API
- **24-hour trend charts** via Recharts (temperature, humidity, wind, rain, pressure, lightning)
- **Court map** — interactive grid of all 63 lots with click-to-edit modal
- **Community board (Discuss)** — threaded discussions with replies
- **Admin settings page** — data collection intervals, retention policies, database stats, purge tools
- **Alerts system** — configurable weather threshold alerts with trigger history
- **Authentication** — local registration + Facebook OAuth login
- **Role-based access** — auto-admin assignment via display name matching
- **Automated data collection** — `node-cron` schedules every 5 minutes
- **Railway deployment** — auto-deploy from GitHub, managed PostgreSQL

### Infrastructure
- Migrated from SQLite to PostgreSQL
- Migrated from Vercel serverless to Railway persistent service
- Express 5 with path-to-regexp v8 syntax
