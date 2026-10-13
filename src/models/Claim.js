const mongoose = require('mongoose');

// timestamps gives createdAt/updatedAt, which the dashboard and reports sort on.
// NOTE: this belongs on the Schema constructor - the third argument to
// mongoose.model() is the collection name, not options.
const claimSchema = new mongoose.Schema({
    claimNumber: { type: String, unique: true, index: true, required: true },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // Owning user (claimant / hospital desk)
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
    },
    documents: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now }
    }],
    // Disputes raised against individual deduction line items.
    disputes: [{
        reasonCode: String,
        policyClauseRef: String,
        itemCode: String,
        disputeReason: String,
        supportingNote: String,
        filedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        filedByRole: String,
        status: { type: String, enum: ['OPEN', 'UPHELD', 'REJECTED'], default: 'OPEN' },
        filedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Claim', claimSchema);
