const Policy = require('../models/Policy');
const User = require('../models/User');

function validatePolicyInput(body) {
    const {
        policyNumber,
        memberName,
        memberId,
        sumInsuredBalance,
        policyInceptionDate
    } = body;

    if (!policyNumber || !memberName || !memberId) {
        return 'policyNumber, memberName and memberId are required';
    }
    if (sumInsuredBalance === undefined || sumInsuredBalance === null || sumInsuredBalance === '') {
        return 'sumInsuredBalance is required';
    }
    if (Number.isNaN(Number(sumInsuredBalance)) || Number(sumInsuredBalance) < 0) {
        return 'sumInsuredBalance must be a non-negative number';
    }
    if (!policyInceptionDate || Number.isNaN(new Date(policyInceptionDate).getTime())) {
        return 'policyInceptionDate must be a valid date';
    }
    return null;
}

async function createPolicy(req, res, next) {
    try {
        const invalid = validatePolicyInput(req.body);
        if (invalid) {
            return res.status(400).json({ error: invalid });
        }

        const existing = await Policy.findOne({ policyNumber: req.body.policyNumber });
        if (existing) {
            return res.status(409).json({ error: 'Policy number already exists' });
        }

        const policy = new Policy({
            policyNumber: req.body.policyNumber,
            memberName: req.body.memberName,
            memberId: req.body.memberId,
            sumInsuredBalance: Number(req.body.sumInsuredBalance),
            sumInsuredTotal: req.body.sumInsuredTotal !== undefined
                ? Number(req.body.sumInsuredTotal)
                : Number(req.body.sumInsuredBalance),
            policyInceptionDate: new Date(req.body.policyInceptionDate),
            waitingPeriodMonths: req.body.waitingPeriodMonths ?? 24,
            iolTariffCap: req.body.iolTariffCap ?? 15000,
            roomCap: req.body.roomCap ?? 5000,
            procedureSublimits: req.body.procedureSublimits || {},
            dependants: req.body.dependants || [],
            status: req.body.status || 'ACTIVE'
        });

        await policy.save();
        res.status(201).json({ status: 'success', policy });
    } catch (err) {
        next(err);
    }
}

async function listPolicies(req, res, next) {
    try {
        // Bound the result set; an unbounded list would grow without limit.
        const limit = Math.min(Number(req.query.limit) || 50, 200);
        const filter = {};
        if (req.query.status) {
            filter.status = req.query.status;
        }
        const policies = await Policy.find(filter).sort({ policyNumber: 1 }).limit(limit);
        res.status(200).json({ status: 'success', count: policies.length, policies });
    } catch (err) {
        next(err);
    }
}

async function getPolicy(req, res, next) {
    try {
        const policy = await Policy.findById(req.params.id);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }
        res.status(200).json({ status: 'success', policy });
    } catch (err) {
        next(err);
    }
}

// Attaches a policy to a claimant account so they can raise claims against it.
async function assignPolicyToUser(req, res, next) {
    try {
        const { userId } = req.params;
        const policy = await Policy.findById(req.body.policyId);
        if (!policy) {
            return res.status(404).json({ error: 'Policy not found' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role !== 'CLAIMANT') {
            return res.status(400).json({ error: 'Only claimant accounts can hold a policy' });
        }

        user.policyId = policy._id;
        await user.save();

        res.status(200).json({ status: 'success', user: { id: user._id, policyId: user.policyId } });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    createPolicy,
    listPolicies,
    getPolicy,
    assignPolicyToUser,
    validatePolicyInput
};
