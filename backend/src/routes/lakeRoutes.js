const express = require('express');
const router = express.Router();
const { getLakeConditions } = require('../controllers/lakeController');

router.get('/', getLakeConditions);

module.exports = router;
