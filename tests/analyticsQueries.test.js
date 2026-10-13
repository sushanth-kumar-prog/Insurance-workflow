const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Claim = require('../src/models/Claim');
const Policy = require('../src/models/Policy');
const AuditLog = require('../src/models/AuditLog');

test('SLA summary issues a constant number of queries', { timeout: 300000 }, async (t) => {
    let mongoServer;
    let token;
    let policyId;

    const CLAIM_COUNT = 40;

    t.before(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());

        const policy = await Policy.create({
            policyNumber: 'POL-SLA-1',
            memberName: 'SLA Tester',
            memberId: 'MEM-SLA',
            sumInsuredBalance: 500000,
            policyInceptionDate: '2020-01-01',
            waitingPeriodMonths: 24,
            status: 'ACTIVE'
        });
        policyId = policy._id;

        await request(app)
            .post('/api/auth/register')
            .send({ name: 'Fin', email: 'fin@sla.com', password: 'Str0ngPass1', role: 'FINANCE' })
            .expect(201);
        const login = await request(app)
            .post('/api/auth/login')
            .send({ email: 'fin@sla.com', password: 'Str0ngPass1' })
            .expect(200);
        token = login.headers['set-cookie'];

        // A meaningful spread of statuses, each with audit history.
        const statuses = ['APPROVED', 'REJECTED', 'IN_REVIEW', 'SETTLED'];
        for (let i = 0; i < CLAIM_COUNT; i++) {
            const status = statuses[i % statuses.length];
            const claim = await Claim.create({
                claimNumber: `CLM-SLA-${i}`,
                policyId,
                claimType: 'CASHLESS',
                status,
                adjudicationResult: { approvedAmount: 1000 * (i + 1) },
                billItems: []
            });

            await AuditLog.create({
                claimId: claim._id,
                fromState: 'IN_REVIEW',
                toState: 'PRE_AUTH_SUBMITTED',
                actorId: 'system',
                actorRole: 'SYSTEM',
                action: 'TRANSITION',
                timestamp: new Date(Date.now() - 120 * 60 * 1000) // 2h ago: breaches the 60m pre-auth SLA
            });

            if (status === 'APPROVED' || status === 'REJECTED' || status === 'SETTLED') {
                await AuditLog.create({
                    claimId: claim._id,
                    fromState: 'IN_REVIEW',
                    toState: status,
                    actorId: 'system',
                    actorRole: 'SYSTEM',
                    action: 'TRANSITION',
                    timestamp: new Date()
                });
            }
        }
    });

    t.after(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    // Mongoose 9 emits exactly one debug message per database operation (the
    // payload is only the collection name), so counting messages counts queries.
    const withQueryLog = async (fn) => {
        const seen = [];
        mongoose.set('debug', (msg) => seen.push(msg));
        try {
            await fn();
        } finally {
            mongoose.set('debug', false);
        }
        return seen;
    };

    const readOps = (ops) => ops;

    await t.test('returns a summary with no per-claim queries', async () => {
        let res;
        const reads = await withQueryLog(async () => {
            res = await request(app)
                .get('/api/analytics/sla-summary')
                .set('Cookie', token)
                .expect(200);
        });

        assert.strictEqual(res.body.status, 'success');
        // Statuses cycle APPROVED/REJECTED/IN_REVIEW/SETTLED over 40 claims:
        // 10 each. APPROVED and SETTLED both count toward approvedCount.
        assert.strictEqual(res.body.data.approvedCount, 20);
        assert.strictEqual(res.body.data.rejectedCount, 10);

        const dataReads = readOps(reads);
        // One find for claims, one find for audit logs. The old implementation
        // issued 1 + N, i.e. 41 commands for 40 claims.
        assert.strictEqual(dataReads.length, 2, `expected 2 read queries, got ${dataReads.length}`);
    });

    await t.test('query count does not grow with the number of claims', async () => {
        const countFor = async () => {
            const reads = await withQueryLog(async () => {
                await request(app).get('/api/analytics/sla-summary').set('Cookie', token).expect(200);
            });
            return readOps(reads).length;
        };

        const before = await countFor();
        // Guard against a vacuous pass: if the hook is broken both counts are 0
        // and the comparison below would succeed for the wrong reason.
        assert.ok(before > 0, 'query logging produced no reads - the hook is not working');
        assert.strictEqual(before, 2);

        // Add 20 more claims; the query count must stay flat.
        for (let i = 0; i < 20; i++) {
            await Claim.create({
                claimNumber: `CLM-SLA-EXTRA-${i}`,
                policyId,
                claimType: 'CASHLESS',
                status: 'APPROVED',
                adjudicationResult: { approvedAmount: 500 },
                billItems: []
            });
        }

        const after = await countFor();
        assert.strictEqual(after, before, `query count grew from ${before} to ${after} when claims were added`);
    });

    await t.test('computes breach percentage from real audit timing', async () => {
        const res = await request(app)
            .get('/api/analytics/sla-summary')
            .set('Cookie', token)
            .expect(200);

        // Derive the expectation from the database rather than hardcoding it, so
        // this stays correct even though an earlier subtest added more claims.
        const claimCount = await mongoose.connection.db.collection('claims').countDocuments();
        // Only claims with a PRE_AUTH_SUBMITTED log two hours ago are breached;
        // claims added without audit history are not.
        const breached = await mongoose.connection.db.collection('auditlogs').countDocuments({
            toState: 'PRE_AUTH_SUBMITTED'
        });

        const expected = ((breached / claimCount) * 100).toFixed(2);
        assert.strictEqual(res.body.data.breachPercentage, expected);
        assert.strictEqual(res.body.data.totalBreaches, breached);
    });

    await t.test('handles an empty database without erroring', async () => {
        // The native driver bypasses the append-only hooks, which correctly
        // block AuditLog.deleteMany.
        await mongoose.connection.db.collection('auditlogs').deleteMany({});
        await mongoose.connection.db.collection('claims').deleteMany({});

        const res = await request(app)
            .get('/api/analytics/sla-summary')
            .set('Cookie', token)
            .expect(200);

        assert.strictEqual(res.body.data.breachPercentage, 0);
        assert.strictEqual(res.body.data.totalOutflow, 0);
    });
});
