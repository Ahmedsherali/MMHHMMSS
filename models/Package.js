const mongoose = require("mongoose");

const packageSchema = new mongoose.Schema({
  title:        { type: String, required: [true, "Package title is required."], trim: true, unique: true },
  items:        { type: String, required: [true, "Included items description is required."], trim: true },
  pricePerHead: { type: Number, required: [true, "Price per head is required."], min: [0, "Cannot be negative."] },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("Package", packageSchema);
