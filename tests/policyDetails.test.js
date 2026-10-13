const test = require('node:test');
const assert = require('node:assert');
const { monthsBetween, buildPolicyDetails, buildClaimPayload } = require('../src/utils/policyDetails');

test('monthsBetween is calendar-aware, not a 30-day approximation', () => {
    const now = new Date('2026-03-01T00:00:00Z');
    // Exactly 24 calendar months.
    assert.strictEqual(monthsBetween('2024-03-01T00:00:00Z', now), 24);
    // One day short of 24 months - must not round up to 24.
    assert.strictEqual(monthsBetween('2024-03-02T00:00:00Z', now), 23);
    // A 30-day-month calculation would call this 12; calendar math says 11.
    assert.strictEqual(monthsBetween('2025-03-15T00:00:00Z', new Date('2026-03-01T00:00:00Z')), 11);
});

test('monthsBetween guards invalid and future dates', () => {
    assert.strictEqual(monthsBetween('not-a-date'), 0);
    assert.strictEqual(monthsBetween(new Date(Date.now() + 86400000 * 60)), 0);
});

test('buildPolicyDetails reads caps from the policy instead of hardcoding them', () => {
    const policy = {
        sumInsuredBalance: 100000,
        policyInceptionDate: '2020-01-01',
        waitingPeriodMonths: 12,
        iolTariffCap: 9999,
        roomCap: 1111,
        procedureSublimits: { 'Cataract_Phaco': 25000 }
    };
    const details = buildPolicyDetails(policy);
    assert.strictEqual(details.iolTariffCap, 9999);
    assert.strictEqual(details.roomCap, 1111);
    assert.strictEqual(details.waitingPeriodMonths, 12);
    assert.deepStrictEqual(details.procedureSublimits, { 'Cataract_Phaco': 25000 });
    // Well past inception, so the waiting period must be satisfied.
    assert.ok(details.elapsedMonths > 12);
});

test('buildPolicyDetails falls back to defaults for missing caps', () => {
    const details = buildPolicyDetails({ policyInceptionDate: '2020-01-01' });
    assert.strictEqual(details.iolTariffCap, 15000);
    assert.strictEqual(details.roomCap, 5000);
    assert.strictEqual(details.waitingPeriodMonths, 24);
    assert.strictEqual(details.sumInsuredBalance, 0);
});

test('buildPolicyDetails accepts a Mongoose Map for sublimits', () => {
    const details = buildPolicyDetails({
        policyInceptionDate: '2020-01-01',
        procedureSublimits: new Map([['Cataract_Phaco', 30000]])
    });
    assert.deepStrictEqual(details.procedureSublimits, { 'Cataract_Phaco': 30000 });
});

test('buildClaimPayload maps procedureDetails to eyeProcedure', () => {
    const payload = buildClaimPayload({
        billItems: [{ itemCode: 'X', category: 'IOL', billedAmount: 100 }],
        procedureDetails: { procedureType: 'Cataract_Phaco', eyeSide: 'OD', admissionDate: '2026-01-10' }
    });
    // Without this mapping the duplicate-eye fraud rules can never fire.
    assert.deepStrictEqual(payload.eyeProcedure, { procedureType: 'Cataract_Phaco', eye: 'OD' });
    assert.strictEqual(payload.billItems.length, 1);
});

test('buildClaimPayload yields null eyeProcedure when no procedure is claimed', () => {
    assert.strictEqual(buildClaimPayload({ billItems: [] }).eyeProcedure, null);
});

test('buildClaimPayload tolerates a claim with no billItems or procedureDetails', () => {
    const payload = buildClaimPayload({});
    assert.deepStrictEqual(payload.billItems, []);
    assert.strictEqual(payload.eyeProcedure, null);
});

test('buildClaimPayload passes through pre-existing, documents and history', () => {
    const payload = buildClaimPayload({ billItems: [] }, {
        isPreExisting: true,
        documents: ['IOL_STICKER'],
        history: [{ eye: 'OS', status: 'SETTLED', date: '2026-01-01' }]
    });
    assert.strictEqual(payload.isPreExisting, true);
    assert.deepStrictEqual(payload.documents, ['IOL_STICKER']);
    assert.strictEqual(payload.history.length, 1);
});
