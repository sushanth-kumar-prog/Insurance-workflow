// Dev-only entrypoint: starts an in-memory MongoDB (no Docker/local mongod needed) then the API.
const { MongoMemoryServer } = require('mongodb-memory-server');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function main() {
    const mongod = await MongoMemoryServer.create();
    console.log(`In-memory MongoDB started at ${mongod.getUri()}`);
    await connectDB(mongod.getUri('insurance_claims'));

    const app = require('./app');
    const server = app.listen(PORT, () => {
        console.log(`Simulator API listening on port ${PORT}`);
    });

    const shutdown = async () => {
        server.close();
        await mongoose_disconnect();
        await mongod.stop();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

async function mongoose_disconnect() {
    const mongoose = require('mongoose');
    await mongoose.disconnect();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
