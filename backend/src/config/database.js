const Database = require('better-sqlite3');
const path = require('path');

// Use /tmp on Vercel (serverless), local path otherwise
const DB_PATH = process.env.VERCEL
  ? '/tmp/weather2000.db'
  : path.join(__dirname, '../../weather.db');

// Create database connection
const db = new Database(DB_PATH, {
  verbose: process.env.VERCEL ? undefined : console.log
});

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initializeDatabase() {
  // Weather data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS weather_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      indoor_temp REAL,
      indoor_humidity REAL,
      outdoor_temp REAL,
      outdoor_humidity REAL,
      wind_speed REAL,
      wind_gust REAL,
      wind_direction INTEGER,
      rain_hourly REAL,
      rain_daily REAL,
      rain_weekly REAL,
      rain_monthly REAL,
      rain_total REAL,
      pressure REAL,
      uv_index INTEGER,
      solar_radiation REAL,
      feels_like REAL,
      dew_point REAL,
      lightning_count INTEGER,
      lightning_distance REAL,
      battery_outdoor INTEGER,
      battery_indoor INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create index on timestamp for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_weather_timestamp
    ON weather_data(timestamp)
  `);

  // Add battery columns if they don't exist (migration for existing databases)
  try {
    db.exec(`ALTER TABLE weather_data ADD COLUMN battery_outdoor INTEGER`);
  } catch (e) { /* column already exists */ }
  try {
    db.exec(`ALTER TABLE weather_data ADD COLUMN battery_indoor INTEGER`);
  } catch (e) { /* column already exists */ }

  // Lake data table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lake_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      elevation REAL,
      conservation_level REAL,
      level_diff REAL,
      storage_acre_ft REAL,
      water_temp_c REAL,
      water_temp_f REAL,
      outflow_cfs REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_lake_timestamp
    ON lake_data(timestamp)
  `);

  // Settings table (key-value store)
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'general',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default settings if they don't exist
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, description, category)
    VALUES (?, ?, ?, ?)
  `);

  const defaultSettings = [
    ['weather_collection_interval', '5', 'Minutes between weather data collection', 'collection'],
    ['lake_collection_interval', '30', 'Minutes between lake data collection', 'collection'],
    ['data_retention_days', '90', 'Days to keep weather data', 'retention'],
    ['lake_retention_days', '180', 'Days to keep lake data', 'retention'],
    ['alert_history_retention_days', '30', 'Days to keep alert history', 'retention'],
    ['lake_station_id', '06865000', 'USGS lake station ID', 'usgs'],
    ['dam_station_id', '06865500', 'USGS dam/outflow station ID', 'usgs'],
    ['conservation_pool_level', '1463', 'Conservation pool level (ft MSL)', 'usgs'],
    ['latitude', '38.66', 'Forecast location latitude', 'location'],
    ['longitude', '-98.78', 'Forecast location longitude', 'location'],
    ['fb_access_token', '', 'Facebook Graph API access token for group feed', 'facebook'],
  ];

  const insertMany = db.transaction((settings) => {
    for (const s of settings) {
      insertSetting.run(s);
    }
  });
  insertMany(defaultSettings);

  // Alerts configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      condition TEXT NOT NULL,
      threshold REAL NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Alert history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER NOT NULL,
      triggered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      value REAL,
      message TEXT,
      FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
    )
  `);

  // Create default alerts if they don't exist
  const alertCount = db.prepare('SELECT COUNT(*) as count FROM alerts').get();

  if (alertCount.count === 0) {
    const insertAlert = db.prepare(`
      INSERT INTO alerts (name, type, condition, threshold, enabled)
      VALUES (?, ?, ?, ?, ?)
    `);

    const defaultAlerts = [
      ['High Indoor Temperature', 'indoor_temp', 'greater_than', 78, 1],
      ['Low Indoor Temperature', 'indoor_temp', 'less_than', 65, 1],
      ['High Outdoor Temperature', 'outdoor_temp', 'greater_than', 95, 1],
      ['Low Outdoor Temperature', 'outdoor_temp', 'less_than', 32, 1],
      ['High Wind Speed', 'wind_speed', 'greater_than', 25, 1],
      ['Heavy Rain', 'rain_hourly', 'greater_than', 1, 1],
      ['Lightning Detected', 'lightning_count', 'greater_than', 0, 1]
    ];

    const insertAlerts = db.transaction((alerts) => {
      for (const alert of alerts) {
        insertAlert.run(alert);
      }
    });

    insertAlerts(defaultAlerts);
    console.log('✓ Default alerts created');
  }

  // Lots table (court map)
  db.exec(`
    CREATE TABLE IF NOT EXISTS lots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lot_number INTEGER NOT NULL UNIQUE,
      street TEXT NOT NULL,
      owner_name TEXT DEFAULT '',
      owner_name2 TEXT DEFAULT '',
      status TEXT DEFAULT 'occupied',
      notes TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed lot data from court map if empty
  const lotCount = db.prepare('SELECT COUNT(*) as count FROM lots').get();
  if (lotCount.count === 0) {
    const insertLot = db.prepare(`
      INSERT INTO lots (lot_number, street, owner_name, owner_name2, status, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // [lot_number, street, owner_name, owner_name2, status, notes]
    const defaultLots = [
      // Keystone Court — top row
      [63, 'Keystone Court', 'Morris', 'Carol', 'occupied', ''],
      [62, 'Keystone Court', 'Anderson', 'Ryan, Tina', 'occupied', ''],
      [61, 'Keystone Court', 'Anderson', 'Bryan, Tina', 'occupied', ''],
      [60, 'Keystone Court', 'Engel', 'Troy, Leslie', 'occupied', ''],
      [59, 'Keystone Court', 'Fenstermaker', 'Larry, Bonnie', 'occupied', ''],

      // Coors Court — west column
      [46, 'Coors Court', 'Swan', 'Brad, Sam', 'occupied', ''],
      [45, 'Coors Court', 'Bebcock', 'Troy, Jenn', 'occupied', ''],
      [44, 'Coors Court', 'Scott', 'Greg', 'occupied', ''],
      [43, 'Coors Court', 'Buellenbrach', 'Trapper, Leslie', 'occupied', ''],
      [42, 'Coors Court', 'Diggs', 'Jody', 'occupied', ''],
      [41, 'Coors Court', 'Spaeny', 'Shawn, Jennifer', 'occupied', ''],

      // Coors Court — east column (center lots)
      [52, 'Coors Court', 'Unruh', 'Tim, Kim', 'occupied', ''],
      [51, 'Coors Court', 'Wells', 'May', 'occupied', ''],
      [50, 'Coors Court', '', '', 'for_sale', ''],
      [49, 'Coors Court', 'Steenson', 'Brad, Rachael', 'occupied', ''],
      [48, 'Coors Court', 'Holzman', 'Brian', 'occupied', ''],
      [47, 'Coors Court', 'Shaft', 'Brad, Candra', 'occupied', ''],

      // Budweiser Blvd — east column
      [58, 'Budweiser Blvd', 'Holm', 'Trae, Lindsey', 'occupied', ''],
      [57, 'Budweiser Blvd', 'Dorin', '', 'occupied', ''],
      [56, 'Budweiser Blvd', 'Sampson', 'Eric', 'occupied', ''],
      [55, 'Budweiser Blvd', 'Pennington', 'Donnie', 'occupied', ''],
      [54, 'Budweiser Blvd', 'Ward', 'Roger, Lisa', 'occupied', ''],
      [53, 'Budweiser Blvd', 'Roger', 'Lisa', 'occupied', ''],

      // Scotch Street — west column
      [36, 'Scotch Street', 'Ryan', 'Mike', 'occupied', ''],
      [31, 'Scotch Street', 'Moore', 'Mary Jane', 'for_sale', ''],
      [26, 'Scotch Street', 'Mossberg', 'Lori', 'occupied', ''],
      [21, 'Scotch Street', 'Lassiter / Kralik', 'Shawn / Michelle', 'occupied', ''],
      [16, 'Scotch Street', 'McFadden', 'Mike', 'occupied', ''],
      [11, 'Scotch Street', 'Munnz', 'Aaron, Liz', 'occupied', ''],
      [6, 'Scotch Street', 'Schneider', 'Joe, Cassie', 'occupied', ''],
      [1, 'Scotch Street', 'Bickel', 'Sharoll', 'occupied', ''],

      // Scotch Street — east column (second column)
      [37, 'Scotch Street', 'Robben', 'Mike, Sandy', 'occupied', ''],
      [32, 'Scotch Street', 'Gabriel', 'Mark', 'occupied', ''],
      [27, 'Scotch Street', 'Alberici', 'Mario, Jodi', 'occupied', ''],
      [22, 'Scotch Street', 'Mosier', 'Matt, Deanna', 'occupied', ''],
      [17, 'Scotch Street', 'McFadden', 'Mike', 'occupied', ''],
      [12, 'Scotch Street', 'Wojteczko', 'Jason, Crystal', 'occupied', ''],
      [7, 'Scotch Street', 'Stum', 'Marc, Bev', 'occupied', ''],
      [2, 'Scotch Street', 'Plankenhorn', 'Mike, Velda', 'occupied', ''],

      // Vodka Street — west column
      [38, 'Vodka Street', 'Spaeny', 'Mike, Twila', 'occupied', ''],
      [33, 'Vodka Street', 'Miller', 'Chuck, Dawn', 'occupied', ''],
      [28, 'Vodka Street', 'Engelland', 'Ed, Melissa', 'occupied', ''],
      [23, 'Vodka Street', 'Waugh', 'Keith, Caroline', 'occupied', ''],
      [18, 'Vodka Street', 'Ehart', 'Jeremy, Kristy', 'occupied', ''],
      [13, 'Vodka Street', 'Edger', 'Thayne, Jessica', 'occupied', ''],
      [8, 'Vodka Street', 'Smith', 'Tim, Karen', 'occupied', ''],
      [3, 'Vodka Street', 'Beetch', 'Kevin, Karen', 'occupied', ''],

      // Vodka Street — east column
      [39, 'Vodka Street', 'Neisler', 'Amy', 'occupied', ''],
      [34, 'Vodka Street', 'Oberle', 'Larry', 'occupied', ''],
      [29, 'Vodka Street', 'Pickering', 'Quinton, Jessica', 'for_sale', ''],
      [24, 'Vodka Street', 'VanWinkle', 'James', 'occupied', ''],
      [19, 'Vodka Street', 'Shaw', 'Mike, Patti', 'occupied', ''],
      [14, 'Vodka Street', 'Nelson', 'Delisa', 'occupied', ''],
      [9, 'Vodka Street', 'Richards', 'Ken, Connie', 'occupied', ''],
      [4, 'Vodka Street', 'Toews', 'John, Sharon', 'occupied', ''],

      // Bourbon Street — west column
      [40, 'Bourbon Street', 'Schmitt', 'Robert, Sarah', 'occupied', ''],
      [35, 'Bourbon Street', 'Tolle', 'Dan', 'occupied', ''],
      [30, 'Bourbon Street', 'Kenyon', 'Rick, Marty', 'for_sale', ''],
      [25, 'Bourbon Street', 'Witter', 'Tanya', 'occupied', ''],
      [20, 'Bourbon Street', 'Livingston', 'John, Rachel', 'occupied', ''],
      [15, 'Bourbon Street', 'Toews', 'Andrea', 'occupied', ''],
      [10, 'Bourbon Street', 'Koeppen', 'Don', 'occupied', ''],
      [5, 'Bourbon Street', 'Toews', 'Shane, Crystal', 'occupied', ''],
    ];

    const insertLots = db.transaction((lots) => {
      for (const lot of lots) {
        insertLot.run(lot);
      }
    });
    insertLots(defaultLots);
    console.log('✓ Default lots seeded from court map');
  }

  // Discussions table (community board)
  db.exec(`
    CREATE TABLE IF NOT EXISTS discussions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author TEXT NOT NULL DEFAULT 'Anonymous',
      message TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      pinned INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS discussion_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      discussion_id INTEGER NOT NULL,
      author TEXT NOT NULL DEFAULT 'Anonymous',
      message TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (discussion_id) REFERENCES discussions(id) ON DELETE CASCADE
    )
  `);

  db.exec(`CREATE INDEX IF NOT EXISTS idx_comments_discussion ON discussion_comments(discussion_id)`);

  // Users table (auth)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      facebook_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT DEFAULT '',
      profile_pic TEXT DEFAULT '',
      role TEXT DEFAULT 'member',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✓ Database initialized successfully');
}

// Initialize on import
initializeDatabase();

module.exports = db;
