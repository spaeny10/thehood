const searchService = require('../services/searchService');

// Simple in-memory rate limiter
const rateLimit = new Map();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

const search = async (req, res) => {
  try {
    const { query } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }
    if (query.length > 500) {
      return res.status(400).json({ error: 'Query must be under 500 characters' });
    }

    // Rate limiting by IP
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - RATE_WINDOW;

    if (!rateLimit.has(ip)) rateLimit.set(ip, []);
    const timestamps = rateLimit.get(ip).filter(t => t > windowStart);
    timestamps.push(now);
    rateLimit.set(ip, timestamps);

    if (timestamps.length > RATE_LIMIT) {
      return res.status(429).json({ error: 'Too many searches. Please wait a moment and try again.' });
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'Search is not configured. ANTHROPIC_API_KEY is missing.' });
    }

    const result = await searchService.search(query.trim());
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
};

// Clean up rate limit map periodically (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW;
  for (const [ip, timestamps] of rateLimit.entries()) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length === 0) rateLimit.delete(ip);
    else rateLimit.set(ip, filtered);
  }
}, 5 * 60 * 1000);

module.exports = { search };
