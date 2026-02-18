# Weather2000 Setup Guide

## Prerequisites
- Node.js 18+ installed
- Your Ambiant Weather API credentials

## Quick Start

### 1. Configure Backend API Keys

The API key has already been added, but you also need your **Application Key**:

1. Go to https://ambientweather.net/account
2. Copy your Application Key
3. Open `backend/.env` and update:
   ```
   AMBIENT_APPLICATION_KEY=your_application_key_here
   ```

### 2. Start the Backend

```bash
cd backend
npm install   # (already done)
npm run dev
```

The backend will start on http://localhost:3001 and:
- Automatically collect weather data every 5 minutes
- Monitor alerts every minute
- Store data in SQLite database (`backend/weather.db`)

### 3. Start the Frontend

Open a new terminal:

```bash
cd frontend
npm install   # (already done)
npm run dev
```

The dashboard will open at http://localhost:5173

## Features Overview

### Current Weather Display
- Real-time outdoor and indoor temperature/humidity
- Wind speed, gusts, and direction
- Rainfall tracking (hourly, daily, monthly)
- Barometric pressure
- Lightning detection

### Historical Trends
- 24-hour temperature charts (indoor/outdoor)
- Humidity trends
- Wind speed visualization
- Rainfall accumulation

### Smart Alerts
Pre-configured alerts for:
- High/Low Indoor Temperature (78°F / 65°F)
- High/Low Outdoor Temperature (95°F / 32°F)
- High Wind Speed (25 mph)
- Heavy Rain (1 inch/hour)
- Lightning Detection

**Alert Features:**
- 15-minute cooldown to prevent spam
- Enable/disable individual alerts
- View alert history
- Customize thresholds

## API Endpoints

### Weather Data
- `GET /api/weather/current` - Current weather
- `GET /api/weather/historical?hours=24&limit=100` - Historical data
- `GET /api/weather/stats?hours=24` - Statistics
- `GET /api/weather/devices` - Device info

### Alerts
- `GET /api/alerts` - List all alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id` - Update alert
- `PATCH /api/alerts/:id/toggle` - Enable/disable alert
- `DELETE /api/alerts/:id` - Delete alert
- `GET /api/alerts/history` - Alert history

### Health Check
- `GET /api/health` - System status

## Customization

### Adjust Data Collection Interval
Edit `backend/.env`:
```
DATA_COLLECTION_INTERVAL=5  # minutes
```

### Adjust Alert Check Interval
Edit `backend/.env`:
```
ALERT_CHECK_INTERVAL=1  # minutes
```

### Change Colors/Theme
Edit `frontend/tailwind.config.js`:
```javascript
colors: {
  'dark-bg': '#0a0e27',
  'dark-card': '#151932',
  'purple-accent': '#8b5cf6',
  // ... customize as needed
}
```

### Add New Alert Types
1. Backend: Update `backend/src/services/alertService.js`
2. Frontend: Update `frontend/src/components/AlertsPanel.jsx`

## Troubleshooting

### "No weather data available"
- Check that your API credentials are correct in `backend/.env`
- Verify your Ambiant Weather device is online
- Check backend logs for API errors

### Frontend can't connect to backend
- Ensure backend is running on port 3001
- Check `frontend/.env` has correct API URL:
  ```
  VITE_API_URL=http://localhost:3001/api
  ```

### Database errors
- Delete `backend/weather.db` to reset database
- Backend will recreate it on next startup

### Port conflicts
Change ports in:
- Backend: `backend/.env` → `PORT=3001`
- Frontend: Will auto-assign if 5173 is taken

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use process manager (PM2, systemd)
3. Set up reverse proxy (nginx)
4. Enable HTTPS

### Frontend
1. Build: `npm run build`
2. Serve `dist` folder with web server
3. Update `VITE_API_URL` to production backend URL

## Project Structure

```
Weather2000/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── routes/          # API routes
│   │   └── server.js        # Express server
│   ├── .env                 # Environment variables
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   ├── utils/           # Helper functions
│   │   └── App.jsx          # Main app
│   └── package.json
└── Design/                  # Design inspiration
```

## Support

For issues with:
- **Ambiant Weather API**: https://ambientweather.docs.apiary.io
- **This Dashboard**: Check logs in browser console and backend terminal

Enjoy your Weather2000 dashboard! 🌤️
