const express = require('express');
const router = express.Router();
const { facebookLogin, facebookCallback, register, login, getCurrentUser, getAllUsers, updateUserRole } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Local auth
router.post('/register', register);
router.post('/login', login);

// Facebook OAuth
router.get('/facebook', facebookLogin);
router.get('/facebook/callback', facebookCallback);

// Current user
router.get('/me', requireAuth, getCurrentUser);

// Admin: user management
router.get('/users', requireAuth, requireAdmin, getAllUsers);
router.put('/users/:id/role', requireAuth, requireAdmin, updateUserRole);

module.exports = router;
