const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const AuditLog = require('../models/AuditLog');
const { transitionClaimState } = require('../utils/stateMachine');
const { simulateClaim } = require('../engine/simulator');

async function createClaim(req, res, next) {
    try {
        const { claimNumber, policyId, claimType, procedureDetails, billItems } = req.body;

        // Minimal validation
        if (!claimNumber || !policyId || !claimType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const claim = new Claim({
            claimNumber,
            policyId,
            claimType,
            status: 'DRAFT',
            procedureDetails,
            billItems
        });

        await claim.save();

        // Log creation explicitly since it's a DRAFT instantiation
        const log = new AuditLog({
            claimId: claim._id,
            fromState: 'NONE',
            toState: 'DRAFT',
            actorId: req.user ? req.user.id : 'SYSTEM',
            actorRole: req.user ? req.user.role : 'SYSTEM',
            action: 'CREATE_CLAIM'
        });
        await log.save();

        res.status(201).json({ status: 'success', claim });
    } catch (err) {
        next(err);
    }
}

async function adjudicateSavedClaim(req, res, next) {
    try {
        const { id } = req.params;
        const actorId = req.user ? req.user.id : 'SYSTEM';
        const actorRole = req.user ? req.user.role : 'SYSTEM';

        const claim = await Claim.findById(id).populate('policyId');
        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        if (!claim.policyId) {
            return res.status(400).json({ error: 'Policy not attached' });
        }

        const policy = claim.policyId;

        // Build draft payload
        const claimPayload = {
            isPreExisting: false,
            billItems: claim.billItems,
            date: claim.procedureDetails?.admissionDate,
            documents: [],
            history: []
        };

        const policyDetails = {
            sumInsuredBalance: policy.sumInsuredBalance,
            elapsedMonths: Math.floor((Date.now() - new Date(policy.policyInceptionDate)) / (1000 * 60 * 60 * 24 * 30)) || 12,
            waitingPeriodMonths: policy.waitingPeriodMonths,
            iolTariffCap: 15000,
            roomCap: 5000
        };

        const evalResult = simulateClaim(claimPayload, policyDetails);

        claim.adjudicationResult = {
            totalBilled: claim.billItems.reduce((acc, i) => acc + i.billedAmount, 0),
            approvedAmount: evalResult.approvedAmount,
            totalDeductions: evalResult.totalDeductions,
            itemizedDeductions: evalResult.deductionsBreakdown
        };

        claim.flags = {
            missingDocuments: evalResult.missingDocumentFlags.map(f => f.reasonCode),
            fraudWarnings: evalResult.fraudFlags.map(f => f.reasonCode)
        };

        await claim.save();

        res.status(200).json({ status: 'success', claim });
    } catch (err) {
        next(err);
    }
}

async function transitionStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { targetState, notes, action } = req.body;

        const actor = { id: req.user ? req.user.id : 'SYSTEM', role: req.user ? req.user.role : 'SYSTEM' };

        const claim = await transitionClaimState(id, targetState, actor, notes, action);
        res.status(200).json({ status: 'success', claim });
    } catch (err) {
        if (err.message.includes('Invalid state transition')) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
}

async function getAuditTrail(req, res, next) {
    try {
        const { id } = req.params;
        const logs = await AuditLog.find({ claimId: id }).sort('timestamp');
        res.status(200).json({ status: 'success', logs });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createClaim,
    adjudicateSavedClaim,
    transitionStatus,
    getAuditTrail
};
