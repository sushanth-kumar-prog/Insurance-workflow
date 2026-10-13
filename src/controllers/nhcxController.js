const Claim = require('../models/Claim');
const { toFhirClaim } = require('../utils/fhirMapper');
const { isStaff } = require('../middleware/auth');

async function getFhirClaim(req, res, next) {
    try {
        const { id } = req.params;
        const claim = await Claim.findById(id).populate('policyId');
        if (!claim) return res.status(404).json({ error: 'Claim not found' });

        // Same ownership rule as the other claim endpoints: staff see any claim,
        // everyone else only their own.
        if (!isStaff(req.user.role) && String(claim.createdBy) !== String(req.user.id)) {
            return res.status(403).json({ error: 'Permission denied for this claim' });
        }

        if (!claim.policyId) return res.status(400).json({ error: 'Policy not attached' });

        const fhirPayload = toFhirClaim(claim, claim.policyId);
        res.status(200).json(fhirPayload);
    } catch (err) {
        next(err);
    }
}

async function submitNhcx(req, res, next) {
    try {
        const payload = req.body;
        if (payload.resourceType !== 'Claim') {
            return res.status(400).json({ error: 'Invalid resourceType. Only Claim is supported.' });
        }

        res.status(202).json({
            status: 'success',
            message: 'Claim accepted by NHCX Mock Router',
            nhcxTransactionId: `NHCX-${Date.now()}`,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { getFhirClaim, submitNhcx };
