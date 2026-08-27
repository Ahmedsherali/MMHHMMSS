// Vercel serverless entry point
// Explicitly awaits DB connection on cold start before handling any request.
const app = require("../server");
const connectDB = require("../config/db");

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error("[Serverless] DB connection failed:", err.message);
      return res.status(500).json({
        success: false,
        message: "Server error: could not connect to database.",
      });
    }
  }
  // Delegate to Express app
  return app(req, res);
};

