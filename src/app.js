const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const simulatorRoutes = require('./routes/simulatorRoutes');
const claimRoutes = require('./routes/claimRoutes');
const authRoutes = require('./routes/authRoutes');
const nhcxRoutes = require('./routes/nhcxRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const policyRoutes = require('./routes/policyRoutes');
const errorHandler = require('./middleware/errorHandler');
const { notFoundHandler } = errorHandler;

// Allowed browser origins. In development the Vite dev server proxies /api, so
// requests are same-origin and CORS is not exercised; the containerised nginx
// does the same. This list matters for any direct cross-origin client.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:3000')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin(origin, callback) {
        // Same-origin/curl requests have no Origin header.
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api', nhcxRoutes); // /api/nhcx/submit (gateway router only)
app.use('/api/analytics', analyticsRoutes);
app.use('/api/policies', policyRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
