const { REASON_CODES } = require('./constants');

function detectFraudAndAnomalies(claimDraft, policyDetails) {
    const flags = [];

    // Flag 1: Claim submitted within waiting period
    if (claimDraft.isPreExisting && policyDetails.elapsedMonths < policyDetails.waitingPeriodMonths) {
        flags.push({
            reasonCode: REASON_CODES.FRAUD_WAITING_PERIOD,
            message: 'Warning: Claim submitted within the pre-existing condition waiting period.'
        });
    }

    // Flag 2: Same eye procedure already settled
    if (claimDraft.eyeProcedure && claimDraft.history) {
        const sameEyeSettled = claimDraft.history.some(h => h.eye === claimDraft.eyeProcedure.eye && h.status === 'SETTLED');
        if (sameEyeSettled) {
            flags.push({
                reasonCode: REASON_CODES.FRAUD_DUPLICATE_EYE,
                message: `Warning: A settled claim for the same eye (${claimDraft.eyeProcedure.eye}) already exists.`
            });
        }
    }

    // Flag 3: IOL billed above contracted tariff cap
    const iolItem = claimDraft.billItems.find(item => item.category === 'IOL');
    if (iolItem && policyDetails.iolTariffCap && iolItem.billedAmount > policyDetails.iolTariffCap) {
        flags.push({
            reasonCode: REASON_CODES.FRAUD_TARIFF_BREACH,
            message: `Warning: IOL billed amount (${iolItem.billedAmount}) exceeds tariff cap (${policyDetails.iolTariffCap}).`
        });
    }

    // Flag 4: Second eye procedure submitted within 14 days of first eye surgery
    if (claimDraft.eyeProcedure && claimDraft.history) {
        const firstEyeSurgeryDate = claimDraft.history.find(h => h.eye !== claimDraft.eyeProcedure.eye && h.status === 'SETTLED')?.date;
        if (firstEyeSurgeryDate) {
            const diffTime = Math.abs(new Date(claimDraft.date) - new Date(firstEyeSurgeryDate));
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 14) {
                flags.push({
                    reasonCode: REASON_CODES.FRAUD_RAPID_SECOND_EYE,
                    message: 'Warning: Second eye procedure submitted within 14 days of the first eye surgery.'
                });
            }
        }
    }

    return flags;
}

function detectMissingDocuments(claimDraft) {
    const warnings = [];

    const iolItem = claimDraft.billItems.find(item => item.category === 'IOL');
    if (iolItem && (!claimDraft.documents || !claimDraft.documents.includes('IOL_STICKER'))) {
        warnings.push({
            reasonCode: REASON_CODES.MISSING_DOCUMENT,
            message: 'Warning: IOL item billed but IOL_STICKER document is missing.'
        });
    }

    if (claimDraft.eyeProcedure && (!claimDraft.documents || !claimDraft.documents.includes('BIOMETRY_REPORT'))) {
        warnings.push({
            reasonCode: REASON_CODES.MISSING_DOCUMENT,
            message: 'Warning: Eye procedure claimed but BIOMETRY_REPORT is missing.'
        });
    }

    return warnings;
}

module.exports = {
    detectFraudAndAnomalies,
    detectMissingDocuments
};
