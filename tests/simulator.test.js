const test = require('node:test');
const assert = require('node:assert');
const { simulateClaim } = require('../src/engine/simulator');
const { REASON_CODES } = require('../src/engine/constants');

test('Simulator - Generates Flags and Adjudicates', () => {
    const claimDraft = {
        date: '2023-10-15',
        eyeProcedure: { eye: 'LEFT' },
        isPreExisting: true,
        documents: [],
        history: [
            { eye: 'RIGHT', status: 'SETTLED', date: '2023-10-05' }
        ],
        billItems: [
            { itemCode: 'IOL-01', category: 'IOL', description: 'Lens', billedAmount: 20000 }
        ]
    };

    const policyDetails = {
        sumInsuredBalance: 50000,
        iolTariffCap: 15000,
        elapsedMonths: 12,
        waitingPeriodMonths: 24
    };

    const result = simulateClaim(claimDraft, policyDetails);

    // Assert Adjudication result included
    assert.strictEqual(result.totalDeductions, 5000);
    assert.strictEqual(result.approvedAmount, 15000);

    // Assert fraud flags
    const fraudReasonCodes = result.fraudFlags.map(f => f.reasonCode);
    assert.ok(fraudReasonCodes.includes(REASON_CODES.FRAUD_WAITING_PERIOD));
    assert.ok(fraudReasonCodes.includes(REASON_CODES.FRAUD_TARIFF_BREACH));
    assert.ok(fraudReasonCodes.includes(REASON_CODES.FRAUD_RAPID_SECOND_EYE));

    // Assert missing documents
    const warningReasonCodes = result.missingDocumentFlags.map(f => f.reasonCode);
    assert.ok(warningReasonCodes.includes(REASON_CODES.MISSING_DOCUMENT));
    assert.strictEqual(result.missingDocumentFlags.length, 2); // IOL sticker + biometry report
});

test('Simulator - Duplicate eye surgery', () => {
    const claimDraft = {
        date: '2023-10-15',
        eyeProcedure: { eye: 'LEFT' },
        history: [
            { eye: 'LEFT', status: 'SETTLED', date: '2022-10-05' }
        ],
        billItems: []
    };

    const policyDetails = {
        sumInsuredBalance: 50000
    };

    const result = simulateClaim(claimDraft, policyDetails);

    const fraudReasonCodes = result.fraudFlags.map(f => f.reasonCode);
    assert.ok(fraudReasonCodes.includes(REASON_CODES.FRAUD_DUPLICATE_EYE));
});
