const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { transitionClaimState } = require('../src/utils/stateMachine');
const Claim = require('../src/models/Claim');
const Policy = require('../src/models/Policy');
const AuditLog = require('../src/models/AuditLog');

test('State Machine & Audit Log Test Suite', { timeout: 300000 }, async (t) => {
    let mongoServer;
    let policyInfo;

    t.before(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);

        const pol = new Policy({
            policyNumber: 'POL-1234',
            memberName: 'John Doe',
            memberId: 'M-001',
            sumInsuredBalance: 50000,
            policyInceptionDate: new Date('2020-01-01')
        });
        policyInfo = await pol.save();
    });

    t.after(async () => {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    await t.test('Valid Transition logs audit', async () => {
        const claim = new Claim({
            claimNumber: 'CLM-001',
            policyId: policyInfo._id,
            claimType: 'CASHLESS',
            status: 'DRAFT'
        });
        await claim.save();

        const updated = await transitionClaimState(claim._id, 'PRE_AUTH_SUBMITTED', { id: 'user1', role: 'CLAIMANT' }, 'Submitting', 'SUBMIT_PRE_AUTH');
        assert.strictEqual(updated.status, 'PRE_AUTH_SUBMITTED');

        const logs = await AuditLog.find({ claimId: claim._id });
        assert.strictEqual(logs.length, 1);
        assert.strictEqual(logs[0].fromState, 'DRAFT');
        assert.strictEqual(logs[0].toState, 'PRE_AUTH_SUBMITTED');
    });

    await t.test('Invalid Transition is blocked', async () => {
        const claim = new Claim({
            claimNumber: 'CLM-002',
            policyId: policyInfo._id,
            claimType: 'CASHLESS',
            status: 'DRAFT'
        });
        await claim.save();

        await assert.rejects(async () => {
            await transitionClaimState(claim._id, 'SETTLED', { id: 'user2', role: 'ADMIN' });
        }, /Invalid state transition/);

        const unchangedClaim = await Claim.findById(claim._id);
        assert.strictEqual(unchangedClaim.status, 'DRAFT');
    });

    await t.test('Audit Logs are append-only (cannot delete)', async () => {
        const claim = new Claim({
            claimNumber: 'CLM-003',
            policyId: policyInfo._id,
            claimType: 'CASHLESS',
            status: 'DRAFT'
        });
        await claim.save();

        const log = new AuditLog({
            claimId: claim._id,
            fromState: 'NONE',
            toState: 'DRAFT',
            actorId: 'S', actorRole: 'S', action: 'CREATE'
        });
        await log.save();

        await assert.rejects(async () => {
            await AuditLog.deleteOne({ _id: log._id });
        }, /AuditLogs cannot be deleted/);

        const found = await AuditLog.findById(log._id);
        assert.ok(found);
    });
});
