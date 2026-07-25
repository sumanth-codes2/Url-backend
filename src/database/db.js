import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    console.log("========== MONGODB_URI ==========");
    console.log(process.env.MONGODB_URI);
    console.log("=================================");

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB Connected");
  } catch (err) {
    console.error("MongoDB ERROR:");
    console.error(err);
    throw err;
  }
};