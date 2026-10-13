const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

const VALID_ROLES = ['CLAIMANT', 'HOSPITAL_DESK', 'VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'];

function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 8) {
        return 'Password must be at least 8 characters';
    }
    if (password.length > 128) {
        return 'Password must be at most 128 characters';
    }
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        return 'Password must contain a lowercase letter, an uppercase letter and a digit';
    }
    return null;
}

async function register(req, res, next) {
    try {
        const { name, email, password, role, policyId, hospitalName } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.status(400).json({ error: passwordError });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const user = new User({
            name,
            email,
            password,
            role,
            policyId,
            hospitalName
        });

        await user.save();

        res.status(201).json({ status: 'success', message: 'User registered successfully' });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const payload = {
            id: user._id,
            role: user.role,
            email: user.email
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

        res.status(200).json({
            status: 'success',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (err) {
        next(err);
    }
}

function logout(req, res) {
    res.clearCookie('token');
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
}

async function getMe(req, res, next) {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({ status: 'success', user });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    register,
    login,
    logout,
    getMe
};
