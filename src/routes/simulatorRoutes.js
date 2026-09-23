const express = require('express');
const router = express.Router();
const validateSimulator = require('../middleware/validateSimulator');
const { evaluateSimulation } = require('../controllers/simulatorController');

router.post('/evaluate', validateSimulator, evaluateSimulation);

module.exports = router;
