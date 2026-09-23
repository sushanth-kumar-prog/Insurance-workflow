const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const simulatorRoutes = require('./routes/simulatorRoutes');
const claimRoutes = require('./routes/claimRoutes');
const authRoutes = require('./routes/authRoutes');
const nhcxRoutes = require('./routes/nhcxRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/simulator', simulatorRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api', nhcxRoutes); // maps to /api/claims/:id/fhir and /api/nhcx/submit natively
app.use('/api/analytics', analyticsRoutes);

app.use(errorHandler);

module.exports = app;

module.exports = app;
