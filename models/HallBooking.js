const mongoose = require("mongoose");
const hallBookingSchema = new mongoose.Schema({
  clientName:   { type: String, required: [true,"Client name required."], trim: true },
  phone:        { type: String, required: [true,"Phone required."],
                  match: [/^\d{4}-\d{7}$/, "Phone must match XXXX-XXXXXXX (e.g. 0300-1234567)."] },
  bookingDate:  { type: Date,   required: [true,"Booking date required."] },
  shift:        { type: String, required: [true,"Shift required."],
                  enum: { values: ["Evening","Night"], message: "Shift must be Evening or Night." } },
  hallType:     { type: String, required: [true,"Hall type required."],
                  enum: { values: ["Hall Only","Hall with Catering"], message: "Invalid hall type." } },
  guestCount:   { type: Number, required: [true,"Guest count required."], min: [1,"Min 1 guest."] },
  isAC:         { type: Boolean, default: false },
  basePricePerHead:     { type: Number, required: [true,"Base price required."], min: 0 },
  acChargePerHead:      { type: Number, default: 100, min: 0 },
  selectedMenuItems: [{
    menuItem:     { type: mongoose.Schema.Types.ObjectId, ref: "MenuPricing" },
    dishName:     { type: String },
    pricePerHead: { type: Number },
  }],
  cateringPricePerHead: { type: Number, default: 0, min: 0 },
  discountPercentage:   { type: Number, default: 0, min: 0, max: 100 },
  estimatedTotal:  { type: Number, default: 0 },
  discountAmount:  { type: Number, default: 0 },
  discountedTotal: { type: Number, default: 0 },
  status: { type: String, enum: ["Confirmed","Cancelled","Completed"], default: "Confirmed" },
  notes:  { type: String, trim: true, default: "" },
}, { timestamps: true });

hallBookingSchema.index(
  { bookingDate: 1, shift: 1 },
  { unique: true, partialFilterExpression: { status: { $ne: "Cancelled" } } }
);

hallBookingSchema.pre("save", async function () {
  try {
    const acExtra        = this.isAC ? this.acChargePerHead : 0;
    const pricePerHead   = this.basePricePerHead + this.cateringPricePerHead + acExtra;
    this.estimatedTotal  = parseFloat((pricePerHead * this.guestCount).toFixed(2));
    this.discountAmount  = parseFloat(((this.estimatedTotal * this.discountPercentage) / 100).toFixed(2));
    this.discountedTotal = parseFloat((this.estimatedTotal - this.discountAmount).toFixed(2));
  } catch (e) { throw e; }
});
module.exports = mongoose.model("HallBooking", hallBookingSchema);
