const { pool } = require('../config/database');

const getAllAlerts = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM alerts ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
};

const getAlertById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM alerts WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Alert not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error getting alert:', error);
    res.status(500).json({ error: 'Failed to fetch alert' });
  }
};

const createAlert = async (req, res) => {
  try {
    const { name, type, condition, threshold, enabled = 1 } = req.body;
    if (!name || !type || !condition || threshold === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const { rows } = await pool.query(
      `INSERT INTO alerts (name, type, condition, threshold, enabled) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, type, condition, threshold, enabled ? 1 : 0]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
};

const updateAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, condition, threshold, enabled } = req.body;
    const existing = await pool.query('SELECT * FROM alerts WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Alert not found' });
    const alert = existing.rows[0];

    const { rows } = await pool.query(
      `UPDATE alerts SET name=$1, type=$2, condition=$3, threshold=$4, enabled=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [
        name !== undefined ? name : alert.name,
        type !== undefined ? type : alert.type,
        condition !== undefined ? condition : alert.condition,
        threshold !== undefined ? threshold : alert.threshold,
        enabled !== undefined ? (enabled ? 1 : 0) : alert.enabled,
        id
      ]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
};

const deleteAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM alerts WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Alert not found' });
    await pool.query('DELETE FROM alerts WHERE id = $1', [id]);
    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
};

const getAlertHistory = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const { rows } = await pool.query(
      `SELECT ah.*, a.name as alert_name, a.type FROM alert_history ah JOIN alerts a ON ah.alert_id = a.id ORDER BY ah.triggered_at DESC LIMIT $1`,
      [parseInt(limit)]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error getting alert history:', error);
    res.status(500).json({ error: 'Failed to fetch alert history' });
  }
};

const toggleAlert = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM alerts WHERE id = $1', [id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Alert not found' });
    const newStatus = existing.rows[0].enabled === 1 ? 0 : 1;
    const { rows } = await pool.query(
      `UPDATE alerts SET enabled=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [newStatus, id]
    );
    res.json(rows[0]);
  } catch (error) {
    console.error('Error toggling alert:', error);
    res.status(500).json({ error: 'Failed to toggle alert' });
  }
};

module.exports = { getAllAlerts, getAlertById, createAlert, updateAlert, deleteAlert, getAlertHistory, toggleAlert };
