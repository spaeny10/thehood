const express = require('express');
const router = express.Router();
const { getLakeConditions, getLakeHistorical, getLakeForecast } = require('../controllers/lakeController');

router.get('/', getLakeConditions);
router.get('/forecast', getLakeForecast);
router.get('/historical', getLakeHistorical);

module.exports = router;
