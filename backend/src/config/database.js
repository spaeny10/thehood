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

    // Seed lots if missing (data from original court map document)
    const lotCount = await client.query('SELECT COUNT(*) as count FROM lots');
    if (parseInt(lotCount.rows[0].count) < 63) {
      const lotsData = [
        // ═══ SOUTH GRID — Row 8 (bottom, near 29th Road) ═══
        [1, 'Scotch St', 'Bickel', 'Sharoll', 'occupied', ''],
        [2, 'Scotch St', 'Plankenhorn', 'Mike, Velda', 'occupied', ''],
        [3, 'Vodka St', 'Beetch', 'Kevin, Karen', 'occupied', ''],
        [4, 'Vodka St', 'Toews', 'John, Sharon', 'occupied', ''],
        [5, 'Bourbon St', 'Toews', 'Shane, Crystal', 'occupied', ''],
        // ═══ Row 7 ═══
        [6, 'Scotch St', 'Schneider', 'Joe, Cassie', 'occupied', ''],
        [7, 'Scotch St', 'Stum', 'Marc, Bev', 'occupied', ''],
        [8, 'Vodka St', 'Smith', 'Tim, Karen', 'occupied', ''],
        [9, 'Vodka St', 'Richards', 'Ken, Connie', 'occupied', ''],
        [10, 'Bourbon St', 'Koeppen', 'Don', 'occupied', ''],
        // ═══ Row 6 ═══
        [11, 'Scotch St', 'Munnz', 'Aaron, Liz', 'occupied', ''],
        [12, 'Scotch St', 'Wojteczko', 'Jason, Crystal', 'occupied', ''],
        [13, 'Vodka St', 'Edger', 'Thayne, Jessica', 'occupied', ''],
        [14, 'Vodka St', 'Nelson', 'Delisa', 'occupied', ''],
        [15, 'Bourbon St', 'Andrea', '', 'occupied', ''],
        // ═══ Row 5 ═══
        [16, 'Scotch St', 'McFadden', 'Mike', 'occupied', ''],
        [17, 'Scotch St', 'McFadden', 'Mike', 'occupied', ''],
        [18, 'Vodka St', 'Ehart', 'Jeremy, Kristy', 'occupied', ''],
        [19, 'Vodka St', 'Shaw', 'Mike, Patti', 'occupied', ''],
        [20, 'Bourbon St', 'Livingston', 'John, Rachel', 'occupied', ''],
        // ═══ Row 4 ═══
        [21, 'Scotch St', 'Lassiter / Kralik', 'Shawn / Michelle', 'occupied', ''],
        [22, 'Scotch St', 'Mosier', 'Matt, Deanna', 'occupied', ''],
        [23, 'Vodka St', 'Waugh', 'Keith, Caroline', 'occupied', ''],
        [24, 'Vodka St', 'VanWinkle', 'James', 'occupied', ''],
        [25, 'Bourbon St', 'Witter', 'Tanya', 'occupied', ''],
        // ═══ Row 3 ═══
        [26, 'Scotch St', 'Mossberg', 'Lori', 'occupied', ''],
        [27, 'Scotch St', 'Alberici', 'Mario, Jodi', 'occupied', ''],
        [28, 'Vodka St', 'Engelland', 'Ed, Melissa', 'occupied', ''],
        [29, 'Vodka St', 'Pickering', 'Quinton, Jessica', 'for_sale', ''],
        [30, 'Bourbon St', 'Kenyon', 'Rick, Marty', 'for_sale', ''],
        // ═══ Row 2 ═══
        [31, 'Scotch St', 'Moore', 'Mary Jane', 'for_sale', ''],
        [32, 'Scotch St', 'Gabel', 'Mark', 'occupied', ''],
        [33, 'Vodka St', 'Miller', 'Chuck, Dawn', 'occupied', ''],
        [34, 'Vodka St', 'Oberle', 'Larry', 'occupied', ''],
        [35, 'Bourbon St', 'Tolle', 'Dan', 'occupied', ''],
        // ═══ Row 1 (top, near Railroad Ave) ═══
        [36, 'Scotch St', 'Ryan', 'Mike', 'occupied', ''],
        [37, 'Scotch St', 'Robben', 'Mike, Sandy', 'occupied', ''],
        [38, 'Vodka St', 'Spaeny', 'Mike, Twila', 'occupied', ''],
        [39, 'Vodka St', 'Neisler', 'Amy', 'occupied', ''],
        [40, 'Bourbon St', 'Schmitt', 'Robert, Sarah', 'occupied', ''],
        // ═══ NORTH GRID — Coors Court (top to bottom: 46→41) ═══
        [41, 'Coors Court', 'Spaeny', 'Shawn, Jennifer', 'occupied', ''],
        [42, 'Coors Court', 'Diggs', 'Jody', 'occupied', ''],
        [43, 'Coors Court', 'Buellenbrach', 'Trapper, Leslie', 'occupied', ''],
        [44, 'Coors Court', 'Scott', 'Greg', 'occupied', ''],
        [45, 'Coors Court', 'Babcock', 'Troy, Kevin', 'occupied', ''],
        [46, 'Coors Court', 'Swan', 'Brad, Sam', 'occupied', ''],
        // ═══ Center lots (top to bottom: 52→47) ═══
        [47, 'Railroad Ave', 'Shaft', 'Brad, Candra', 'occupied', ''],
        [48, 'Railroad Ave', 'Holzman', 'Brian', 'occupied', ''],
        [49, 'Railroad Ave', 'Steenson', 'Brad, Rachael', 'occupied', ''],
        [50, 'Railroad Ave', '', '', 'for_sale', ''],
        [51, 'Railroad Ave', 'Wells', 'May', 'occupied', ''],
        [52, 'Railroad Ave', 'Unruh', 'Tim, Kim', 'occupied', ''],
        // ═══ Budweiser Blvd (top to bottom: 58→53) ═══
        [53, 'Budweiser Blvd', 'Roger', 'Lisa', 'occupied', ''],
        [54, 'Budweiser Blvd', 'Ward', '', 'occupied', ''],
        [55, 'Budweiser Blvd', 'Pennington', 'Donnie', 'occupied', ''],
        [56, 'Budweiser Blvd', 'Sampson', 'Eric', 'occupied', ''],
        [57, 'Budweiser Blvd', 'Dorin', '', 'occupied', ''],
        [58, 'Budweiser Blvd', 'Holm', 'Trae, Lindsey', 'occupied', ''],
        // ═══ Keystone Court (left to right: 63→59) ═══
        [59, 'Keystone Court', 'Fenstermaker', 'Larry, Bonnie', 'occupied', ''],
        [60, 'Keystone Court', 'Engel', 'Troy, Leslie', 'occupied', ''],
        [61, 'Keystone Court', 'Anderson', 'Bryan, Tina', 'occupied', ''],
        [62, 'Keystone Court', 'Anderson', 'Ryan, Tina', 'occupied', ''],
        [63, 'Keystone Court', 'Morris', 'Carol', 'occupied', ''],
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
