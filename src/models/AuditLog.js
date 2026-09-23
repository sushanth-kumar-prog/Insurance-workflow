const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', index: true, required: true },
    fromState: { type: String, required: true },
    toState: { type: String, required: true },
    actorId: { type: String, required: true },
    actorRole: { type: String, required: true },
    action: { type: String, required: true },
    notes: { type: String },
    timestamp: { type: Date, default: Date.now }
});

// Append-only constraint
auditLogSchema.pre('findOneAndUpdate', function (next) {
    next(new Error('AuditLogs cannot be updated.'));
});
auditLogSchema.pre('updateOne', function (next) {
    next(new Error('AuditLogs cannot be updated.'));
});
auditLogSchema.pre('remove', function (next) {
    next(new Error('AuditLogs cannot be deleted.'));
});
auditLogSchema.pre('deleteOne', function (next) {
    next(new Error('AuditLogs cannot be deleted.'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
