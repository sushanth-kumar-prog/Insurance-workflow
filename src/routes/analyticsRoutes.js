const express = require('express');
const router = express.Router();
const { getSlaSummary } = require('../controllers/analyticsController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/sla-summary', authorizeRoles('VERIFIER', 'APPROVER', 'FINANCE', 'SYSTEM', 'MEDICAL_OFFICER'), getSlaSummary);

module.exports = router;
