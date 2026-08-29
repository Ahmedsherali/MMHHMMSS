"use strict";
const jwt   = require("jsonwebtoken");
const Admin = require("../models/Admin");

const BCRYPT_MAX_BYTES = 72; // bcrypt silently truncates beyond this — prevent DoS
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Presence check
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });

    // 2. Strict type guard — blocks NoSQL injection payloads like { "$gt": "" }
    if (typeof email !== "string" || typeof password !== "string")
      return res.status(400).json({ success: false, message: "Invalid input format." });

    // 3. Length constraints — 254 is the RFC 5321 email limit; 72 is bcrypt's hard byte cap
    if (email.length > 254)
      return res.status(400).json({ success: false, message: "Invalid input format." });
    if (password.length > BCRYPT_MAX_BYTES)
      return res.status(400).json({ success: false, message: "Invalid input format." });
    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Invalid input format." });

    // 4. Lookup and verify — intentionally generic error to prevent user enumeration
    const admin = await Admin.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    // 5. Issue token — response shape preserved for frontend compatibility
    const token = generateToken(admin._id);
    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    // Never expose internal error detail in production
    console.error("[Auth] Login Error:", error.message);
    return res.status(500).json({ success: false, message: "An unexpected error occurred. Please try again." });
  }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });
    return res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("[Auth] GetMe Error:", error.message);
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
};

module.exports = { loginAdmin, getMe };

