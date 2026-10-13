const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.UPLOAD_DIR = path.join(require('os').tmpdir(), `iw-uploads-${process.pid}`);

const app = require('../src/app');
const Claim = require('../src/models/Claim');
const Policy = require('../src/models/Policy');
const AuditLog = require('../src/models/AuditLog');
const { UPLOAD_DIR } = require('../src/middleware/upload');

test('Disputes, document upload, claim listing and SLA', { timeout: 300000 }, async (t) => {
    let mongoServer;
    let policyId;
    let deskToken;
    let verifierToken;
    let otherToken;
    let claimId;
    let claimNumber = 0;

    const nextClaim = () => `CLM-DOC-${++claimNumber}`;

    t.before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        policyId = (await Policy.create({
            policyNumber: 'POL-DOC-1',
            memberName: 'Doc Tester',
            memberId: 'MEM-DOC',
            sumInsuredBalance: 250000,
            policyInceptionDate: '2022-01-01',
            waitingPeriodMonths: 24,
            iolTariffCap: 15000,
            roomCap: 5000,
            status: 'ACTIVE'
        }))._id;

        const mk = async (email, role) => {
            await request(app).post('/api/auth/register')
                .send({ name: role, email, password: 'Str0ngPass1', role }).expect(201);
            return (await request(app).post('/api/auth/login')
                .send({ email, password: 'Str0ngPass1' }).expect(200)).headers['set-cookie'];
        };
        deskToken = await mk('desk2@doc.com', 'HOSPITAL_DESK');
        verifierToken = await mk('ver2@doc.com', 'VERIFIER');
        otherToken = await mk('other2@doc.com', 'HOSPITAL_DESK');
    });

    t.after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
    });

    const createClaim = async (token = deskToken, extra = {}) => {
        const res = await request(app).post('/api/claims')
            .set('Cookie', token)
            .send({
                claimNumber: nextClaim(),
                policyId: policyId.toString(),
                claimType: 'CASHLESS',
                procedureDetails: { procedureType: 'Cataract_Phaco', eyeSide: 'OD' },
                billItems: [
                    { itemCode: 'Cataract_Phaco', description: 'Phaco', category: 'PROCEDURE', billedAmount: 60000 },
                    { itemCode: 'GLOVES', description: 'Gloves', category: 'GLOVES', billedAmount: 1200 }
                ],
                ...extra
            })
            .expect(201);
        return res.body.claim;
    };

    await t.test('adjudicates so there is a deduction to dispute', async () => {
        const claim = await createClaim();
        claimId = claim._id;
        await request(app).post(`/api/claims/${claimId}/adjudicate`)
            .set('Cookie', verifierToken).send({}).expect(200);
        const reloaded = await Claim.findById(claimId);
        assert.ok(reloaded.adjudicationResult.itemizedDeductions.length > 0,
            'expected deductions for the dispute test');
    });

    await t.test('files a line-item dispute against a real deduction', async () => {
        const claim = await Claim.findById(claimId);
        const deduction = claim.adjudicationResult.itemizedDeductions[0];

        const res = await request(app).post(`/api/claims/${claimId}/dispute-line-item`)
            .set('Cookie', deskToken)
            .send({
                reasonCode: deduction.reasonCode,
                policyClauseRef: deduction.policyClauseRef,
                itemCode: deduction.itemCode,
                disputeReason: 'These were medically necessary.'
            })
            .expect(201);

        assert.strictEqual(res.body.dispute.status, 'OPEN');
        assert.strictEqual(res.body.dispute.reasonCode, deduction.reasonCode);

        // Recorded on the claim...
        const reloaded = await Claim.findById(claimId);
        assert.strictEqual(reloaded.disputes.length, 1);
        // ...and in the append-only audit trail, without changing status.
        const logs = await AuditLog.find({ claimId, action: 'DISPUTE_FILED' });
        assert.strictEqual(logs.length, 1);
        assert.strictEqual(reloaded.status, claim.status);
    });

    await t.test('rejects a dispute with no reason', async () => {
        await request(app).post(`/api/claims/${claimId}/dispute-line-item`)
            .set('Cookie', deskToken)
            .send({ reasonCode: 'SUB_LIMIT_EXCEEDED', disputeReason: '  ' })
            .expect(400);
    });

    await t.test('rejects a dispute for a deduction that does not exist', async () => {
        await request(app).post(`/api/claims/${claimId}/dispute-line-item`)
            .set('Cookie', deskToken)
            .send({ reasonCode: 'NOT_A_REAL_CODE', disputeReason: 'because' })
            .expect(400);
    });

    await t.test('a different user cannot dispute someone else\'s claim', async () => {
        await request(app).post(`/api/claims/${claimId}/dispute-line-item`)
            .set('Cookie', otherToken)
            .send({ reasonCode: 'SUB_LIMIT_EXCEEDED', disputeReason: 'not my claim' })
            .expect(403);
    });

    // Supertest defaults .attach() to application/octet-stream, which the
    // allowlist correctly rejects; declare the real content type.
    const pdfBuffer = () => Buffer.from('%PDF-1.4 fake pdf');
    const pdfOptions = (filename = 'biometry.pdf') => ({
        filename,
        contentType: 'application/pdf'
    });

    await t.test('uploads documents with a generated filename', async () => {
        const claim = await createClaim();
        const res = await request(app)
            .post(`/api/claims/${claim._id}/documents`)
            .set('Cookie', deskToken)
            .attach('documents', pdfBuffer(), pdfOptions())
            .expect(201);

        const doc = res.body.documents[0];
        assert.strictEqual(doc.originalName, 'biometry.pdf');
        // The stored name must not be the client-supplied one.
        assert.notStrictEqual(doc.filename, 'biometry.pdf');
        assert.ok(fs.existsSync(path.join(UPLOAD_DIR, doc.filename)));

        const logs = await AuditLog.find({ claimId: claim._id, action: 'DOCUMENTS_UPLOADED' });
        assert.strictEqual(logs.length, 1);
    });

    await t.test('rejects a disallowed file type', async () => {
        const claim = await createClaim();
        await request(app)
            .post(`/api/claims/${claim._id}/documents`)
            .set('Cookie', deskToken)
            .attach('documents', Buffer.from('MZ'), {
                filename: 'malicious.exe',
                contentType: 'application/x-msdownload'
            })
            .expect(400);
    });

    await t.test('rejects an oversized file', async () => {
        const claim = await createClaim();
        await request(app)
            .post(`/api/claims/${claim._id}/documents`)
            .set('Cookie', deskToken)
            .attach('documents', Buffer.alloc(6 * 1024 * 1024), {
                filename: 'huge.pdf',
                contentType: 'application/pdf'
            })
            .expect(400);
    });

    await t.test('rejects an upload with no files', async () => {
        const claim = await createClaim();
        await request(app)
            .post(`/api/claims/${claim._id}/documents`)
            .set('Cookie', deskToken)
            .expect(400);
    });

    await t.test('a different user cannot upload to someone else\'s claim', async () => {
        const claim = await createClaim();
        await request(app)
            .post(`/api/claims/${claim._id}/documents`)
            .set('Cookie', otherToken)
            .attach('documents', pdfBuffer(), pdfOptions('a.pdf'))
            .expect(403);
    });

    await t.test('claim listing is scoped by ownership', async () => {
        // A claim owned by the other desk user, so the scoping is observable.
        const otherClaim = await createClaim(otherToken);

        const mine = await request(app).get('/api/claims')
            .set('Cookie', deskToken).expect(200);
        const mineIds = mine.body.claims.map(c => c._id);

        assert.ok(mineIds.includes(claimId), 'owner should see their own claim');
        assert.ok(!mineIds.includes(otherClaim._id), 'owner must not see another user\'s claim');

        const theirs = await request(app).get('/api/claims')
            .set('Cookie', otherToken).expect(200);
        assert.ok(!theirs.body.claims.map(c => c._id).includes(claimId));

        // Staff see the whole book, including both users' claims.
        const staff = await request(app).get('/api/claims')
            .set('Cookie', verifierToken).expect(200);
        const staffIds = staff.body.claims.map(c => c._id);
        assert.ok(staffIds.includes(claimId));
        assert.ok(staffIds.includes(otherClaim._id));
        assert.ok(staffIds.length > mineIds.length);
    });

    await t.test('/my-claims legacy path still resolves to the list', async () => {
        const res = await request(app).get('/api/claims/my-claims')
            .set('Cookie', deskToken).expect(200);
        assert.ok(res.body.claims.length > 0);
    });

    await t.test('audit trail now carries a server-computed SLA', async () => {
        const claim = await createClaim();
        await request(app).post(`/api/claims/${claim._id}/transition`)
            .set('Cookie', deskToken)
            .send({ targetState: 'PRE_AUTH_SUBMITTED' })
            .expect(200);

        const res = await request(app).get(`/api/claims/${claim._id}/audit-trail`)
            .set('Cookie', deskToken).expect(200);

        assert.ok(res.body.sla, 'expected an sla object');
        assert.strictEqual(res.body.sla.type, 'PRE_AUTH');
        assert.strictEqual(typeof res.body.sla.remainingMinutes, 'number');
        assert.strictEqual(res.body.sla.isBreached, false);
        assert.strictEqual(res.body.sla.status, 'ON_TIME');
        assert.ok(res.body.dischargeSla);
    });

    await t.test('a raised query reports the SLA clock as paused', async () => {
        const claim = await createClaim();
        await request(app).post(`/api/claims/${claim._id}/transition`)
            .set('Cookie', deskToken).send({ targetState: 'PRE_AUTH_SUBMITTED' }).expect(200);
        await request(app).post(`/api/claims/${claim._id}/transition`)
            .set('Cookie', verifierToken).send({ targetState: 'IN_REVIEW' }).expect(200);
        await request(app).post(`/api/claims/${claim._id}/transition`)
            .set('Cookie', verifierToken).send({ targetState: 'QUERY_RAISED' }).expect(200);

        const res = await request(app).get(`/api/claims/${claim._id}/audit-trail`)
            .set('Cookie', deskToken).expect(200);

        assert.strictEqual(res.body.sla.isPaused, true);
    });
});
