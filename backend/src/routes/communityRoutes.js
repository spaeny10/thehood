const express = require('express');
const router = express.Router();
const { getSunMoon, getNWSAlerts } = require('../controllers/communityController');

router.get('/sun-moon', getSunMoon);
router.get('/nws-alerts', getNWSAlerts);

module.exports = router;
