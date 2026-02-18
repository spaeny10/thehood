const { Pool } = require('pg');

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

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
    if (parseInt(lotCount.rows[0].count) === 0) {
      const lotsData = [
        [1, 'Lakeview Ct', 'Spaeny', 'Matt, Treva', 'occupied', ''],
        [2, 'Lakeview Ct', 'Pickering', 'Quinton, Jessica', 'for_sale', ''],
        [3, 'Lakeview Ct', 'Shafer', 'Jeff, Tammy', 'occupied', ''],
        [4, 'Lakeview Ct', 'Van Winkle', 'James', 'occupied', ''],
        [5, 'Lakeview Ct', 'Cook', 'Dan', 'occupied', ''],
        [6, 'Lakeview Ct', 'West', 'Don', 'occupied', ''],
        [7, 'Lake Canyon', 'Rick', 'Marty', 'for_sale', ''],
        [8, 'Lake Canyon', 'Crystal', '', 'occupied', ''],
        [9, 'Lake Canyon', 'Roger', '', 'occupied', ''],
        [10, 'Lake Canyon', 'Cully', '', 'vacant', ''],
        [11, 'Lake Canyon', 'Nathan', '', 'occupied', ''],
        [12, 'Lake Canyon', 'Andrea', '', 'occupied', ''],
        [13, 'Lake Canyon', 'Livingston', 'John, Rachel', 'occupied', ''],
        [14, 'Lake Canyon', 'Fisher', 'John, Sharon', 'occupied', ''],
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
