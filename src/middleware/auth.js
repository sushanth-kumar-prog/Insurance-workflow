const jwt = require('jsonwebtoken');

function resolveSecret() {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be set when NODE_ENV=production');
    }
    // Development-only fallback. Never reachable in production.
    return 'secure-dev-secret-key';
}

const JWT_SECRET = resolveSecret();

function authenticateToken(req, res, next) {
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Auth token missing' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // { id, role, email }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token invalid or expired' });
    }
}

// Roles that act on behalf of the insurer rather than a single policyholder.
const STAFF_ROLES = ['VERIFIER', 'MEDICAL_OFFICER', 'APPROVER', 'FINANCE'];

function isStaff(role) {
    return STAFF_ROLES.includes(role);
}

function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: 'User role unavailable' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Permission denied for this role' });
        }

        next();
    };
}

module.exports = { authenticateToken, authorizeRoles, isStaff, STAFF_ROLES, JWT_SECRET };
