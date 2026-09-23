const test = require('node:test');
const assert = require('node:assert');
const { adjudicateClaim } = require('../src/engine/adjudicator');
const { CLAUSES, REASON_CODES } = require('../src/engine/constants');

test('Adjudicator - Strip Non-Payables', () => {
    const claimPayload = {
        billItems: [
            { itemCode: 'GLOVES-01', category: 'GLOVES', description: 'Surgical Gloves', billedAmount: 500 },
            { itemCode: 'DOC-01', category: 'CONSULTATION', description: 'Doctor Visit', billedAmount: 1000 }
        ]
    };
    const policyDetails = { sumInsuredBalance: 50000 };

    const result = adjudicateClaim(claimPayload, policyDetails);

    assert.strictEqual(result.approvedAmount, 1000);
    assert.strictEqual(result.totalDeductions, 500);
    assert.strictEqual(result.deductionsBreakdown.length, 1);
    assert.strictEqual(result.deductionsBreakdown[0].reasonCode, REASON_CODES.NON_PAYABLE_CONSUMABLE);
    assert.strictEqual(result.deductionsBreakdown[0].policyClauseRef, CLAUSES.NON_MEDICAL);
});

test('Adjudicator - Apply Sub-Limits', () => {
    const claimPayload = {
        billItems: [
            { itemCode: 'ROOM', category: 'ROOM_RENT', description: 'Private Room', billedAmount: 8000 },
            { itemCode: 'CATARACT', category: 'PROCEDURE', description: 'Cataract', billedAmount: 40000 }
        ]
    };
    const policyDetails = {
        sumInsuredBalance: 50000,
        roomCap: 5000,
        procedureSublimits: { 'CATARACT': 35000 }
    };

    const result = adjudicateClaim(claimPayload, policyDetails);

    assert.strictEqual(result.approvedAmount, 40000); // 5000 + 35000
    assert.strictEqual(result.totalDeductions, 8000); // (8000-5000) + (40000-35000)
    assert.strictEqual(result.deductionsBreakdown.length, 2);
});

test('Adjudicator - Verify IOL Tariff Cap', () => {
    const claimPayload = {
        billItems: [
            { itemCode: 'IOL-LE', category: 'IOL', description: 'Lens', billedAmount: 20000 }
        ]
    };
    const policyDetails = { sumInsuredBalance: 50000, iolTariffCap: 15000 };

    const result = adjudicateClaim(claimPayload, policyDetails);

    assert.strictEqual(result.approvedAmount, 15000);
    assert.strictEqual(result.totalDeductions, 5000);
    assert.strictEqual(result.deductionsBreakdown[0].reasonCode, REASON_CODES.TARIFF_CAP_EXCEEDED);
});

test('Adjudicator - Validate Waiting Periods', () => {
    const claimPayload = {
        isPreExisting: true,
        billItems: [
            { itemCode: 'SURGERY', category: 'PROCEDURE', description: 'Eye Surgery', billedAmount: 20000 }
        ]
    };
    const policyDetails = { sumInsuredBalance: 50000, elapsedMonths: 12, waitingPeriodMonths: 24 };

    const result = adjudicateClaim(claimPayload, policyDetails);

    assert.strictEqual(result.approvedAmount, 0);
    assert.strictEqual(result.totalDeductions, 20000);
    assert.strictEqual(result.deductionsBreakdown[0].reasonCode, REASON_CODES.WAITING_PERIOD_ACTIVE);
});

test('Adjudicator - Deduct Sum Insured Balance', () => {
    const claimPayload = {
        billItems: [
            { itemCode: 'SURGERY', category: 'PROCEDURE', description: 'Major Surgery', billedAmount: 60000 }
        ]
    };
    const policyDetails = { sumInsuredBalance: 50000 };

    const result = adjudicateClaim(claimPayload, policyDetails);

    assert.strictEqual(result.approvedAmount, 50000);
    assert.strictEqual(result.totalDeductions, 10000);
    assert.strictEqual(result.deductionsBreakdown[0].reasonCode, REASON_CODES.SI_EXCEEDED);
});
