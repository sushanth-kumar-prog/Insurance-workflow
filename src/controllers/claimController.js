const Claim = require('../models/Claim');
const Policy = require('../models/Policy');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { transitionClaimState } = require('../utils/stateMachine');
const { simulateClaim } = require('../engine/simulator');
const { buildPolicyDetails, buildClaimPayload, slaForClaim } = require('../utils/policyDetails');
const { isStaff } = require('../middleware/auth');

// Which roles may drive a claim into each state. Without this, a claimant
// could walk their own claim straight to APPROVED.
const TRANSITION_ROLES = {
    DRAFT: ['CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'SYSTEM'],
    PRE_AUTH_SUBMITTED: ['CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER'],
    IN_REVIEW: ['VERIFIER', 'MEDICAL_OFFICER', 'SYSTEM'],
    QUERY_RAISED: ['VERIFIER', 'MEDICAL_OFFICER'],
    QUERY_RESPONDED: ['CLAIMANT', 'HOSPITAL_DESK'],
    APPROVED: ['APPROVER'],
    REJECTED: ['VERIFIER', 'APPROVER'],
    SETTLED: ['FINANCE']
};

// Staff act on behalf of the insurer; claimants and hospital desks are limited
// to claims they created themselves.
async function loadClaimForActor(id, user) {
    const claim = await Claim.findById(id);
    if (!claim) {
        return { error: { status: 404, body: { error: 'Claim not found' } } };
    }
    if (!isStaff(user.role) && String(claim.createdBy) !== String(user.id)) {
        return { error: { status: 403, body: { error: 'Permission denied for this claim' } } };
    }
    return { claim };
}

async function createClaim(req, res, next) {
    try {
        const { claimNumber, policyId, claimType, procedureDetails, billItems } = req.body;

        // Minimal validation
        if (!claimNumber || !policyId || !claimType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Reject dangling policy references up front. Previously a claim could be
        // created against any ObjectId and only fail much later at adjudication.
        const policy = await Policy.findById(policyId);
        if (!policy) {
            return res.status(400).json({ error: 'Policy not found' });
        }
        if (policy.status && policy.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Policy is ${policy.status.toLowerCase()}` });
        }

        // A claimant may only claim against the policy held on their account.
        if (req.user && req.user.role === 'CLAIMANT') {
            const user = await User.findById(req.user.id).select('policyId');
            if (!user || String(user.policyId) !== String(policy._id)) {
                return res.status(403).json({ error: 'Policy not held by this account' });
            }
        }

        const claim = new Claim({
            claimNumber,
            policyId,
            claimType,
            status: 'DRAFT',
            procedureDetails,
            billItems: billItems || [],
            createdBy: req.user ? req.user.id : undefined
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

        // Policy must be active, otherwise there is nothing to adjudicate against.
        if (policy.status && policy.status !== 'ACTIVE') {
            return res.status(400).json({ error: `Policy is ${policy.status.toLowerCase()}` });
        }

        const billItems = claim.billItems || [];

        // Settled claims for the same member feed the duplicate-eye and
        // rapid-second-eye fraud rules. Without this history those rules are dead.
        const settledHistory = await Claim.find({
            policyId: policy._id,
            status: 'SETTLED',
            _id: { $ne: claim._id }
        })
            .select('procedureDetails status')
            .lean();

        const claimPayload = buildClaimPayload(claim, {
            isPreExisting: Boolean(req.body && req.body.isPreExisting),
            documents: (req.body && req.body.documents) || [],
            history: settledHistory.map(h => ({
                eye: h.procedureDetails && h.procedureDetails.eyeSide,
                status: h.status,
                date: h.procedureDetails && h.procedureDetails.admissionDate
            }))
        });

        const policyDetails = buildPolicyDetails(policy);

        const evalResult = simulateClaim(claimPayload, policyDetails);

        claim.adjudicationResult = {
            totalBilled: billItems.reduce((acc, i) => acc + (i.billedAmount || 0), 0),
            approvedAmount: evalResult.approvedAmount,
            totalDeductions: evalResult.totalDeductions,
            itemizedDeductions: evalResult.deductionsBreakdown
        };

        claim.flags = {
            missingDocuments: evalResult.missingDocumentFlags.map(f => f.reasonCode),
            fraudWarnings: evalResult.fraudFlags.map(f => f.reasonCode)
        };

        await claim.save();

        // Adjudication changes the payable amount, so it belongs in the audit trail.
        await new AuditLog({
            claimId: claim._id,
            fromState: claim.status,
            toState: claim.status,
            actorId,
            actorRole,
            action: 'ADJUDICATE'
        }).save();

        res.status(200).json({ status: 'success', claim });
    } catch (err) {
        next(err);
    }
}

async function transitionStatus(req, res, next) {
    try {
        const { id } = req.params;
        const { targetState, notes, action } = req.body;

        if (!targetState) {
            return res.status(400).json({ error: 'targetState is required' });
        }

        const actor = { id: req.user ? req.user.id : 'SYSTEM', role: req.user ? req.user.role : 'SYSTEM' };

        const allowedRoles = TRANSITION_ROLES[targetState];
        if (!allowedRoles) {
            return res.status(400).json({ error: `Unknown target state '${targetState}'` });
        }
        if (!allowedRoles.includes(actor.role)) {
            return res.status(403).json({ error: `Role ${actor.role} cannot transition a claim to ${targetState}` });
        }

        const { error } = await loadClaimForActor(id, actor);
        if (error) {
            return res.status(error.status).json(error.body);
        }

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
        const { error } = await loadClaimForActor(id, req.user);
        if (error) {
            return res.status(error.status).json(error.body);
        }
        const logs = await AuditLog.find({ claimId: id }).sort('timestamp');
        // Ship the computed SLA so the client can count down without polling.
        res.status(200).json({
            status: 'success',
            logs,
            sla: slaForClaim(logs, 'PRE_AUTH'),
            dischargeSla: slaForClaim(logs, 'DISCHARGE_SETTLEMENT')
        });
    } catch (err) {
        next(err);
    }
}

async function disputeLineItem(req, res, next) {
    try {
        const { id } = req.params;
        const { reasonCode, policyClauseRef, itemCode, disputeReason, supportingNote } = req.body;

        if (!disputeReason || !String(disputeReason).trim()) {
            return res.status(400).json({ error: 'disputeReason is required' });
        }

        const actor = { id: req.user ? req.user.id : 'SYSTEM', role: req.user ? req.user.role : 'SYSTEM' };

        const { claim, error } = await loadClaimForActor(id, actor);
        if (error) {
            return res.status(error.status).json(error.body);
        }

        // A dispute must reference a real deduction on this claim, otherwise the
        // audit log records an appeal against a charge that was never applied.
        const deductions = (claim.adjudicationResult && claim.adjudicationResult.itemizedDeductions) || [];
        const matching = reasonCode
            ? deductions.find(d => d.reasonCode === reasonCode && (!itemCode || d.itemCode === itemCode))
            : null;

        if (deductions.length > 0 && !matching) {
            return res.status(400).json({ error: 'No matching deduction on this claim' });
        }

        claim.disputes.push({
            reasonCode: reasonCode || 'UNSPECIFIED',
            policyClauseRef: policyClauseRef || null,
            itemCode: itemCode || null,
            disputeReason: String(disputeReason).trim(),
            supportingNote: supportingNote || null,
            filedBy: actor.id !== 'SYSTEM' ? actor.id : undefined,
            filedByRole: actor.role,
            status: 'OPEN'
        });
        await claim.save();

        // Record it in the append-only trail without changing claim status.
        await new AuditLog({
            claimId: claim._id,
            fromState: claim.status,
            toState: claim.status,
            actorId: actor.id,
            actorRole: actor.role,
            action: 'DISPUTE_FILED',
            notes: `Dispute on ${matching ? matching.reasonCode : 'claim'}`
        }).save();

        res.status(201).json({ status: 'success', dispute: claim.disputes[claim.disputes.length - 1] });
    } catch (err) {
        next(err);
    }
}

async function uploadDocuments(req, res, next) {
    try {
        const { id } = req.params;
        const actor = { id: req.user ? req.user.id : 'SYSTEM', role: req.user ? req.user.role : 'SYSTEM' };

        const { claim, error } = await loadClaimForActor(id, actor);
        if (error) {
            return res.status(error.status).json(error.body);
        }

        const files = req.files || [];
        if (files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        for (const file of files) {
            claim.documents.push({
                filename: file.filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                uploadedBy: actor.id !== 'SYSTEM' ? actor.id : undefined
            });
        }
        await claim.save();

        await new AuditLog({
            claimId: claim._id,
            fromState: claim.status,
            toState: claim.status,
            actorId: actor.id,
            actorRole: actor.role,
            action: 'DOCUMENTS_UPLOADED',
            notes: `${files.length} document(s) uploaded`
        }).save();

        res.status(201).json({ status: 'success', documents: claim.documents });
    } catch (err) {
        // Surface multer's own limit/filter errors as 400 rather than 500.
        if (err && (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FILE_COUNT' || err.message)) {
            return res.status(400).json({ error: err.message });
        }
        next(err);
    }
}

async function listClaims(req, res, next) {
    try {
        const filter = {};
        // Staff see the whole book; everyone else sees only their own claims.
        if (!isStaff(req.user.role)) {
            filter.createdBy = req.user.id;
        }
        if (req.query.status) {
            filter.status = req.query.status;
        }

        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const claims = await Claim.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('policyId', 'policyNumber memberName sumInsuredBalance iolTariffCap roomCap waitingPeriodMonths');

        res.status(200).json({ status: 'success', count: claims.length, claims });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createClaim,
    listClaims,
    adjudicateSavedClaim,
    transitionStatus,
    getAuditTrail,
    disputeLineItem,
    uploadDocuments
};
