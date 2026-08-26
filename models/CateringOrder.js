const mongoose = require("mongoose");
const cateringOrderSchema = new mongoose.Schema({
  clientName:    { type: String, required: [true,"Client name required."], trim: true },
  phone:         { type: String, required: [true,"Phone required."],
                   match: [/^\d{4}-\d{7}$/, "Phone must match XXXX-XXXXXXX (e.g. 0300-1234567)."] },
  eventDate:     { type: Date,   required: [true,"Event date required."] },
  eventLocation: { type: String, trim: true, default: "" },
  guestCount:    { type: Number, required: [true,"Guest count required."], min: 1 },
  selectedMenuItems: [{
    menuItem:     { type: mongoose.Schema.Types.ObjectId, ref: "MenuPricing" },
    dishName:     { type: String, required: true },
    pricePerHead: { type: Number, required: true, min: 0 },
  }],
  totalPricePerHead:  { type: Number, default: 0, min: 0 },
  discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
  estimatedTotal:     { type: Number, default: 0 },
  discountAmount:     { type: Number, default: 0 },
  discountedTotal:    { type: Number, default: 0 },
  status: { type: String, enum: ["Pending","Confirmed","Completed","Cancelled"], default: "Pending" },
  notes:  { type: String, trim: true, default: "" },
}, { timestamps: true });
cateringOrderSchema.pre("save", async function () {
  try {
    this.totalPricePerHead = this.selectedMenuItems.reduce((s,i) => s + (i.pricePerHead||0), 0);
    this.estimatedTotal    = parseFloat((this.totalPricePerHead * this.guestCount).toFixed(2));
    this.discountAmount    = parseFloat(((this.estimatedTotal * this.discountPercentage) / 100).toFixed(2));
    this.discountedTotal   = parseFloat((this.estimatedTotal - this.discountAmount).toFixed(2));
  } catch (e) { throw e; }
});
module.exports = mongoose.model("CateringOrder", cateringOrderSchema);
