const { dbReady } = require('./backend/src/config/database');
const app = require('./backend/src/server');

// Ensure DB tables are created before handling requests
let initialized = false;
module.exports = async (req, res) => {
    if (!initialized) {
        await dbReady;
        initialized = true;
    }
    return app(req, res);
};
