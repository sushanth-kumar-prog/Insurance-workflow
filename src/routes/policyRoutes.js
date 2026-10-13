const express = require('express');
const router = express.Router();
const { createPolicy, listPolicies, getPolicy, assignPolicyToUser } = require('../controllers/policyController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Only insurer-side roles may create or amend policies.
const UNDERWRITING_ROLES = ['VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'];

router.use(authenticateToken);

router.post('/', authorizeRoles(...UNDERWRITING_ROLES), createPolicy);
router.get('/', authorizeRoles(...UNDERWRITING_ROLES, 'CLAIMANT', 'HOSPITAL_DESK'), listPolicies);
router.get('/:id', authorizeRoles(...UNDERWRITING_ROLES, 'CLAIMANT', 'HOSPITAL_DESK'), getPolicy);
router.post('/assign/:userId', authorizeRoles(...UNDERWRITING_ROLES), assignPolicyToUser);

module.exports = router;
