const Anthropic = require('@anthropic-ai/sdk').default;
const { pool } = require('../config/database');
const FishingReportService = require('./fishingReportService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const fishingService = new FishingReportService();

const tools = [
  {
    name: 'get_current_weather',
    description: 'Get the latest current weather conditions including temperature, humidity, wind, rain, pressure, UV index, and more from the Kanopolanes weather station.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_weather_history',
    description: 'Get historical weather data for a specified time period. Returns timestamped readings with temperature, humidity, wind, rain, etc. Use this for questions about past weather, trends, records, averages, or comparisons. IMPORTANT: For rain totals, the summary mode returns the station\'s built-in running totals (rain_daily, rain_weekly, rain_monthly) from the most recent reading — do NOT try to sum rain_hourly readings.',
    input_schema: {
      type: 'object',
      properties: {
        hours_ago: { type: 'number', description: 'How many hours of history to retrieve. E.g., 24 for last day, 168 for last week, 720 for last month.' },
        stat_type: { type: 'string', enum: ['raw', 'summary'], description: 'raw returns individual readings (limited to 50), summary returns min/max/avg aggregations plus rain running totals' }
      },
      required: ['hours_ago']
    }
  },
  {
    name: 'get_lake_conditions',
    description: 'Get current Lake Kanopolis conditions including elevation (ft), water temperature (°F), dam outflow (cfs), inflow (cfs), storage, and surface wind.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_lake_history',
    description: 'Get historical lake data showing elevation, water temp, and outflow trends over time.',
    input_schema: {
      type: 'object',
      properties: {
        hours_ago: { type: 'number', description: 'How many hours of history. E.g., 168 for a week, 720 for a month.' }
      },
      required: ['hours_ago']
    }
  },
  {
    name: 'get_lot_info',
    description: 'Look up information about lots in Kanopolanes Park. Can search by lot number or by owner name. Returns lot number, street, owner names, status (occupied/for_sale/vacant).',
    input_schema: {
      type: 'object',
      properties: {
        lot_number: { type: 'number', description: 'Specific lot number to look up (1-63)' },
        owner_name: { type: 'string', description: 'Search for lots by owner name (partial match)' }
      },
      required: []
    }
  },
  {
    name: 'get_discussions',
    description: 'Get recent community discussion board posts from Kanopolanes residents.',
    input_schema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of recent posts to retrieve (default 10, max 25)' },
        category: { type: 'string', description: 'Filter by category (general, announcement, question, event)' }
      },
      required: []
    }
  },
  {
    name: 'get_upcoming_events',
    description: 'Get upcoming community events at Kanopolanes Park.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_fishing_report',
    description: 'Get the current KDWP fishing report for Kanopolis Reservoir including species, ratings, sizes, and recommended baits/methods.',
    input_schema: { type: 'object', properties: {}, required: [] }
  }
];

// --- Tool execution functions ---

async function handleGetCurrentWeather() {
  const { rows } = await pool.query('SELECT * FROM weather_data ORDER BY timestamp DESC LIMIT 1');
  if (!rows[0]) return { error: 'No weather data available' };
  return rows[0];
}

async function handleGetWeatherHistory(input) {
  const { hours_ago, stat_type } = input;
  const since = Date.now() - hours_ago * 3600000;

  if (stat_type === 'summary') {
    // Get temperature, wind, pressure aggregations
    const { rows: statsRows } = await pool.query(`
      SELECT
        MIN(outdoor_temp) as min_temp, MAX(outdoor_temp) as max_temp,
        ROUND(AVG(outdoor_temp)::numeric, 1) as avg_temp,
        MAX(wind_speed) as max_wind, MAX(wind_gust) as max_gust,
        MIN(pressure) as min_pressure, MAX(pressure) as max_pressure,
        MAX(uv_index) as max_uv,
        COUNT(*) as reading_count
      FROM weather_data WHERE timestamp >= $1
    `, [since]);

    // Get rain running totals from the latest reading (station maintains these)
    const { rows: rainRows } = await pool.query(
      'SELECT rain_hourly, rain_daily, rain_weekly, rain_monthly, rain_total FROM weather_data ORDER BY timestamp DESC LIMIT 1'
    );

    const stats = statsRows[0] || { error: 'No data for that period' };
    const rain = rainRows[0] || {};
    return {
      ...stats,
      current_rain_hourly: rain.rain_hourly,
      current_rain_daily: rain.rain_daily,
      current_rain_weekly: rain.rain_weekly,
      current_rain_monthly: rain.rain_monthly,
      current_rain_total: rain.rain_total,
      note: 'Rain values (daily/weekly/monthly/total) are running totals from the weather station, not sums of readings.'
    };
  }

  const { rows } = await pool.query(
    'SELECT * FROM weather_data WHERE timestamp >= $1 ORDER BY timestamp DESC LIMIT 50',
    [since]
  );
  return rows;
}

async function handleGetLakeConditions() {
  const { rows } = await pool.query('SELECT * FROM lake_data ORDER BY timestamp DESC LIMIT 1');
  if (!rows[0]) return { error: 'No lake data available' };
  return rows[0];
}

async function handleGetLakeHistory(input) {
  const { hours_ago } = input;
  const since = Date.now() - hours_ago * 3600000;
  const { rows } = await pool.query(
    'SELECT * FROM lake_data WHERE timestamp >= $1 ORDER BY timestamp DESC LIMIT 50',
    [since]
  );
  return rows;
}

async function handleGetLotInfo(input) {
  const { lot_number, owner_name } = input;

  if (lot_number) {
    const { rows } = await pool.query('SELECT * FROM lots WHERE lot_number = $1', [lot_number]);
    return rows;
  }

  if (owner_name) {
    const pattern = `%${owner_name.toLowerCase()}%`;
    const { rows } = await pool.query(
      'SELECT * FROM lots WHERE LOWER(owner_name) LIKE $1 OR LOWER(owner_name2) LIKE $1',
      [pattern]
    );
    return rows;
  }

  const { rows } = await pool.query('SELECT * FROM lots ORDER BY lot_number');
  return rows;
}

async function handleGetDiscussions(input) {
  const { limit = 10, category } = input;
  const safeLimit = Math.min(Math.max(1, limit), 25);

  if (category) {
    const { rows } = await pool.query(
      'SELECT * FROM discussions WHERE category = $1 ORDER BY pinned DESC, created_at DESC LIMIT $2',
      [category, safeLimit]
    );
    return rows;
  }

  const { rows } = await pool.query(
    'SELECT * FROM discussions ORDER BY pinned DESC, created_at DESC LIMIT $1',
    [safeLimit]
  );
  return rows;
}

async function handleGetUpcomingEvents() {
  const { rows } = await pool.query(
    'SELECT * FROM community_events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC, event_time ASC'
  );
  return rows;
}

async function handleGetFishingReport() {
  return await fishingService.getReport();
}

// --- Route tool calls to handlers ---

async function executeTool(name, input) {
  switch (name) {
    case 'get_current_weather':   return await handleGetCurrentWeather();
    case 'get_weather_history':   return await handleGetWeatherHistory(input);
    case 'get_lake_conditions':   return await handleGetLakeConditions();
    case 'get_lake_history':      return await handleGetLakeHistory(input);
    case 'get_lot_info':          return await handleGetLotInfo(input);
    case 'get_discussions':       return await handleGetDiscussions(input);
    case 'get_upcoming_events':   return await handleGetUpcomingEvents();
    case 'get_fishing_report':    return await handleGetFishingReport();
    default:                      return { error: `Unknown tool: ${name}` };
  }
}

// --- Main search function ---

async function search(query) {
  const startTime = Date.now();
  const sources = new Set();

  // Build a fresh system prompt with current date/time on each call
  const systemPrompt = `You are a helpful assistant for Kanopolanes Park, a residential community at Lake Kanopolis in central Kansas. You help residents and visitors find information about weather conditions, lake levels, community events, lot owners, fishing reports, and more.

IMPORTANT RULES:
- Always use the available tools to look up current/real data — never guess or make up data
- Give concise, conversational answers — don't just dump raw data
- When showing temperatures, use °F. When showing wind, use mph.
- Format dates and times in a friendly way (e.g., "Tuesday afternoon" not "2026-05-20T14:00:00")
- If a user asks about something you can't look up, say so politely
- Keep answers brief and mobile-friendly (users are on phones)
- Current date/time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} (Central Time)`;

  const messages = [{ role: 'user', content: query }];

  // Tool use loop (max 5 rounds)
  let response;
  for (let round = 0; round < 5; round++) {
    response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });

    // If no tool use, we have the final answer
    if (response.stop_reason !== 'tool_use') break;

    // Process tool calls
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

    // Add assistant message with all content
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool and build tool results
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      sources.add(toolUse.name);
      let result;
      try {
        result = await executeTool(toolUse.name, toolUse.input);
      } catch (err) {
        result = { error: err.message };
      }
      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    messages.push({ role: 'user', content: toolResults });
  }

  // Extract text answer
  const textBlocks = response.content.filter(b => b.type === 'text');
  const answer = textBlocks.map(b => b.text).join('\n') || 'Sorry, I couldn\'t find an answer to that question.';

  // Map source names to friendly labels
  const sourceLabels = {
    get_current_weather: 'Weather Station',
    get_weather_history: 'Weather History',
    get_lake_conditions: 'Lake Data',
    get_lake_history: 'Lake History',
    get_lot_info: 'Court Map',
    get_discussions: 'Community Board',
    get_upcoming_events: 'Events Calendar',
    get_fishing_report: 'KDWP Fishing Report',
  };

  return {
    answer,
    sources: [...sources].map(s => sourceLabels[s] || s),
    duration_ms: Date.now() - startTime,
  };
}

module.exports = { search };
