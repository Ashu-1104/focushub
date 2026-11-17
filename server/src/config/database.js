import mongoose from 'mongoose';

const mongoUri = () => process.env.MONGODB_URI || 'mongodb://localhost:27017/focushub';

// Long-running server: connect once at start-up, exit if the database is unreachable.
const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri());
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Serverless: reuse one connection across invocations of the same instance.
let connecting = null;
export const ensureDb = () => {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connecting) {
    connecting = mongoose.connect(mongoUri(), { serverSelectionTimeoutMS: 10_000 }).catch((error) => {
      connecting = null; // let the next request try again
      throw error;
    });
  }
  return connecting;
};

export default connectDB;
