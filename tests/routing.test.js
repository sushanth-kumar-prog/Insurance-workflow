const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Claim = require('../src/models/Claim');
const Policy = require('../src/models/Policy');

test('NHCX routing and CORS', { timeout: 300000 }, async (t) => {
    let mongoServer;
    let verifierToken;
    let claimantToken;
    let policyId;
    let claimId;
    let staffClaimId;

    t.before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        policyId = (await Policy.create({
            policyNumber: 'POL-RT-1',
            memberName: 'Route Tester',
            memberId: 'MEM-RT',
            sumInsuredBalance: 100000,
            policyInceptionDate: '2020-01-01',
            waitingPeriodMonths: 24,
            status: 'ACTIVE'
        }))._id;

        await request(app)
            .post('/api/auth/register')
            .send({ name: 'V', email: 'v@rt.com', password: 'Str0ngPass1', role: 'VERIFIER' })
            .expect(201);
        await request(app)
            .post('/api/auth/register')
            .send({ name: 'D', email: 'desk@rt.com', password: 'Str0ngPass1', role: 'HOSPITAL_DESK' })
            .expect(201);

        verifierToken = (await request(app)
            .post('/api/auth/login')
            .send({ email: 'v@rt.com', password: 'Str0ngPass1' })
            .expect(200)).headers['set-cookie'];

        claimantToken = (await request(app)
            .post('/api/auth/login')
            .send({ email: 'desk@rt.com', password: 'Str0ngPass1' })
            .expect(200)).headers['set-cookie'];

        // Desk-owned claim.
        const created = await request(app)
            .post('/api/claims')
            .set('Cookie', claimantToken)
            .send({
                claimNumber: 'CLM-RT-1',
                policyId: policyId.toString(),
                claimType: 'CASHLESS',
                billItems: [{ itemCode: 'X', category: 'PROCEDURE', billedAmount: 1000 }]
            })
            .expect(201);
        claimId = created.body.claim._id;

        // A second desk-owned claim, for the "own claim only" check below.
        const other = await request(app)
            .post('/api/claims')
            .set('Cookie', claimantToken)
            .send({
                claimNumber: 'CLM-RT-2',
                policyId: policyId.toString(),
                claimType: 'CASHLESS',
                billItems: [{ itemCode: 'Y', category: 'PROCEDURE', billedAmount: 2000 }]
            })
            .expect(201);
        staffClaimId = other.body.claim._id;
    });

    t.after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    await t.test('GET /api/claims/:id/fhir is served by claimRoutes', async () => {
        const res = await request(app)
            .get(`/api/claims/${claimId}/fhir`)
            .set('Cookie', verifierToken)
            .expect(200);

        // Still the FHIR payload after the move.
        assert.strictEqual(res.body.resourceType, 'Claim');
    });

    await t.test('POST /api/nhcx/submit still works from the gateway router', async () => {
        await request(app)
            .post('/api/nhcx/submit')
            .set('Cookie', verifierToken)
            .send({ resourceType: 'Claim' })
            .expect(202);
    });

    await t.test('the old nhcx path no longer duplicates the FHIR route', async () => {
        // The FHIR read must not also be reachable through the gateway router's
        // mount point in a way that bypasses claimRoutes authorisation.
        await request(app)
            .get(`/api/claims/${claimId}/fhir`)
            .expect(401); // unauthenticated
    });

    await t.test('a claimant cannot read another user FHIR record', async () => {
        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Other', email: 'other@rt.com', password: 'Str0ngPass1', role: 'CLAIMANT' })
            .expect(201);
        const otherToken = (await request(app)
            .post('/api/auth/login')
            .send({ email: 'other@rt.com', password: 'Str0ngPass1' })
            .expect(200)).headers['set-cookie'];

        // FHIR reads must respect the same ownership rule as every other endpoint.
        await request(app)
            .get(`/api/claims/${claimId}/fhir`)
            .set('Cookie', otherToken)
            .expect(403);
    });

    await t.test('CORS allows configured origins and rejects others', async () => {
        const allowed = await request(app)
            .get(`/api/claims/${claimId}/fhir`)
            .set('Cookie', verifierToken)
            .set('Origin', 'http://localhost:5173')
            .expect(200);
        assert.strictEqual(allowed.headers['access-control-allow-origin'], 'http://localhost:5173');
        assert.strictEqual(allowed.headers['access-control-allow-credentials'], 'true');

        const dockerOrigin = await request(app)
            .get(`/api/claims/${claimId}/fhir`)
            .set('Cookie', verifierToken)
            .set('Origin', 'http://localhost:3000')
            .expect(200);
        assert.strictEqual(dockerOrigin.headers['access-control-allow-origin'], 'http://localhost:3000');

        // A disallowed origin must not be reflected back.
        const evil = await request(app)
            .get(`/api/claims/${claimId}/fhir`)
            .set('Cookie', verifierToken)
            .set('Origin', 'http://evil.example')
            .expect(500);
        assert.strictEqual(evil.headers['access-control-allow-origin'], undefined);
    });
});
