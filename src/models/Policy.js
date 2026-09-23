const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    policyNumber: { type: String, unique: true, index: true, required: true },
    memberName: { type: String, required: true },
    memberId: { type: String, required: true },
    sumInsuredBalance: { type: Number, required: true, min: 0 },
    policyInceptionDate: { type: Date, required: true },
    waitingPeriodMonths: { type: Number, default: 24 },
    dependants: { type: [Object], default: [] }
});

module.exports = mongoose.model('Policy', policySchema);
