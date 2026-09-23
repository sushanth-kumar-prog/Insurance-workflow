const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
    claimNumber: { type: String, unique: true, index: true, required: true },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
    claimType: { type: String, enum: ['CASHLESS', 'REIMBURSEMENT'], required: true },
    status: {
        type: String,
        enum: ['DRAFT', 'PRE_AUTH_SUBMITTED', 'IN_REVIEW', 'QUERY_RAISED', 'QUERY_RESPONDED', 'APPROVED', 'REJECTED', 'SETTLED'],
        default: 'DRAFT'
    },
    procedureDetails: {
        procedureType: String,
        eyeSide: String,
        iolCost: Number,
        admissionDate: Date
    },
    billItems: [{
        itemCode: String,
        description: String,
        category: String,
        billedAmount: Number
    }],
    adjudicationResult: {
        totalBilled: Number,
        approvedAmount: Number,
        totalDeductions: Number,
        itemizedDeductions: []
    },
    flags: {
        missingDocuments: [String],
        fraudWarnings: [String]
    }
});

module.exports = mongoose.model('Claim', claimSchema);
