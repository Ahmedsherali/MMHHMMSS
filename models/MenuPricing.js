const mongoose = require("mongoose");
const menuPricingSchema = new mongoose.Schema({
  dishName:     { type: String, required: [true,"Dish name required."], trim: true, unique: true },
  category:     { type: String, required: [true,"Category required."],
                  enum: { values: ["Rice","Curry","Dessert","Beverage","Other"], message: "Invalid category." } },
  pricePerHead: { type: Number, required: [true,"Price required."], min: [0,"Cannot be negative."] },
  isActive:     { type: Boolean, default: true },
  description:  { type: String, trim: true, default: "" },
}, { timestamps: true });
module.exports = mongoose.model("MenuPricing", menuPricingSchema);
