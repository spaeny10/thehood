const { pool } = require('../config/database');

const getEvents = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM community_events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC, event_time ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
};

const getAllEvents = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM community_events ORDER BY event_date ASC, event_time ASC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error getting all events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
};

const createEvent = async (req, res) => {
    try {
        const { title, description, event_date, event_time, location } = req.body;
        if (!title || !event_date) {
            return res.status(400).json({ error: 'Title and date are required' });
        }
        const authorName = req.user?.name || 'Anonymous';
        const authorId = req.user?.id || null;

        const { rows } = await pool.query(
            `INSERT INTO community_events (title, description, event_date, event_time, location, author_name, author_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [title, description || '', event_date, event_time || '', location || '', authorName, authorId]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating event:', error);
        res.status(500).json({ error: 'Failed to create event' });
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        // Allow deletion if user is admin or event author
        const { rows } = await pool.query('SELECT * FROM community_events WHERE id = $1', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const event = rows[0];
        const isAuthor = req.user?.id && event.author_id === req.user.id;
        const isAdmin = req.user?.role === 'admin';
        if (!isAuthor && !isAdmin) {
            return res.status(403).json({ error: 'Not authorized to delete this event' });
        }

        await pool.query('DELETE FROM community_events WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
};

module.exports = { getEvents, getAllEvents, createEvent, deleteEvent };
