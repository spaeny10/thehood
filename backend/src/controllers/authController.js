const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'kanopolanes-default-secret';
const ADMIN_NAME = (process.env.ADMIN_FACEBOOK_NAME || 'Spaeny').toLowerCase();

/* ─── Passport Facebook Strategy ─── */
passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_APP_SECRET,
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email', 'picture.type(large)'],
},
    (accessToken, refreshToken, profile, done) => {
        try {
            const fbId = profile.id;
            const name = profile.displayName || 'User';
            const email = profile.emails?.[0]?.value || '';
            const pic = profile.photos?.[0]?.value || '';

            // Check if user exists
            let user = db.prepare('SELECT * FROM users WHERE facebook_id = ?').get(fbId);

            if (!user) {
                // Determine role — admin if name matches
                const role = name.toLowerCase().includes(ADMIN_NAME) ? 'admin' : 'member';
                db.prepare(`
          INSERT INTO users (facebook_id, name, email, profile_pic, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(fbId, name, email, pic, role);
                user = db.prepare('SELECT * FROM users WHERE facebook_id = ?').get(fbId);
                console.log(`[Auth] New user created: ${name} (${role})`);
            } else {
                // Update profile pic and name on each login
                db.prepare('UPDATE users SET name = ?, profile_pic = ? WHERE facebook_id = ?')
                    .run(name, pic, fbId);
                user.name = name;
                user.profile_pic = pic;
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    done(null, user);
});

/* ─── Generate JWT ─── */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, facebook_id: user.facebook_id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/* ─── Route Handlers ─── */

// GET /api/auth/facebook — redirect to Facebook
const facebookLogin = passport.authenticate('facebook', {
    scope: ['public_profile', 'email'],
});

// GET /api/auth/facebook/callback
const facebookCallback = [
    passport.authenticate('facebook', { failureRedirect: '/?auth=failed', session: false }),
    (req, res) => {
        const token = generateToken(req.user);
        // Redirect back to frontend with token in URL
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}?token=${token}`);
    },
];

// GET /api/auth/me
const getMe = (req, res) => {
    res.json(req.user);
};

// GET /api/auth/users — admin only
const getAllUsers = (req, res) => {
    try {
        const users = db.prepare('SELECT id, facebook_id, name, email, profile_pic, role, created_at FROM users ORDER BY created_at ASC').all();
        res.json(users);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

// PUT /api/auth/users/:id/role — admin only
const updateUserRole = (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({ error: 'Role must be admin or member' });
        }
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
        const user = db.prepare('SELECT id, facebook_id, name, email, profile_pic, role, created_at FROM users WHERE id = ?').get(id);
        res.json(user);
    } catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
};

module.exports = { facebookLogin, facebookCallback, getMe, getAllUsers, updateUserRole, generateToken };
