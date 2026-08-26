const jwt   = require("jsonwebtoken");
const Admin = require("../models/Admin");
const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select("+password");
    if (!admin || !(await admin.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    const token = generateToken(admin._id);
    res.status(200).json({ success: true, message: "Login successful.", token,
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ success: false, message: "Server error during login.", error: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });
    res.status(200).json({ success: true, admin });
  } catch (error) {
    console.error("GetMe Error:", error.message);
    res.status(500).json({ success: false, message: "Server error.", error: error.message });
  }
};

module.exports = { loginAdmin, getMe };
