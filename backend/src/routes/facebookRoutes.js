const express = require('express');
const router = express.Router();
const { getFeed, getEvents } = require('../controllers/facebookController');

router.get('/feed', getFeed);
router.get('/events', getEvents);

module.exports = router;
