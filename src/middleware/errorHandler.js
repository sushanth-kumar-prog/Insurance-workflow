// Central error handler. Maps well-known error shapes to the right status code
// so clients get actionable feedback instead of a blanket 500.
function errorHandler(err, req, res, next) {
    let status = 500;
    let message = 'Internal Server Error';

    // Malformed ObjectId in a route param or query value.
    if (err.name === 'CastError') {
        status = 400;
        message = `Invalid value for field '${err.path}'`;
    } else if (err.name === 'ValidationError') {
        status = 400;
        message = 'Validation failed';
        const details = Object.values(err.errors).map(e => e.message);
        return res.status(status).json({ error: message, details });
    } else if (err.code === 11000) {
        status = 409;
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        message = `Duplicate value for '${field}'`;
    } else if (err.name === 'MongooseError' || err.name === 'MongooseServerSelectionError') {
        status = 503;
        message = 'Database unavailable';
    }

    if (status >= 500) {
        // Full detail stays in the server logs, never in the response.
        console.error(err);
        if (process.env.NODE_ENV !== 'production') {
            message = err.message;
        }
    }

    res.status(status).json({
        status: 'error',
        error: message
    });
}

module.exports = errorHandler;

// 404 handler for unmatched routes.
function notFoundHandler(req, res) {
    res.status(404).json({ status: 'error', error: 'Route not found' });
}
module.exports.notFoundHandler = notFoundHandler;
