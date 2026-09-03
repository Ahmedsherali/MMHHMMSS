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

// ─── PUT /api/auth/update-email ───────────────────────────────────────────────
// Body: { currentPassword, newEmail }
// Requires valid JWT (protect) + correct current password re-verification.
const updateEmail = async (req, res) => {
  try {
    const { currentPassword, newEmail } = req.body;

    if (!currentPassword || !newEmail)
      return res.status(400).json({ success: false, message: "Current password and new email are required." });

    if (typeof currentPassword !== "string" || typeof newEmail !== "string")
      return res.status(400).json({ success: false, message: "Invalid input format." });

    if (newEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(newEmail))
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });

    if (currentPassword.length > BCRYPT_MAX_BYTES)
      return res.status(400).json({ success: false, message: "Invalid input format." });

    // Load admin with password field for verification
    const admin = await Admin.findById(req.admin.id).select("+password");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });

    // Security check: verify current password before allowing changes
    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Current password is incorrect." });

    const normalised = newEmail.toLowerCase().trim();
    if (normalised === admin.email)
      return res.status(400).json({ success: false, message: "New email must be different from the current email." });

    // Check uniqueness
    const conflict = await Admin.findOne({ email: normalised, _id: { $ne: admin._id } });
    if (conflict)
      return res.status(409).json({ success: false, message: "That email address is already in use." });

    admin.email = normalised;
    await admin.save();

    // Issue a fresh token embedding the unchanged _id (email is not in token payload)
    const token = generateToken(admin._id);
    return res.status(200).json({
      success: true,
      message: "Email updated successfully.",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (error) {
    console.error("[Auth] UpdateEmail Error:", error.message);
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
};

// ─── PUT /api/auth/update-password ───────────────────────────────────────────
// Body: { currentPassword, newPassword }
// Policy: newPassword >= 8 chars, contains at least one letter AND one digit.
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: "Current password and new password are required." });

    if (typeof currentPassword !== "string" || typeof newPassword !== "string")
      return res.status(400).json({ success: false, message: "Invalid input format." });

    if (currentPassword.length > BCRYPT_MAX_BYTES || newPassword.length > BCRYPT_MAX_BYTES)
      return res.status(400).json({ success: false, message: "Invalid input format." });

    // Enforce password policy: min 8 chars, at least one letter, at least one digit
    if (newPassword.length < 8)
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
    if (!/[a-zA-Z]/.test(newPassword))
      return res.status(400).json({ success: false, message: "New password must contain at least one letter (a-z)." });
    if (!/[0-9]/.test(newPassword))
      return res.status(400).json({ success: false, message: "New password must contain at least one number (0-9)." });

    const admin = await Admin.findById(req.admin.id).select("+password");
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(401).json({ success: false, message: "Current password is incorrect." });

    if (currentPassword === newPassword)
      return res.status(400).json({ success: false, message: "New password must be different from the current password." });

    // Assign plaintext — pre-save hook in Admin.js hashes it automatically
    admin.password = newPassword;
    await admin.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("[Auth] UpdatePassword Error:", error.message);
    return res.status(500).json({ success: false, message: "An unexpected error occurred." });
  }
};

module.exports = { loginAdmin, getMe, updateEmail, updatePassword };
