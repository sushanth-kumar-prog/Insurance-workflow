const express = require('express');
const router = express.Router();
const { getFhirClaim, submitNhcx } = require('../controllers/nhcxController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/claims/:id/fhir', authorizeRoles('VERIFIER', 'APPROVER', 'FINANCE', 'SYSTEM', 'CLAIMANT'), getFhirClaim);
router.post('/nhcx/submit', authorizeRoles('VERIFIER', 'APPROVER', 'FINANCE', 'SYSTEM'), submitNhcx);

module.exports = router;
