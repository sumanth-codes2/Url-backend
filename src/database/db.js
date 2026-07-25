import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    console.log("MONGODB_URI exists:", !!process.env.MONGODB_URI);
    console.log("MONGODB_URI starts with:", process.env.MONGODB_URI?.substring(0, 20));

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB Error:", err);
    throw err;
  }
};