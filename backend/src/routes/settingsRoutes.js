const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, getStats, purgeData } = require('../controllers/settingsController');

router.get('/', getSettings);
router.put('/', updateSettings);
router.get('/stats', getStats);
router.post('/purge', purgeData);

module.exports = router;
