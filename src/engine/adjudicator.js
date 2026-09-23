const { CLAUSES, REASON_CODES, NON_PAYABLE_ITEMS } = require('./constants');

/**
 * Executes rule-based adjudication sequentially
 * @param {Object} claimPayload 
 * @param {Object} policyDetails
 * @returns {Object} 
 */
function adjudicateClaim(claimPayload, policyDetails) {
    let { sumInsuredBalance } = policyDetails;

    let approvedAmount = 0;
    let totalDeductions = 0;
    const deductionsBreakdown = [];

    for (const item of claimPayload.billItems) {
        let { itemCode, category, description, billedAmount } = item;
        let payable = billedAmount;
        let itemDeductions = 0;

        // 1. Strip Non-Payables
        if (NON_PAYABLE_ITEMS.includes(category) || NON_PAYABLE_ITEMS.includes(itemCode)) {
            itemDeductions += billedAmount;
            deductionsBreakdown.push({
                itemCode,
                description,
                billedAmount,
                deductedAmount: billedAmount,
                reasonCode: REASON_CODES.NON_PAYABLE_CONSUMABLE,
                policyClauseRef: CLAUSES.NON_MEDICAL
            });
            payable = 0;
        }

        if (payable > 0) {
            // 2. Apply Sub-Limits
            if (category === 'ROOM_RENT' && policyDetails.roomCap && payable > policyDetails.roomCap) {
                const deduction = payable - policyDetails.roomCap;
                itemDeductions += deduction;
                deductionsBreakdown.push({
                    itemCode,
                    description,
                    billedAmount,
                    deductedAmount: deduction,
                    reasonCode: REASON_CODES.SUB_LIMIT_EXCEEDED,
                    policyClauseRef: CLAUSES.ROOM_RENT
                });
                payable = policyDetails.roomCap;
            }

            if (category === 'PROCEDURE' && policyDetails.procedureSublimits && policyDetails.procedureSublimits[itemCode]) {
                const cap = policyDetails.procedureSublimits[itemCode];
                if (payable > cap) {
                    const deduction = payable - cap;
                    itemDeductions += deduction;
                    deductionsBreakdown.push({
                        itemCode,
                        description,
                        billedAmount,
                        deductedAmount: deduction,
                        reasonCode: REASON_CODES.SUB_LIMIT_EXCEEDED,
                        policyClauseRef: CLAUSES.PROCEDURE_SUBLIMIT
                    });
                    payable = cap;
                }
            }

            if (category === 'IOL' && policyDetails.iolTariffCap && payable > policyDetails.iolTariffCap) {
                const deduction = payable - policyDetails.iolTariffCap;
                itemDeductions += deduction;
                deductionsBreakdown.push({
                    itemCode,
                    description,
                    billedAmount,
                    deductedAmount: deduction,
                    reasonCode: REASON_CODES.TARIFF_CAP_EXCEEDED,
                    policyClauseRef: CLAUSES.IOL_TARIFF_CAP
                });
                payable = policyDetails.iolTariffCap;
            }

            // 3. Validate Waiting Periods
            if (category === 'PROCEDURE' && claimPayload.isPreExisting) {
                if (policyDetails.elapsedMonths < policyDetails.waitingPeriodMonths) {
                    itemDeductions += payable;
                    deductionsBreakdown.push({
                        itemCode,
                        description,
                        billedAmount,
                        deductedAmount: payable,
                        reasonCode: REASON_CODES.WAITING_PERIOD_ACTIVE,
                        policyClauseRef: CLAUSES.WAITING_PERIOD
                    });
                    payable = 0;
                }
            }

            if (payable > 0) {
                // 4. Deduct Sum Insured Balance
                if (payable > sumInsuredBalance) {
                    const deduction = payable - sumInsuredBalance;
                    itemDeductions += deduction;
                    deductionsBreakdown.push({
                        itemCode,
                        description,
                        billedAmount,
                        deductedAmount: deduction,
                        reasonCode: REASON_CODES.SI_EXCEEDED,
                        policyClauseRef: CLAUSES.SUM_INSURED_EXHAUSTED
                    });
                    payable = sumInsuredBalance;
                }
            }
        }

        approvedAmount += payable;
        sumInsuredBalance -= payable;
        totalDeductions += itemDeductions;
    }

    return {
        approvedAmount,
        totalDeductions,
        deductionsBreakdown
    };
}

module.exports = {
    adjudicateClaim
};
