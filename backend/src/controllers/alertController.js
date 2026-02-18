const db = require('../config/database');

/**
 * Get all alerts
 */
const getAllAlerts = (req, res) => {
  try {
    const alerts = db.prepare('SELECT * FROM alerts ORDER BY created_at DESC').all();
    res.json(alerts);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

/**
 * Get alert by ID
 */
const getAlertById = (req, res) => {
  try {
    const { id } = req.params;
    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    console.error('Error getting alert:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
};

/**
 * Create new alert
 */
const createAlert = (req, res) => {
  try {
    const { name, type, condition, threshold, enabled = 1 } = req.body;

    if (!name || !type || !condition || threshold === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const insert = db.prepare(`
      INSERT INTO alerts (name, type, condition, threshold, enabled)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = insert.run(name, type, condition, threshold, enabled ? 1 : 0);

    const newAlert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json(newAlert);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

/**
 * Update alert
 */
const updateAlert = (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, condition, threshold, enabled } = req.body;

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const update = db.prepare(`
      UPDATE alerts
      SET name = ?, type = ?, condition = ?, threshold = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(
      name !== undefined ? name : alert.name,
      type !== undefined ? type : alert.type,
      condition !== undefined ? condition : alert.condition,
      threshold !== undefined ? threshold : alert.threshold,
      enabled !== undefined ? (enabled ? 1 : 0) : alert.enabled,
      id
    );

    const updatedAlert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
};

/**
 * Delete alert
 */
const deleteAlert = (req, res) => {
  try {
    const { id } = req.params;

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    db.prepare('DELETE FROM alerts WHERE id = ?').run(id);

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
};

/**
 * Get alert history
 */
const getAlertHistory = (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const history = db.prepare(`
      SELECT ah.*, a.name as alert_name, a.type
      FROM alert_history ah
      JOIN alerts a ON ah.alert_id = a.id
      ORDER BY ah.triggered_at DESC
      LIMIT ?
    `).all(parseInt(limit));

    res.json(history);
  } catch (error) {
    console.error('Error getting alert history:', error);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
};

/**
 * Toggle alert enabled status
 */
const toggleAlert = (req, res) => {
  try {
    const { id } = req.params;

    const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const newStatus = alert.enabled === 1 ? 0 : 1;

    db.prepare('UPDATE alerts SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(newStatus, id);

    const updatedAlert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(id);

    res.json(updatedAlert);
  } catch (error) {
    console.error('Error toggling alert:', error);
    res.status(500).json({ error: 'Failed to toggle alert' });
  }
};

module.exports = {
  getAllAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  deleteAlert,
  getAlertHistory,
  toggleAlert
};
