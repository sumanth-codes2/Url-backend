import mongoose from 'mongoose';
import logger from '../shared/logger/logger.js';

export const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/url_shortener';
    await mongoose.connect(connUri);
    logger.info('MongoDB Connected successfully to: ' + connUri);
  } catch (error) {
    logger.error('Database connection error: ' + error.message);
    process.exit(1);
  }
};
