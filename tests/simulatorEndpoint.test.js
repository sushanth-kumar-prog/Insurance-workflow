const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const { REASON_CODES } = require('../src/engine/constants');

test('POST /api/simulator/evaluate - Success 200 OK', async () => {
    const payload = {
        policyDetails: {
            sumInsuredBalance: 50000,
            waitingPeriodMonths: 24,
            elapsedMonths: 36
        },
        claimDraft: {
            billItems: [
                { itemCode: 'SURGERY', description: 'Cataract Surgery', billedAmount: 40000 }
            ]
        }
    };

    const res = await request(app)
        .post('/api/simulator/evaluate')
        .send(payload)
        .expect(200);

    assert.strictEqual(res.body.status, 'success');
    assert.strictEqual(res.body.dryRun, true);
    assert.strictEqual(res.body.summary.totalBilled, 40000);
    assert.strictEqual(res.body.summary.estimatedApprovalAmount, 40000);
    assert.strictEqual(res.body.summary.totalDeductions, 0);
    assert.ok(res.body.evaluatedAt);
});

test('POST /api/simulator/evaluate - 400 Bad Request missing billItems', async () => {
    const payload = {
        policyDetails: {
            sumInsuredBalance: 50000,
            waitingPeriodMonths: 24
        },
        claimDraft: {
            // empty or missing billItems
        }
    };

    const res = await request(app)
        .post('/api/simulator/evaluate')
        .send(payload)
        .expect(400);

    assert.strictEqual(res.body.status, 'error');
    assert.ok(res.body.errors.some(e => e.msg === 'billItems must be a non-empty array'));
});

test('POST /api/simulator/evaluate - Edge case fraud and doc warnings', async () => {
    const payload = {
        policyDetails: {
            sumInsuredBalance: 50000,
            waitingPeriodMonths: 24,
            elapsedMonths: 12
        },
        claimDraft: {
            isPreExisting: true,
            billItems: [
                { itemCode: 'IOL-1', category: 'IOL', description: 'Lens', billedAmount: 20000 }
            ]
        }
    };

    const res = await request(app)
        .post('/api/simulator/evaluate')
        .send(payload)
        .expect(200);

    assert.ok(res.body.missingDocumentFlags.includes(REASON_CODES.MISSING_DOCUMENT));
    assert.ok(res.body.fraudWarningFlags.includes(REASON_CODES.FRAUD_WAITING_PERIOD));
    assert.strictEqual(res.body.dryRun, true);
});
