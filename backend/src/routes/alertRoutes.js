const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Alert management routes
router.get('/', alertController.getAllAlerts);
router.get('/history', alertController.getAlertHistory);
router.get('/:id', alertController.getAlertById);
router.post('/', alertController.createAlert);
router.put('/:id', alertController.updateAlert);
router.patch('/:id/toggle', alertController.toggleAlert);
router.delete('/:id', alertController.deleteAlert);

module.exports = router;
