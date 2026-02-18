const express = require('express');
const router = express.Router();
const { getAllLots, updateLot } = require('../controllers/lotsController');

router.get('/', getAllLots);
router.put('/:id', updateLot);

module.exports = router;
