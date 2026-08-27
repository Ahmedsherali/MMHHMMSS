/**
 * Vercel Serverless Entry Point
 * - Awaits DB connection on cold start (readyState check avoids reconnecting on warm invocations)
 * - Delegates all requests to the Express app
 */
const mongoose  = require("mongoose");
const connectDB = require("../config/db");
const app       = require("../server");

let dbReady = false;

module.exports = async (req, res) => {
  // Re-check live readyState — module-level flag can be stale if Mongoose drops the connection
  if (!dbReady || mongoose.connection.readyState !== 1) {
    try {
      await connectDB();
      dbReady = true;
    } catch (err) {
      console.error("[Serverless] DB connection failed:", err.message);
      return res.status(500).json({
        success: false,
        message: "Database unavailable. Please try again in a moment.",
      });
    }
  }
  return app(req, res);
};

