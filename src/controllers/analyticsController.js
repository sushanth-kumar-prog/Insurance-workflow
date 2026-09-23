const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { calculateSLA } = require('../utils/slaEngine');

async function getSlaSummary(req, res, next) {
    try {
        const claims = await Claim.find();
        let totalOutflow = 0;
        let approvedCount = 0;
        let rejectedCount = 0;
        let totalBreaches = 0;

        for (const claim of claims) {
            if (claim.status === 'APPROVED' || claim.status === 'SETTLED') {
                approvedCount++;
                if (claim.adjudicationResult && claim.adjudicationResult.approvedAmount) {
                    totalOutflow += claim.adjudicationResult.approvedAmount;
                }
            } else if (claim.status === 'REJECTED') {
                rejectedCount++;
            }

            const logs = await AuditLog.find({ claimId: claim._id }).sort('timestamp');
            const sla = calculateSLA(logs, 'PRE_AUTH');
            if (sla.isBreached) {
                totalBreaches++;
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

module.exports = { getSlaSummary };
