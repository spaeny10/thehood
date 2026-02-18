# Weather2000 - Ambiant Weather Dashboard

A full-stack weather dashboard for monitoring current conditions, historical trends, and setting intelligent alerts.

## Features
- 🌡️ Real-time weather data display
- 📊 Historical trend visualization
- 🔔 Custom alerts (indoor/outdoor temp, rain, wind, lightning)
- 🎨 Modern dark-themed UI with purple accents
- 💾 Local data storage for historical analysis

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Charts**: Recharts
- **API**: Ambiant Weather API

## Project Structure
```
Weather2000/
├── frontend/          # React frontend application
├── backend/           # Node.js backend API
├── Design/            # Design inspiration and assets
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Configure environment variables:
- Copy `.env.example` to `.env` in the backend directory
- Add your Ambiant Weather API key and Application key

### Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. Start the frontend (in a new terminal):
```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:5173`

## API Configuration

This dashboard uses the Ambiant Weather API. You'll need:
- API Key
- Application Key

Get your keys at: https://ambientweather.net/account

## License
MIT
