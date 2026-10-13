const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    policyNumber: { type: String, unique: true, index: true, required: true },
    memberName: { type: String, required: true },
    memberId: { type: String, required: true },
    sumInsuredBalance: { type: Number, required: true, min: 0 },
    sumInsuredTotal: { type: Number, min: 0 },
    policyInceptionDate: { type: Date, required: true },
    waitingPeriodMonths: { type: Number, default: 24 },
    dependants: { type: [Object], default: [] },

    // Adjudication caps. These were previously hardcoded in the claim controller,
    // which made every policy behave as if it had identical terms.
    iolTariffCap: { type: Number, default: 15000, min: 0 },
    roomCap: { type: Number, default: 5000, min: 0 },
    // Procedure code -> payable sub-limit
    procedureSublimits: { type: Map, of: Number, default: () => new Map() },
    preExistingCovered: { type: Boolean, default: true },
    status: { type: String, enum: ['ACTIVE', 'LAPSED', 'EXPIRED'], default: 'ACTIVE' }
});

module.exports = mongoose.model('Policy', policySchema);
