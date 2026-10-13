/**
 * Seeds representative policies and users for local development.
 * Safe to re-run: policies are upserted by policyNumber.
 *
 *   node src/seed.js
 */
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Policy = require('./models/Policy');
const User = require('./models/User');

const POLICIES = [
    {
        policyNumber: 'POL-2024-0001',
        memberName: 'Ramesh Kumar',
        memberId: 'MEM-0001',
        sumInsuredTotal: 300000,
        sumInsuredBalance: 250000,
        // Incepted well beyond the waiting period.
        policyInceptionDate: '2022-03-15',
        waitingPeriodMonths: 24,
        iolTariffCap: 15000,
        roomCap: 5000,
        procedureSublimits: { 'Cataract_Phaco': 40000, 'Retina_Vitrectomy': 60000 },
        dependants: [{ name: 'Lakshmi Kumar', relation: 'SPOUSE' }]
    },
    {
        policyNumber: 'POL-2025-0002',
        memberName: 'Priya Sharma',
        memberId: 'MEM-0002',
        sumInsuredTotal: 200000,
        sumInsuredBalance: 200000,
        // Incepted recently: inside a 24-month waiting period.
        policyInceptionDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        waitingPeriodMonths: 24,
        iolTariffCap: 12000,
        roomCap: 3500,
        procedureSublimits: { 'Cataract_Phaco': 35000 }
    }
];

const USERS = [
    { name: 'Verifier One', email: 'verifier@example.com', password: 'Str0ngPass1', role: 'VERIFIER' },
    { name: 'Approver One', email: 'approver@example.com', password: 'Str0ngPass1', role: 'APPROVER' },
    { name: 'Finance One', email: 'finance@example.com', password: 'Str0ngPass1', role: 'FINANCE' },
    { name: 'Officer One', email: 'officer@example.com', password: 'Str0ngPass1', role: 'MEDICAL_OFFICER' },
    { name: 'Desk One', email: 'desk@example.com', password: 'Str0ngPass1', role: 'HOSPITAL_DESK', hospitalName: 'City Eye Hospital' }
];

async function seed() {
    await connectDB();

    for (const policy of POLICIES) {
        // Upsert so re-running does not create duplicates or reset balances.
        await Policy.findOneAndUpdate(
            { policyNumber: policy.policyNumber },
            { $set: policy },
            { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
        );
        console.log(`  policy ${policy.policyNumber} ready`);
    }

    for (const user of USERS) {
        // Only set the password when creating the account, so re-running the seed
        // never resets a password the user has since changed.
        await User.findOneAndUpdate(
            { email: user.email },
            {
                $set: { name: user.name, role: user.role, hospitalName: user.hospitalName },
                $setOnInsert: { password: user.password }
            },
            { upsert: true }
        );

        // Repair accounts provisioned by an earlier seed run that had no password.
        const existing = await User.findOne({ email: user.email }).select('+password');
        if (existing && !existing.password) {
            existing.password = user.password;
            await existing.save();
            console.log(`  reset missing password for ${user.email}`);
        }
    }
    console.log('  staff users ensured: verifier/approver/finance/officer/desk @example.com (password Str0ngPass1)');

    // The demo claimant is linked to the seeded policy so it can raise claims.
    const primaryPolicy = await Policy.findOne({ policyNumber: 'POL-2024-0001' });
    let claimant = await User.findOne({ email: 'claimant@example.com' });
    if (!claimant) {
        claimant = new User({
            name: 'Demo Claimant',
            email: 'claimant@example.com',
            password: 'Str0ngPass1',
            role: 'CLAIMANT'
        });
    }
    claimant.policyId = primaryPolicy._id;
    await claimant.save();
    console.log('  claimant@example.com linked to POL-2024-0001');

    console.log('Seed complete.');
    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Seed failed:', err.message);
    process.exit(1);
});
