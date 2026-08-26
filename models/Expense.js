const mongoose = require("mongoose");
const expenseSchema = new mongoose.Schema({
  category: { type: String, required: [true,"Category required."],
    enum: { values: ["Electricity","Gas","Water","Wear & Tear","Manager Wages","Worker Wages","Other"],
            message: "Invalid category." } },
  amount:      { type: Number, required: [true,"Amount required."], min: 0 },
  expenseDate: { type: Date,   required: [true,"Date required."], default: Date.now },
  description: { type: String, trim: true, default: "" },
  worker:      { type: mongoose.Schema.Types.ObjectId, ref: "Worker", default: null },
}, { timestamps: true });
expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1, expenseDate: -1 });
module.exports = mongoose.model("Expense", expenseSchema);
