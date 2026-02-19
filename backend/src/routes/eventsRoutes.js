const express = require('express');
const router = express.Router();
const { getEvents, getAllEvents, createEvent, deleteEvent } = require('../controllers/eventsController');
const { requireAuth } = require('../middleware/auth');

// Public: get upcoming events
router.get('/', getEvents);
// Public: get all events (past + future)
router.get('/all', getAllEvents);
// Auth required: create event
router.post('/', requireAuth, createEvent);
// Auth required: delete event (author or admin)
router.delete('/:id', requireAuth, deleteEvent);

module.exports = router;
