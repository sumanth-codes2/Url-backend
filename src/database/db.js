import mongoose from 'mongoose';
import logger from '../shared/logger/logger.js';

export const connectDB = async () => {
  try {
    const connUri = process.env.MONGODB_URI;

    // Print the connection string without exposing the password
    console.log(
      "Connecting to:",
      connUri?.replace(/:(.*?)@/, ":********@")
    );

    await mongoose.connect(connUri);

    console.log("✅ MongoDB Connected Successfully");
    logger.info("MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB FULL ERROR:", error);
    logger.error("Database connection error: " + error.message);

    // Don't exit on Vercel; just log the error
    throw error;
  }
};