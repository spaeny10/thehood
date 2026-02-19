const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
console.log(`[DB] Connection string: ${connectionString ? 'SET (' + connectionString.split('@')[1]?.split('/')[0] + ')' : '⚠️  NOT SET — add DATABASE_URL in Railway Variables'}`);

const pool = new Pool({
  connectionString,
  ssl: connectionString && !connectionString.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
});

/* ─── initialise schema ─── */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
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
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weather_timestamp ON weather_data(timestamp)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lake_data (
        id SERIAL PRIMARY KEY,
        timestamp BIGINT NOT NULL,
        elevation REAL,
        conservation_level REAL,
        level_diff REAL,
        storage_acre_ft REAL,
        water_temp_c REAL,
        water_temp_f REAL,
        outflow_cfs REAL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_lake_timestamp ON lake_data(timestamp)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed default settings
    const defaults = [
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
      ['fb_access_token', '', 'Facebook Graph API access token for Kanopolanes', 'facebook'],
    ];

    for (const [key, value, description, category] of defaults) {
      await client.query(
        `INSERT INTO settings (key, value, description, category) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING`,
        [key, value, description, category]
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        condition TEXT NOT NULL,
        threshold REAL NOT NULL,
        enabled INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS alert_history (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        triggered_at TIMESTAMP DEFAULT NOW(),
        value REAL,
        message TEXT
      )
    `);

    // Seed default alerts if empty
    const alertCount = await client.query('SELECT COUNT(*) as count FROM alerts');
    if (parseInt(alertCount.rows[0].count) === 0) {
      const alertDefaults = [
        ['Low Indoor Temperature', 'indoor_temp', 'less_than', 65, 1],
      ];
      for (const [name, type, condition, threshold, enabled] of alertDefaults) {
        await client.query(
          `INSERT INTO alerts (name, type, condition, threshold, enabled) VALUES ($1, $2, $3, $4, $5)`,
          [name, type, condition, threshold, enabled]
        );
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS lots (
        id SERIAL PRIMARY KEY,
        lot_number INTEGER NOT NULL UNIQUE,
        street TEXT NOT NULL,
        owner_name TEXT DEFAULT '',
        owner_name2 TEXT DEFAULT '',
        status TEXT DEFAULT 'occupied',
        notes TEXT DEFAULT '',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Seed lots if empty
    const lotCount = await client.query('SELECT COUNT(*) as count FROM lots');
    if (parseInt(lotCount.rows[0].count) < 63) {
      const lotsData = [
        // South grid — Row 8 (bottom): lots 1-5
        [1, 'Bourbon St', 'Spaeny', 'Matt, Treva', 'occupied', ''],
        [2, 'Vodka St', 'Pickering', 'Quinton, Jessica', 'for_sale', ''],
        [3, 'Vodka St', 'Shafer', 'Jeff, Tammy', 'occupied', ''],
        [4, 'Scotch St', 'Van Winkle', 'James', 'occupied', ''],
        [5, 'Scotch St', 'Cook', 'Dan', 'occupied', ''],
        // South grid — Row 7: lots 6-10
        [6, 'Bourbon St', 'West', 'Don', 'occupied', ''],
        [7, 'Vodka St', 'Rick', 'Marty', 'for_sale', ''],
        [8, 'Vodka St', 'Crystal', '', 'occupied', ''],
        [9, 'Scotch St', 'Roger', '', 'occupied', ''],
        [10, 'Scotch St', 'Cully', '', 'vacant', ''],
        // South grid — Row 6: lots 11-15
        [11, 'Bourbon St', 'Nathan', '', 'occupied', ''],
        [12, 'Vodka St', 'Andrea', '', 'occupied', ''],
        [13, 'Vodka St', 'Livingston', 'John, Rachel', 'occupied', ''],
        [14, 'Scotch St', 'Fisher', 'John, Sharon', 'occupied', ''],
        [15, 'Scotch St', '', '', 'vacant', ''],
        // South grid — Row 5: lots 16-20
        [16, 'Bourbon St', '', '', 'vacant', ''],
        [17, 'Vodka St', '', '', 'vacant', ''],
        [18, 'Vodka St', '', '', 'vacant', ''],
        [19, 'Scotch St', '', '', 'vacant', ''],
        [20, 'Scotch St', '', '', 'vacant', ''],
        // South grid — Row 4: lots 21-25
        [21, 'Bourbon St', '', '', 'vacant', ''],
        [22, 'Vodka St', '', '', 'vacant', ''],
        [23, 'Vodka St', '', '', 'vacant', ''],
        [24, 'Scotch St', '', '', 'vacant', ''],
        [25, 'Scotch St', '', '', 'vacant', ''],
        // South grid — Row 3: lots 26-30
        [26, 'Bourbon St', '', '', 'vacant', ''],
        [27, 'Vodka St', '', '', 'vacant', ''],
        [28, 'Vodka St', '', '', 'vacant', ''],
        [29, 'Scotch St', '', '', 'vacant', ''],
        [30, 'Scotch St', '', '', 'vacant', ''],
        // South grid — Row 2: lots 31-35
        [31, 'Bourbon St', '', '', 'vacant', ''],
        [32, 'Vodka St', '', '', 'vacant', ''],
        [33, 'Vodka St', '', '', 'vacant', ''],
        [34, 'Scotch St', '', '', 'vacant', ''],
        [35, 'Scotch St', '', '', 'vacant', ''],
        // South grid — Row 1 (top): lots 36-40
        [36, 'Bourbon St', '', '', 'vacant', ''],
        [37, 'Vodka St', '', '', 'vacant', ''],
        [38, 'Vodka St', '', '', 'vacant', ''],
        [39, 'Scotch St', '', '', 'vacant', ''],
        [40, 'Scotch St', '', '', 'vacant', ''],
        // North grid — Coors Court: lots 41-46
        [41, 'Coors Court', '', '', 'vacant', ''],
        [42, 'Coors Court', '', '', 'vacant', ''],
        [43, 'Coors Court', '', '', 'vacant', ''],
        [44, 'Coors Court', '', '', 'vacant', ''],
        [45, 'Coors Court', '', '', 'vacant', ''],
        [46, 'Coors Court', '', '', 'vacant', ''],
        // North grid — Center: lots 47-52
        [47, 'Railroad Ave', '', '', 'vacant', ''],
        [48, 'Railroad Ave', '', '', 'vacant', ''],
        [49, 'Railroad Ave', '', '', 'vacant', ''],
        [50, 'Railroad Ave', '', '', 'vacant', ''],
        [51, 'Railroad Ave', '', '', 'vacant', ''],
        [52, 'Railroad Ave', '', '', 'vacant', ''],
        // North grid — Budweiser Blvd: lots 53-58
        [53, 'Budweiser Blvd', '', '', 'vacant', ''],
        [54, 'Budweiser Blvd', '', '', 'vacant', ''],
        [55, 'Budweiser Blvd', '', '', 'vacant', ''],
        [56, 'Budweiser Blvd', '', '', 'vacant', ''],
        [57, 'Budweiser Blvd', '', '', 'vacant', ''],
        [58, 'Budweiser Blvd', '', '', 'vacant', ''],
        // Keystone Court: lots 59-63
        [59, 'Keystone Court', '', '', 'vacant', ''],
        [60, 'Keystone Court', '', '', 'vacant', ''],
        [61, 'Keystone Court', '', '', 'vacant', ''],
        [62, 'Keystone Court', '', '', 'vacant', ''],
        [63, 'Keystone Court', '', '', 'vacant', ''],
      ];
      for (const [lot_number, street, owner_name, owner_name2, status, notes] of lotsData) {
        await client.query(
          `INSERT INTO lots (lot_number, street, owner_name, owner_name2, status, notes) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (lot_number) DO NOTHING`,
          [lot_number, street, owner_name, owner_name2, status, notes]
        );
      }
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS discussions (
        id SERIAL PRIMARY KEY,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        message TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        pinned INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_comments (
        id SERIAL PRIMARY KEY,
        discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        author TEXT NOT NULL DEFAULT 'Anonymous',
        message TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_discussion ON discussion_comments(discussion_id)
    `);

    // Seed welcome post if empty
    const postCount = await client.query('SELECT COUNT(*) as count FROM discussions');
    if (parseInt(postCount.rows[0].count) === 0) {
      await client.query(
        `INSERT INTO discussions (author, message, category, pinned) VALUES ($1, $2, $3, $4)`,
        ['System', 'Welcome to the Kanopolanes Community Board! Share updates, events, and connect with your neighbors.', 'announcement', 1]
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        facebook_id TEXT UNIQUE,
        username TEXT UNIQUE,
        password_hash TEXT,
        name TEXT NOT NULL,
        email TEXT DEFAULT '',
        profile_pic TEXT DEFAULT '',
        role TEXT DEFAULT 'member',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('✓ Database initialized successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run initialization
const dbReady = initializeDatabase();

module.exports = { pool, dbReady };
