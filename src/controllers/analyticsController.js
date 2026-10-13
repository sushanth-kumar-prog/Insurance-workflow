const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { calculateSLA } = require('../utils/slaEngine');

const MAX_CLAIMS = 1000;

async function getSlaSummary(req, res, next) {
    try {
        // Bound the working set; an unbounded Claim.find() would grow without limit
        // and make every downstream query more expensive.
        const claims = await Claim.find()
            .select('status adjudicationResult.approvedAmount')
            .limit(MAX_CLAIMS)
            .lean();

        let totalOutflow = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        let totalBreaches = 0;

        if (claims.length > 0) {
            // Fetch every audit log in ONE query instead of one query per claim,
            // then group in memory. Previously this was an N+1.
            const logs = await AuditLog.find({
                claimId: { $in: claims.map(c => c._id) }
            })
                .sort({ timestamp: 1 })
                .select('claimId toState timestamp')
                .lean();

            const logsByClaim = new Map();
            for (const log of logs) {
                const key = String(log.claimId);
                if (!logsByClaim.has(key)) {
                    logsByClaim.set(key, []);
                }
                logsByClaim.get(key).push(log);
            }

            for (const claim of claims) {
                if (claim.status === 'APPROVED' || claim.status === 'SETTLED') {
                    approvedCount++;
                    if (claim.adjudicationResult && claim.adjudicationResult.approvedAmount) {
                        totalOutflow += claim.adjudicationResult.approvedAmount;
                    }
                } else if (claim.status === 'REJECTED') {
                    rejectedCount++;
                }

                const claimLogs = logsByClaim.get(String(claim._id)) || [];
                const sla = calculateSLA(claimLogs, 'PRE_AUTH');
                if (sla.isBreached) {
                    totalBreaches++;
                }
            }
        }

        const totalProcessed = approvedCount + rejectedCount;

        res.status(200).json({
            status: 'success',
            data: {
                totalOutflow,
                approvedCount,
                rejectedCount,
                totalBreaches,
                breachPercentage: claims.length ? ((totalBreaches / claims.length) * 100).toFixed(2) : 0,
                approvalRatio: totalProcessed ? ((approvedCount / totalProcessed) * 100).toFixed(2) : 0
            }
        });

    } catch (err) {
        next(err);
    }
}

module.exports = { getSlaSummary, MAX_CLAIMS };
