const express = require('express');
const router = express.Router();
const { getFishingReport } = require('../controllers/fishingController');

router.get('/', getFishingReport);

module.exports = router;
