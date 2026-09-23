const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');

const validTransitions = {
    'DRAFT': ['PRE_AUTH_SUBMITTED', 'IN_REVIEW'],
    'PRE_AUTH_SUBMITTED': ['IN_REVIEW'],
    'IN_REVIEW': ['QUERY_RAISED', 'APPROVED', 'REJECTED'],
    'QUERY_RAISED': ['QUERY_RESPONDED'],
    'QUERY_RESPONDED': ['IN_REVIEW'],
    'APPROVED': ['SETTLED']
};

async function transitionClaimState(claimId, targetState, actor, notes = '', action = 'TRANSITION') {
    const claim = await Claim.findById(claimId);
    if (!claim) {
        throw new Error('Claim not found');
    }

    const fromState = claim.status;

    if (fromState === targetState) {
        return claim; // No-op
    }

    const allowed = validTransitions[fromState] || [];
    if (!allowed.includes(targetState)) {
        throw new Error(`Invalid state transition from ${fromState} to ${targetState}`);
    }

    // Effectuate transition
    claim.status = targetState;
    await claim.save();

    // Write audit hook
    const log = new AuditLog({
        claimId: claim._id,
        fromState,
        toState: targetState,
        actorId: actor.id,
        actorRole: actor.role,
        action,
        notes
    });
    await log.save();

    return claim;
}

module.exports = { transitionClaimState };
