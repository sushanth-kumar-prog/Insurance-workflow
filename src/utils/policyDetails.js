/**
 * Translates stored Mongoose documents into the plain shapes the adjudication
 * engine expects. Keeping this out of the controller means the same mapping is
 * used by the API and by tests.
 */

/**
 * Months elapsed since policy inception.
 * Uses calendar-aware arithmetic (not a fixed 30-day month) so a policy
 * incepted 1 Feb is not treated as 24 months old on 1 Mar of the next year.
 */
function monthsBetween(from, to = new Date()) {
    const start = new Date(from);
    if (Number.isNaN(start.getTime())) {
        return 0;
    }
    let months = (to.getFullYear() - start.getFullYear()) * 12 + (to.getMonth() - start.getMonth());
    if (to.getDate() < start.getDate()) {
        months -= 1;
    }
    return Math.max(months, 0);
}

/**
 * Builds the policyDetails object consumed by adjudicateClaim/fraudDetector.
 */
function buildPolicyDetails(policy) {
    return {
        sumInsuredBalance: policy.sumInsuredBalance ?? 0,
        elapsedMonths: monthsBetween(policy.policyInceptionDate),
        waitingPeriodMonths: policy.waitingPeriodMonths ?? 24,
        iolTariffCap: policy.iolTariffCap ?? 15000,
        roomCap: policy.roomCap ?? 5000,
        procedureSublimits: policy.procedureSublimits instanceof Map
            ? Object.fromEntries(policy.procedureSublimits)
            : (policy.procedureSublimits || {})
    };
}

/**
 * Builds the claimDraft consumed by adjudicateClaim/fraudDetector.
 * `history` is the caller's settled-claim history for the same member; the API
 * supplies it so the duplicate-eye and rapid-second-eye rules can actually fire.
 */
function buildClaimPayload(claim, { isPreExisting = false, documents = [], history = [] } = {}) {
    const procedureDetails = claim.procedureDetails || {};

    return {
        isPreExisting,
        billItems: claim.billItems || [],
        date: procedureDetails.admissionDate,
        documents,
        history,
        // The fraud rules key off `eyeProcedure`; without this mapping two of
        // the four rules could never trigger.
        eyeProcedure: procedureDetails.procedureType
            ? {
                procedureType: procedureDetails.procedureType,
                eye: procedureDetails.eyeSide
            }
            : null
    };
}

/**
 * Computes the live SLA state for a claim from its audit history, so the API can
 * hand the frontend a countdown it does not have to derive itself.
 */
function slaForClaim(auditLogs, type = 'PRE_AUTH', currentTime = new Date()) {
    const { calculateSLA } = require('./slaEngine');
    const sla = calculateSLA(auditLogs, type, currentTime);
    return {
        type,
        // Frontends count down from this value.
        remainingMinutes: sla.timeRemainingMinutes,
        elapsedMinutes: sla.elapsedMinutes,
        isBreached: sla.isBreached,
        isPaused: auditLogs.some(l => l.toState === 'QUERY_RAISED') &&
            !auditLogs.some(l => l.toState === 'QUERY_RESPONDED'),
        status: sla.currentSlaStatus
    };
}

module.exports = { monthsBetween, buildPolicyDetails, buildClaimPayload, slaForClaim };
