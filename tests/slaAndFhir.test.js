const test = require('node:test');
const assert = require('node:assert');
const { calculateSLA } = require('../src/utils/slaEngine');
const { toFhirClaim } = require('../src/utils/fhirMapper');

test('SLA Engine - Pre Auth On Time', () => {
    const baseTime = new Date('2026-09-22T10:00:00Z').getTime();
    const logs = [
        { toState: 'PRE_AUTH_SUBMITTED', timestamp: new Date(baseTime) },
        { toState: 'IN_REVIEW', timestamp: new Date(baseTime + (10 * 60000)) },
        { toState: 'APPROVED', timestamp: new Date(baseTime + (40 * 60000)) }
    ];

    // total elapsed: 40 minutes (limit 60)
    const result = calculateSLA(logs, 'PRE_AUTH', new Date(baseTime + (40 * 60000)));
    assert.strictEqual(result.isBreached, false);
    assert.strictEqual(result.elapsedMinutes, 40);
    assert.strictEqual(result.currentSlaStatus, 'ON_TIME');
});

test('SLA Engine - Pause via Query Raised', () => {
    const baseTime = new Date('2026-09-22T10:00:00Z').getTime();
    const logs = [
        { toState: 'PRE_AUTH_SUBMITTED', timestamp: new Date(baseTime) },
        { toState: 'IN_REVIEW', timestamp: new Date(baseTime + (10 * 60000)) },
        { toState: 'QUERY_RAISED', timestamp: new Date(baseTime + (30 * 60000)) }, // pausel
        { toState: 'QUERY_RESPONDED', timestamp: new Date(baseTime + (120 * 60000)) }, // unpause
        { toState: 'APPROVED', timestamp: new Date(baseTime + (140 * 60000)) } // end 
    ];

    // 30m + 20m = 50m
    const result = calculateSLA(logs, 'PRE_AUTH', new Date(baseTime + (140 * 60000)));

    assert.strictEqual(result.elapsedMinutes, 50);
    assert.strictEqual(result.isBreached, false);
});

test('SLA Engine - Breached Status', () => {
    const baseTime = new Date('2026-09-22T10:00:00Z').getTime();
    const logs = [
        { toState: 'PRE_AUTH_SUBMITTED', timestamp: new Date(baseTime) }
    ];
    // Current time is 120 minutes later (Limit is 60)
    const result = calculateSLA(logs, 'PRE_AUTH', new Date(baseTime + (120 * 60000)));

    assert.strictEqual(result.elapsedMinutes, 120);
    assert.strictEqual(result.isBreached, true);
    assert.strictEqual(result.currentSlaStatus, 'BREACHED');
});

test('FHIR Mapper - toFhirClaim', () => {
    const claim = {
        claimNumber: 'CLM-001',
        status: 'DRAFT',
        claimType: 'CASHLESS',
        billItems: [
            { itemCode: 'IOL-X', description: 'Lens', category: 'IOL', billedAmount: 15000 }
        ]
    };
    const policy = {
        memberId: 'MEM-111',
        memberName: 'Jane Doe',
        policyNumber: 'POL-01'
    };

    const payload = toFhirClaim(claim, policy);

    assert.strictEqual(payload.resourceType, 'Claim');
    assert.strictEqual(payload.status, 'draft');
    assert.strictEqual(payload.type.coding[0].code, 'CASHLESS');
    assert.strictEqual(payload.patient.reference, 'Patient/MEM-111');
    assert.strictEqual(payload.item.length, 1);
    assert.strictEqual(payload.item[0].category.coding[0].code, 'IOL');
    assert.strictEqual(payload.item[0].net.value, 15000);
});
