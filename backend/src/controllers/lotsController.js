const { pool } = require('../config/database');

const getAllLots = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM lots ORDER BY lot_number ASC');
        res.json(rows);
    } catch (error) {
        console.error('Error getting lots:', error);
        res.status(500).json({ error: 'Failed to get lots' });
    }
};

const updateLot = async (req, res) => {
    try {
        const { id } = req.params;
        const { owner_name, owner_name2, status, notes } = req.body;

        const { rows, rowCount } = await pool.query(
            `UPDATE lots SET owner_name=$1, owner_name2=$2, status=$3, notes=$4, updated_at=NOW() WHERE id=$5 RETURNING *`,
            [owner_name ?? '', owner_name2 ?? '', status ?? 'occupied', notes ?? '', id]
        );

        if (rowCount === 0) return res.status(404).json({ error: 'Lot not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating lot:', error);
        res.status(500).json({ error: 'Failed to update lot' });
    }
};

module.exports = { getAllLots, updateLot };
