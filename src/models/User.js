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

// Hash password before save. Mongoose 9 requires promise-style hooks here;
// mixing in a `next` callback throws "next is not a function".
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password securely
userSchema.methods.comparePassword = async function (candidatePassword) {
    // A user with no stored hash (e.g. provisioned without a password) can never
    // authenticate; return false rather than throwing on a null hash.
    if (!this.password || typeof candidatePassword !== 'string') {
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
