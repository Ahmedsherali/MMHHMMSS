"use strict";
const express   = require("express");
const rateLimit = require("express-rate-limit");
const { loginAdmin, getMe, updateEmail, updatePassword } = require("../controllers/authController");
const { protect }           = require("../middleware/authMiddleware");

const router = express.Router();

// ─── Rate limiter: 5 attempts per 15 min per IP ───────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please wait 15 minutes and try again.",
    }),
});

router.post("/login",           loginLimiter, loginAdmin);
router.get("/me",               protect,      getMe);
router.put("/update-email",     protect,      updateEmail);
router.put("/update-password",  protect,      updatePassword);

module.exports = router;
