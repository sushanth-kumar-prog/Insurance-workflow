const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, lowercase: true, required: true, index: true },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'],
        required: true
    },
    policyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' }, // For claimants
    hospitalName: { type: String } // For hospital desk
});

// Hash password before save
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Compare password securely
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
