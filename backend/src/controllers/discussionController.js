const { pool } = require('../config/database');

/* ─── POSTS ─── */
const getAllPosts = async (req, res) => {
    try {
        const category = req.query.category;
        let rows;
        if (category && category !== 'all') {
            ({ rows } = await pool.query(`
        SELECT d.*, (SELECT COUNT(*) FROM discussion_comments c WHERE c.discussion_id = d.id) as comment_count
        FROM discussions d WHERE d.category = $1
        ORDER BY d.pinned DESC, d.created_at DESC
      `, [category]));
        } else {
            ({ rows } = await pool.query(`
        SELECT d.*, (SELECT COUNT(*) FROM discussion_comments c WHERE c.discussion_id = d.id) as comment_count
        FROM discussions d
        ORDER BY d.pinned DESC, d.created_at DESC
      `));
        }
        res.json(rows);
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ error: 'Failed to get posts' });
    }
};

const createPost = async (req, res) => {
    try {
        const { message, category } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
        const author = req.user?.name || req.body.author?.trim() || 'Anonymous';

        const { rows } = await pool.query(
            `INSERT INTO discussions (author, message, category) VALUES ($1,$2,$3) RETURNING *`,
            [author, message.trim(), category || 'general']
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};

const deletePost = async (req, res) => {
    try {
        await pool.query('DELETE FROM discussions WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
};

const togglePin = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE discussions SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('Error toggling pin:', error);
        res.status(500).json({ error: 'Failed to toggle pin' });
    }
};

const likePost = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `UPDATE discussions SET likes = likes + 1 WHERE id = $1 RETURNING *`,
            [req.params.id]
        );
        res.json(rows[0]);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
};

/* ─── COMMENTS ─── */
const getComments = async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM discussion_comments WHERE discussion_id = $1 ORDER BY created_at ASC',
            [req.params.id]
        );
        res.json(rows);
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
};

const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
        const author = req.user?.name || req.body.author?.trim() || 'Anonymous';

        const { rows } = await pool.query(
            `INSERT INTO discussion_comments (discussion_id, author, message) VALUES ($1,$2,$3) RETURNING *`,
            [id, author, message.trim()]
        );
        await pool.query('UPDATE discussions SET updated_at = NOW() WHERE id = $1', [id]);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

const deleteComment = async (req, res) => {
    try {
        await pool.query('DELETE FROM discussion_comments WHERE id = $1', [req.params.commentId]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};

module.exports = { getAllPosts, createPost, deletePost, togglePin, likePost, getComments, addComment, deleteComment };
