const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'secure-dev-secret-key';

function authenticateToken(req, res, next) {
    const token = req.cookies?.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

    if (!token) {
        return res.status(401).json({ error: 'Auth token missing' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = payload; // { userId, role, email }
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Token invalid or expired' });
    }
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

module.exports = { authenticateToken, authorizeRoles, JWT_SECRET };
