/**
 * Calculates SLA elapsed time accounting for query pauses.
 * @param {Array} auditLogs - Array of audit log objects sorted chronologically
 * @param {String} type - "PRE_AUTH" or "DISCHARGE_SETTLEMENT"
 * @param {Date} currentTime - Optional, for mocking/testing
 * @returns {Object} { elapsedMinutes, timeRemainingMinutes, isBreached, currentSlaStatus }
 */
function calculateSLA(auditLogs, type, currentTime = new Date()) {
    const limitMinutes = type === 'PRE_AUTH' ? 60 : 180;
    let elapsedMs = 0;

    let currentStartTime = null;
    let isPaused = false;

    for (const log of auditLogs) {
        if (log.toState === 'PRE_AUTH_SUBMITTED' || (type === 'DISCHARGE_SETTLEMENT' && log.toState === 'APPROVED')) {
            if (!currentStartTime) currentStartTime = new Date(log.timestamp);
        }

        if (log.toState === 'QUERY_RAISED' && !isPaused && currentStartTime) {
            elapsedMs += (new Date(log.timestamp) - currentStartTime);
            isPaused = true;
        }

        if (log.toState === 'QUERY_RESPONDED' && isPaused) {
            isPaused = false;
            currentStartTime = new Date(log.timestamp);
        }

        if (['SETTLED', 'APPROVED', 'REJECTED'].includes(log.toState) && currentStartTime && !isPaused) {
            elapsedMs += (new Date(log.timestamp) - currentStartTime);
            currentStartTime = null;
            break;
        }
    }

    if (currentStartTime && !isPaused) {
        elapsedMs += (currentTime - currentStartTime);
    }

    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const timeRemainingMinutes = limitMinutes - elapsedMinutes;
    const isBreached = elapsedMinutes > limitMinutes;

    let currentSlaStatus = 'ON_TIME';
    if (isBreached) currentSlaStatus = 'BREACHED';
    else if (timeRemainingMinutes <= (limitMinutes * 0.2)) currentSlaStatus = 'WARNING';

    return { elapsedMinutes, timeRemainingMinutes, isBreached, currentSlaStatus };
}
module.exports = { calculateSLA };
