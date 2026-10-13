const express = require('express');
const router = express.Router();
const { submitNhcx } = require('../controllers/nhcxController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Gateway router: NHCX submission only.
// The FHIR claim read lives in claimRoutes, which owns all /api/claims/* paths.
router.use(authenticateToken);

router.post('/nhcx/submit', authorizeRoles('VERIFIER', 'APPROVER', 'FINANCE', 'SYSTEM'), submitNhcx);

module.exports = router;
