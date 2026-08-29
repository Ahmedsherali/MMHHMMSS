"use strict";
const express   = require("express");
const rateLimit = require("express-rate-limit");
const { loginAdmin, getMe } = require("../controllers/authController");
const { protect }           = require("../middleware/authMiddleware");

const router = express.Router();

// ─── Rate limiter: 5 attempts per 15 min per IP ───────────────────────────────
// standardHeaders:true  → RFC-compliant RateLimit-* response headers (CORS-safe)
// legacyHeaders:false   → suppresses old X-RateLimit-* headers
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failed attempts toward the limit
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please wait 15 minutes and try again.",
    }),
});

router.post("/login", loginLimiter, loginAdmin);
router.get("/me",    protect,      getMe);

module.exports = router;

