const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const adminSchema = new mongoose.Schema({
  name:     { type: String, required: [true, "Admin name is required."], trim: true },
  email:    { type: String, required: [true, "Email is required."], unique: true, lowercase: true, trim: true,
              match: [/^\S+@\S+\.\S+$/, "Provide a valid email."] },
  password: { type: String, required: [true, "Password is required."], minlength: [6,"Min 6 chars."], select: false },
  role:     { type: String, default: "admin" },
}, { timestamps: true });

// ==========================================
// CHANGES APPLIED HERE:
// Removed the 'next' parameter and callback calls. 
// In Mongoose, async pre-save hooks automatically 
// await promises and handle thrown errors natively.
// ==========================================
adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});
// ==========================================

adminSchema.methods.matchPassword = async function (pwd) {
  return bcrypt.compare(pwd, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);