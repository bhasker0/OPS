const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ops_audit_db';

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  autoIndex: true,
};

let isConnected = false;

// Connection lifecycle event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('?? Connected to MongoDB Audit Store (Pool size: 10).');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.warn('?? MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('?? MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('?? MongoDB reconnected to Audit Store.');
});

async function connectMongo(uri = MONGO_URI, options = MONGO_OPTIONS) {
  try {
    mongoose.set('strictQuery', false);
    if (mongoose.connection.readyState === 1 && mongoose.connection._connectionString === uri) {
      return mongoose.connection;
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(uri, options);
    await mongoose.connection.syncIndexes();
    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    console.warn('⚠️ MongoDB connection warning (App will use fallback buffer):', err.message);
    isConnected = false;
    return null;
  }
}

async function closeMongoConnection() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      isConnected = false;
      console.log('?? MongoDB connection pool closed gracefully.');
    }
  } catch (err) {
    console.error('Error closing MongoDB connection:', err.message);
  }
}

function getIsConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

module.exports = {
  connectMongo,
  closeMongoConnection,
  getIsConnected,
  MONGO_OPTIONS,
  MONGO_URI,
};
