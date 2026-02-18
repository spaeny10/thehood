const db = require('../config/database');

/* ─── POSTS ─── */
const getAllPosts = (req, res) => {
    try {
        const category = req.query.category;
        let posts;
        if (category && category !== 'all') {
            posts = db.prepare(`
        SELECT d.*,
          (SELECT COUNT(*) FROM discussion_comments c WHERE c.discussion_id = d.id) as comment_count
        FROM discussions d
        WHERE d.category = ?
        ORDER BY d.pinned DESC, d.created_at DESC
      `).all(category);
        } else {
            posts = db.prepare(`
        SELECT d.*,
          (SELECT COUNT(*) FROM discussion_comments c WHERE c.discussion_id = d.id) as comment_count
        FROM discussions d
        ORDER BY d.pinned DESC, d.created_at DESC
      `).all();
        }
        res.json(posts);
    } catch (error) {
        console.error('Error getting posts:', error);
        res.status(500).json({ error: 'Failed to get posts' });
    }
};

const createPost = (req, res) => {
    try {
        const { message, category } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

        // Use logged-in user name if available, otherwise fallback to body.author
        const author = req.user?.name || req.body.author?.trim() || 'Anonymous';

        const result = db.prepare(`
      INSERT INTO discussions (author, message, category)
      VALUES (?, ?, ?)
    `).run(author, message.trim(), category || 'general');

        const post = db.prepare('SELECT * FROM discussions WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
};

const deletePost = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM discussions WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
};

const togglePin = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('UPDATE discussions SET pinned = CASE WHEN pinned = 1 THEN 0 ELSE 1 END WHERE id = ?').run(id);
        const post = db.prepare('SELECT * FROM discussions WHERE id = ?').get(id);
        res.json(post);
    } catch (error) {
        console.error('Error toggling pin:', error);
        res.status(500).json({ error: 'Failed to toggle pin' });
    }
};

const likePost = (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('UPDATE discussions SET likes = likes + 1 WHERE id = ?').run(id);
        const post = db.prepare('SELECT * FROM discussions WHERE id = ?').get(id);
        res.json(post);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ error: 'Failed to like post' });
    }
};

/* ─── COMMENTS ─── */
const getComments = (req, res) => {
    try {
        const { id } = req.params;
        const comments = db.prepare('SELECT * FROM discussion_comments WHERE discussion_id = ? ORDER BY created_at ASC').all(id);
        res.json(comments);
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
};

const addComment = (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });

        const author = req.user?.name || req.body.author?.trim() || 'Anonymous';

        const result = db.prepare(`
      INSERT INTO discussion_comments (discussion_id, author, message)
      VALUES (?, ?, ?)
    `).run(id, author, message.trim());

        db.prepare('UPDATE discussions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

        const comment = db.prepare('SELECT * FROM discussion_comments WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

const deleteComment = (req, res) => {
    try {
        const { commentId } = req.params;
        db.prepare('DELETE FROM discussion_comments WHERE id = ?').run(commentId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};

module.exports = { getAllPosts, createPost, deletePost, togglePin, likePost, getComments, addComment, deleteComment };
