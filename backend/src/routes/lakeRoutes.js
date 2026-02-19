const express = require('express');
const router = express.Router();
const { getLakeConditions, getLakeHistorical } = require('../controllers/lakeController');

router.get('/', getLakeConditions);
router.get('/historical', getLakeHistorical);

module.exports = router;
