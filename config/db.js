const mongoose = require("mongoose");

const connectDB = async () => {
  // Reuse existing connection across warm serverless invocations
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // fail fast if Atlas unreachable
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB Connected: " + conn.connection.host);
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    // Throw instead of process.exit — lets the serverless function return a 500
    throw new Error("Database connection failed: " + error.message);
  }
};

module.exports = connectDB;

