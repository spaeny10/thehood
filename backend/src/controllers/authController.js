const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'kanopolanes-secret-change-me';
const ADMIN_NAME = (process.env.ADMIN_FACEBOOK_NAME || 'Spaeny').toLowerCase();

// ─── Passport Facebook Strategy ───
passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID || 'placeholder',
    clientSecret: process.env.FB_APP_SECRET || 'placeholder',
    callbackURL: process.env.FB_CALLBACK_URL || '/api/auth/facebook/callback',
    profileFields: ['id', 'displayName', 'email', 'picture.type(large)'],
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const facebookId = profile.id;
            const name = profile.displayName || 'User';
            const email = profile.emails?.[0]?.value || '';
            const profilePic = profile.photos?.[0]?.value || '';
            const role = name.toLowerCase().includes(ADMIN_NAME) ? 'admin' : 'member';

            const existing = await pool.query('SELECT * FROM users WHERE facebook_id = $1', [facebookId]);

            let user;
            if (existing.rows[0]) {
                const { rows } = await pool.query(
                    `UPDATE users SET name=$1, email=$2, profile_pic=$3 WHERE facebook_id=$4 RETURNING *`,
                    [name, email, profilePic, facebookId]
                );
                user = rows[0];
            } else {
                const { rows } = await pool.query(
                    `INSERT INTO users (facebook_id, name, email, profile_pic, role) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
                    [facebookId, name, email, profilePic, role]
                );
                user = rows[0];
                console.log(`[Auth] New FB user: ${name} (${role})`);
            }

            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        done(null, rows[0] || null);
    } catch (err) {
        done(err, null);
    }
});

function generateToken(user) {
    return jwt.sign(
        { id: user.id, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ─── Facebook OAuth ───
const facebookLogin = passport.authenticate('facebook', { scope: ['email'] });

const facebookCallback = (req, res, next) => {
    passport.authenticate('facebook', { session: false }, (err, user) => {
        if (err || !user) {
            const frontendUrl = process.env.FRONTEND_URL || '/';
            return res.redirect(`${frontendUrl}?auth_error=true`);
        }
        const token = generateToken(user);
        const frontendUrl = process.env.FRONTEND_URL || '/';
        res.redirect(`${frontendUrl}?token=${token}`);
    })(req, res, next);
};

// ─── Local Registration ───
const register = async (req, res) => {
    try {
        const { username, password, name, email } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Username, password, and name are required' });
        }
        if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
        if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

        // Check if username taken
        const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
        if (existing.rows[0]) return res.status(409).json({ error: 'Username already taken' });

        const password_hash = await bcrypt.hash(password, 10);
        const role = name.toLowerCase().includes(ADMIN_NAME) ? 'admin' : 'member';

        const { rows } = await pool.query(
            `INSERT INTO users (username, password_hash, name, email, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, username, name, email, profile_pic, role, created_at`,
            [username.toLowerCase(), password_hash, name, email || '', role]
        );

        console.log(`[Auth] New local user: ${name} (${role})`);
        const token = generateToken(rows[0]);
        res.status(201).json({ token, user: rows[0] });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

// ─── Local Login ───
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

        const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
        const user = rows[0];
        if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid username or password' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid username or password' });

        const token = generateToken(user);
        res.json({ token, user: { id: user.id, username: user.username, name: user.name, email: user.email, profile_pic: user.profile_pic, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
};

// ─── Current User ───
const getCurrentUser = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, facebook_id, username, name, email, profile_pic, role, created_at FROM users WHERE id = $1', [req.user.id]);
        if (!rows[0]) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error getting current user:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
};

// ─── Admin: list users ───
const getAllUsers = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT id, facebook_id, username, name, email, profile_pic, role, created_at FROM users ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
};

// ─── Admin: update role ───
const updateUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
        const { rows, rowCount } = await pool.query(
            `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, name, email, profile_pic, role, created_at`,
            [role, id]
        );
        if (rowCount === 0) return res.status(404).json({ error: 'User not found' });
        res.json(rows[0]);
    } catch (error) {
        console.error('Error updating user role:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
};

module.exports = { facebookLogin, facebookCallback, register, login, getCurrentUser, getAllUsers, updateUserRole };
