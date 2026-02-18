const express = require('express');
const router = express.Router();
const { facebookLogin, facebookCallback, getMe, getAllUsers, updateUserRole } = require('../controllers/authController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Facebook OAuth
router.get('/facebook', facebookLogin);
router.get('/facebook/callback', ...facebookCallback);

// Current user
router.get('/me', requireAuth, getMe);

// Admin: user management
router.get('/users', requireAuth, requireAdmin, getAllUsers);
router.put('/users/:id/role', requireAuth, requireAdmin, updateUserRole);

module.exports = router;
