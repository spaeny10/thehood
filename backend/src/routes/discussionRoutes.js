const express = require('express');
const router = express.Router();
const { requireAuth, optionalAuth, requireAdmin } = require('../middleware/authMiddleware');
const {
    getAllPosts, createPost, deletePost, togglePin, likePost,
    getComments, addComment, deleteComment,
} = require('../controllers/discussionController');

// Public — anyone can read
router.get('/', getAllPosts);
router.get('/:id/comments', getComments);

// Authenticated — must be logged in to post/comment/like
router.post('/', optionalAuth, createPost);
router.put('/:id/like', likePost);
router.post('/:id/comments', optionalAuth, addComment);

// Admin only — pin, delete
router.put('/:id/pin', requireAuth, requireAdmin, togglePin);
router.delete('/:id', requireAuth, requireAdmin, deletePost);
router.delete('/:id/comments/:commentId', requireAuth, requireAdmin, deleteComment);

module.exports = router;
