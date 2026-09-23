const express = require('express');
const router = express.Router();
const { createClaim, adjudicateSavedClaim, transitionStatus, getAuditTrail } = require('../controllers/claimController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.use(authenticateToken); // Protect all claim endpoints

router.post('/', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK'), createClaim);
router.post('/:id/adjudicate', authorizeRoles('SYSTEM', 'VERIFIER', 'APPROVER', 'MEDICAL_OFFICER'), adjudicateSavedClaim);
router.post('/:id/transition', transitionStatus);
router.get('/:id/audit-trail', getAuditTrail);

module.exports = router;
