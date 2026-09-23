function toFhirClaim(claimRecord, policyRecord) {
    return {
        resourceType: "Claim",
        status: claimRecord.status === 'SETTLED' ? "active" : "draft",
        type: {
            coding: [{ code: claimRecord.claimType }]
        },
        patient: {
            reference: `Patient/${policyRecord.memberId}`,
            display: policyRecord.memberName
        },
        provider: {
            reference: "Organization/HOSPITAL123"
        },
        priority: { coding: [{ code: "normal" }] },
        insurance: [
            {
                sequence: 1,
                focal: true,
                coverage: {
                    reference: `Coverage/${policyRecord.policyNumber}`
                }
            }
        ],
        item: claimRecord.billItems.map((item, index) => ({
            sequence: index + 1,
            productOrService: {
                coding: [{ code: item.itemCode, display: item.description }]
            },
            category: { coding: [{ code: item.category }] },
            net: { value: item.billedAmount, currency: "INR" }
        }))
    };
}

function toFhirClaimResponse(claimRecord) {
    const result = claimRecord.adjudicationResult;
    return {
        resourceType: "ClaimResponse",
        status: "active",
        outcome: claimRecord.status === 'APPROVED' ? "complete" : "queued",
        request: { reference: `Claim/${claimRecord.claimNumber}` },
        total: [
            {
                category: { coding: [{ code: "submitted" }] },
                amount: { value: result.totalBilled, currency: "INR" }
            },
            {
                category: { coding: [{ code: "benefit" }] },
                amount: { value: result.approvedAmount, currency: "INR" }
            }
        ],
        item: result.itemizedDeductions.map((deduction, index) => ({
            itemSequence: index + 1,
            adjudication: [
                {
                    category: { coding: [{ code: deduction.reasonCode }] },
                    reason: { coding: [{ code: deduction.policyClauseRef }] },
                    amount: { value: deduction.deductedAmount, currency: "INR" }
                }
            ]
        }))
    };
}

module.exports = { toFhirClaim, toFhirClaimResponse };
