const express = require('express');
const router = express.Router();
const { createClaim, listClaims, adjudicateSavedClaim, transitionStatus, getAuditTrail, disputeLineItem, uploadDocuments } = require('../controllers/claimController');
const { getFhirClaim } = require('../controllers/nhcxController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { uploadDocumentsField } = require('../middleware/upload');

router.use(authenticateToken); // Protect all claim endpoints

// ROUTE ORDERING RULE: Express matches in registration order, so any static
// sub-path (e.g. /my-claims, /analytics, /search) MUST be declared above the
// parameterized `/:id` routes below, or it will be shadowed by them.
// `/my-claims` below is live; put any future static path beside it.

router.post('/', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK'), createClaim);
// Scoped by ownership: non-staff only ever see claims they created.
router.get('/', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'), listClaims);
// Legacy path kept because the claimant portal calls it.
router.get('/my-claims', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'), listClaims);
// FHIR projection of a claim. Owned here because it is a /api/claims/* path.
router.get('/:id/fhir', authorizeRoles('VERIFIER', 'APPROVER', 'FINANCE', 'SYSTEM', 'CLAIMANT'), getFhirClaim);
router.post('/:id/adjudicate', authorizeRoles('SYSTEM', 'VERIFIER', 'APPROVER', 'MEDICAL_OFFICER'), adjudicateSavedClaim);
// Claimants/hospital desks may only submit a claim forward; only insurer staff
// may move a claim through review, approval or settlement.
router.post('/:id/transition', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'), transitionStatus);
router.get('/:id/audit-trail', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'), getAuditTrail);
// Line-item deduction dispute: recorded against the claim and the audit trail.
router.post('/:id/dispute-line-item', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'), disputeLineItem);
// Multipart supporting documents.
router.post('/:id/documents', authorizeRoles('CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'), uploadDocumentsField('documents', 5), uploadDocuments);

module.exports = router;
