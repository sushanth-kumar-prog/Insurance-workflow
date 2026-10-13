const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Policy = require('../src/models/Policy');
const Claim = require('../src/models/Claim');
const AuditLog = require('../src/models/AuditLog');
const { REASON_CODES } = require('../src/engine/constants');

// End-to-end coverage of the adjudication path: a real policy, a real claim,
// driven through the HTTP API. Previously nothing could attach a policy, so
// this path was unreachable and always short-circuited on "Policy not attached".
test('Adjudication end-to-end against a real policy', { timeout: 300000 }, async (t) => {
    let mongoServer;
    let token;
    let deskToken;
    let activePolicy;

    t.before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        activePolicy = await Policy.create({
            policyNumber: 'POL-E2E-0001',
            memberName: 'Ramesh Kumar',
            memberId: 'MEM-E2E',
            sumInsuredBalance: 250000,
            policyInceptionDate: new Date('2022-03-15'),
            waitingPeriodMonths: 24,
            iolTariffCap: 15000,
            roomCap: 5000,
            procedureSublimits: { 'Cataract_Phaco': 40000 },
            status: 'ACTIVE'
        });

        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Verifier', email: 'verifier@e2e.com', password: 'Str0ngPass1', role: 'VERIFIER' })
            .expect(201);

        // Hospital desk raises the claims; the verifier adjudicates them.
        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Desk', email: 'desk@e2e.com', password: 'Str0ngPass1', role: 'HOSPITAL_DESK' })
            .expect(201);

        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'verifier@e2e.com', password: 'Str0ngPass1' })
            .expect(200);

        token = login.headers['set-cookie'];

        const deskLogin = await request(app)
            .post('/api/auth/login')
            .send({ email: 'desk@e2e.com', password: 'Str0ngPass1' })
            .expect(200);

        deskToken = deskLogin.headers['set-cookie'];
    });

    t.after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    await t.test('rejects a claim against a non-existent policy', async () => {
        const res = await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber: 'CLM-BADPOLICY',
                policyId: '507f1f77bcf86cd799439011',
                claimType: 'CASHLESS'
            })
            .expect(400);

        assert.strictEqual(res.body.error, 'Policy not found');
    });

    await t.test('adjudicates a real claim: caps applied, non-payables stripped', async () => {
        const claimNumber = 'CLM-E2E-1';
        const created = await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber,
                policyId: activePolicy._id.toString(),
                claimType: 'CASHLESS',
                procedureDetails: {
                    procedureType: 'Cataract_Phaco',
                    eyeSide: 'OD',
                    admissionDate: new Date().toISOString()
                },
                billItems: [
                    { itemCode: 'Cataract_Phaco', description: 'Phacoemulsification', category: 'PROCEDURE', billedAmount: 60000 },
                    { itemCode: 'IOL_ACRYLIC', description: 'Acrylic IOL', category: 'IOL', billedAmount: 22000 },
                    { itemCode: 'ROOM_DELUXE', description: 'Deluxe room', category: 'ROOM_RENT', billedAmount: 9000 },
                    { itemCode: 'GLOVES', description: 'Surgical gloves', category: 'GLOVES', billedAmount: 1200 }
                ]
            })
            .expect(201);

        const claimId = created.body.claim._id;

        const res = await request(app)
            .post(`/api/claims/${claimId}/adjudicate`)
            .set('Cookie', token)
            .send({ documents: ['IOL_STICKER', 'BIOMETRY_REPORT'] })
            .expect(200);

        const result = res.body.claim.adjudicationResult;

        // Billed: 60000 + 22000 + 9000 + 1200 = 92200
        assert.strictEqual(result.totalBilled, 92200);

        const byReason = {};
        for (const d of result.itemizedDeductions) {
            byReason[d.reasonCode] = (byReason[d.reasonCode] || 0) + d.deductedAmount;
        }

        // Room rent and procedure sub-limit breaches share SUB_LIMIT_EXCEEDED:
        // room 9000 -> 5000 (-4000), procedure 60000 -> 40000 (-20000).
        assert.strictEqual(byReason[REASON_CODES.SUB_LIMIT_EXCEEDED], 4000 + 20000);
        // IOL capped at the policy tariff of 15000 -> -7000
        assert.strictEqual(byReason[REASON_CODES.TARIFF_CAP_EXCEEDED], 7000);
        // Gloves fully stripped
        assert.strictEqual(byReason[REASON_CODES.NON_PAYABLE_CONSUMABLE], 1200);

        // 40000 + 15000 + 5000 approved; gloves pay nothing.
        assert.strictEqual(result.approvedAmount, 60000);
        assert.strictEqual(result.totalDeductions, 32200);
        assert.strictEqual(result.totalBilled - result.approvedAmount, result.totalDeductions);

        // Documents supplied, so no missing-document warnings.
        assert.deepStrictEqual(res.body.claim.flags.missingDocuments, []);

        // Adjudication is now recorded in the audit trail.
        const logs = await AuditLog.find({ claimId, action: 'ADJUDICATE' });
        assert.strictEqual(logs.length, 1);
    });

    await t.test('waiting period zeroes a pre-existing procedure claim', async () => {
        const fresh = await Policy.create({
            policyNumber: 'POL-E2E-NEW',
            memberName: 'Priya Sharma',
            memberId: 'MEM-E2E-2',
            sumInsuredBalance: 200000,
            // Incepted 45 days ago, with a 24-month waiting period.
            policyInceptionDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            waitingPeriodMonths: 24,
            status: 'ACTIVE'
        });

        const created = await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber: 'CLM-E2E-2',
                policyId: fresh._id.toString(),
                claimType: 'CASHLESS',
                procedureDetails: { procedureType: 'Cataract_Phaco', eyeSide: 'OS' },
                billItems: [{ itemCode: 'Cataract_Phaco', category: 'PROCEDURE', billedAmount: 40000 }]
            })
            .expect(201);

        const res = await request(app)
            .post(`/api/claims/${created.body.claim._id}/adjudicate`)
            .set('Cookie', token)
            .send({ isPreExisting: true })
            .expect(200);

        const result = res.body.claim.adjudicationResult;
        assert.strictEqual(result.approvedAmount, 0);
        assert.strictEqual(result.totalDeductions, 40000);
        assert.ok(result.itemizedDeductions.some(d => d.reasonCode === REASON_CODES.WAITING_PERIOD_ACTIVE));

        // The fraud detector must also flag it.
        assert.ok(res.body.claim.flags.fraudWarnings.includes(REASON_CODES.FRAUD_WAITING_PERIOD));
    });

    await t.test('caps are read from the policy, not hardcoded', async () => {
        const generous = await Policy.create({
            policyNumber: 'POL-E2E-GENEROUS',
            memberName: 'Ravi Menon',
            memberId: 'MEM-E2E-3',
            sumInsuredBalance: 500000,
            policyInceptionDate: '2020-01-01',
            waitingPeriodMonths: 24,
            iolTariffCap: 40000,
            roomCap: 20000,
            procedureSublimits: {},
            status: 'ACTIVE'
        });

        const created = await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber: 'CLM-E2E-3',
                policyId: generous._id.toString(),
                claimType: 'CASHLESS',
                billItems: [{ itemCode: 'IOL_ACRYLIC', category: 'IOL', billedAmount: 22000 }]
            })
            .expect(201);

        const res = await request(app)
            .post(`/api/claims/${created.body.claim._id}/adjudicate`)
            .set('Cookie', token)
            .send({})
            .expect(200);

        // 22000 is under this policy's 40000 cap, so it pays in full - the old
        // hardcoded 15000 cap would have wrongly deducted 7000.
        assert.strictEqual(res.body.claim.adjudicationResult.approvedAmount, 22000);
        assert.strictEqual(res.body.claim.adjudicationResult.totalDeductions, 0);
    });

    await t.test('missing documents are flagged', async () => {
        const created = await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber: 'CLM-E2E-4',
                policyId: activePolicy._id.toString(),
                claimType: 'CASHLESS',
                procedureDetails: { procedureType: 'Cataract_Phaco', eyeSide: 'OD' },
                billItems: [{ itemCode: 'IOL_ACRYLIC', category: 'IOL', billedAmount: 10000 }]
            })
            .expect(201);

        const res = await request(app)
            .post(`/api/claims/${created.body.claim._id}/adjudicate`)
            .set('Cookie', token)
            .send({ documents: [] })
            .expect(200);

        assert.ok(res.body.claim.flags.missingDocuments.includes(REASON_CODES.MISSING_DOCUMENT));
    });

    await t.test('a lapsed policy cannot be adjudicated', async () => {
        const lapsed = await Policy.create({
            policyNumber: 'POL-E2E-LAPSED',
            memberName: 'Old Member',
            memberId: 'MEM-E2E-4',
            sumInsuredBalance: 100000,
            policyInceptionDate: '2015-01-01',
            waitingPeriodMonths: 24,
            status: 'LAPSED'
        });

        // Claim creation itself is rejected for a lapsed policy.
        await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber: 'CLM-E2E-5',
                policyId: lapsed._id.toString(),
                claimType: 'CASHLESS',
                billItems: []
            })
            .expect(400);
    });

    await t.test('duplicate-eye fraud rule fires once history exists', async () => {
        // Settle a prior OD claim so the current OD claim has history to match.
        await Claim.create({
            claimNumber: 'CLM-E2E-PRIOR',
            policyId: activePolicy._id,
            claimType: 'CASHLESS',
            status: 'SETTLED',
            procedureDetails: { procedureType: 'Cataract_Phaco', eyeSide: 'OD', admissionDate: new Date().toISOString() },
            billItems: []
        });

        const created = await request(app)
            .post('/api/claims')
            .set('Cookie', deskToken)
            .send({
                claimNumber: 'CLM-E2E-6',
                policyId: activePolicy._id.toString(),
                claimType: 'CASHLESS',
                procedureDetails: { procedureType: 'Cataract_Phaco', eyeSide: 'OD', admissionDate: new Date().toISOString() },
                billItems: [{ itemCode: 'Cataract_Phaco', category: 'PROCEDURE', billedAmount: 10000 }]
            })
            .expect(201);

        const res = await request(app)
            .post(`/api/claims/${created.body.claim._id}/adjudicate`)
            .set('Cookie', token)
            .send({ documents: ['BIOMETRY_REPORT'] })
            .expect(200);

        // This rule could never fire before: the API never built claim history.
        assert.ok(res.body.claim.flags.fraudWarnings.includes(REASON_CODES.FRAUD_DUPLICATE_EYE));
    });
});
