const mongoose = require('mongoose');

async function connectDB(uri) {
    try {
        const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/insurance';
        await mongoose.connect(mongoUri);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

module.exports = connectDB;
