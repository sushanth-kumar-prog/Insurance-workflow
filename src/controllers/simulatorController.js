const { simulateClaim } = require('../engine/simulator');

function evaluateSimulation(req, res, next) {
    try {
        const { claimDraft, policyDetails } = req.body;
        const result = simulateClaim(claimDraft, policyDetails);

        const totalBilled = claimDraft.billItems.reduce((acc, item) => acc + item.billedAmount, 0);

        return res.status(200).json({
            status: 'success',
            dryRun: true,
            summary: {
                totalBilled,
                estimatedApprovalAmount: result.approvedAmount,
                totalDeductions: result.totalDeductions
            },
            itemizedDeductions: result.deductionsBreakdown,
            missingDocumentFlags: result.missingDocumentFlags.map(f => f.reasonCode),
            fraudWarningFlags: result.fraudFlags.map(f => f.reasonCode),
            evaluatedAt: new Date().toISOString()
        });
    } catch (err) {
        next(err);
    }
}

module.exports = { evaluateSimulation };
