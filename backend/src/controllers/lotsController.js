const db = require('../config/database');

const getAllLots = (req, res) => {
    try {
        const lots = db.prepare('SELECT * FROM lots ORDER BY lot_number ASC').all();
        res.json(lots);
    } catch (error) {
        console.error('Error getting lots:', error);
        res.status(500).json({ error: 'Failed to get lots' });
    }
};

const updateLot = (req, res) => {
    try {
        const { id } = req.params;
        const { owner_name, owner_name2, status, notes } = req.body;

        const stmt = db.prepare(`
      UPDATE lots
      SET owner_name = ?, owner_name2 = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

        const result = stmt.run(
            owner_name ?? '',
            owner_name2 ?? '',
            status ?? 'occupied',
            notes ?? '',
            id
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Lot not found' });
        }

        const updated = db.prepare('SELECT * FROM lots WHERE id = ?').get(id);
        res.json(updated);
    } catch (error) {
        console.error('Error updating lot:', error);
        res.status(500).json({ error: 'Failed to update lot' });
    }
};

module.exports = { getAllLots, updateLot };
