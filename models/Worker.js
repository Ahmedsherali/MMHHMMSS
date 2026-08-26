const mongoose = require("mongoose");
const workerSchema = new mongoose.Schema({
  name:     { type: String, required: [true,"Name required."], trim: true },
  type:     { type: String, required: [true,"Type required."],
              enum: { values: ["Permanent","PPD"], message: "Type must be Permanent or PPD." } },
  wageRate: { type: Number, required: [true,"Wage rate required."], min: 0 },
  phone:    { type: String, match: [/^\d{4}-\d{7}$/, "Phone must match XXXX-XXXXXXX (e.g. 0300-1234567)."], default: "" },
  status:   { type: String, enum: { values: ["Active","Inactive","Terminated"], message: "Invalid status." }, default: "Active" },
  joiningDate: { type: Date, default: Date.now },
  notes:    { type: String, trim: true, default: "" },
}, { timestamps: true });
module.exports = mongoose.model("Worker", workerSchema);
