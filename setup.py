"""MHMS Master Setup - Phase 1 + Phase 2"""
import os, json

B = r"D:\PROJECT\SYSTEM"

def w(rel, content):
    full = os.path.join(B, rel)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as f:
        f.write(content.lstrip("\n"))
    print(f"  OK  {rel}")

# patch package.json
try:
    p = os.path.join(B, "package.json")
    pkg = json.load(open(p, encoding="utf-8"))
    pkg["main"] = "server.js"
    pkg["scripts"] = {"start":"node server.js","dev":"nodemon server.js","seed":"node scripts/seed.js"}
    json.dump(pkg, open(p,"w",encoding="utf-8"), indent=2)
    print("  OK  package.json")
except Exception as e:
    print(f"  WARN {e}")

w("config/db.js", """
const mongoose = require("mongoose");
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected: " + conn.connection.host);
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};
module.exports = connectDB;
""")

w("middleware/authMiddleware.js", """
const jwt = require("jsonwebtoken");
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Not authorized, no token provided." });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    return res.status(401).json({ success: false, message: "Not authorized, invalid token." });
  }
};
module.exports = { protect };
""")

w("middleware/errorMiddleware.js", """
const notFound = (req, res, next) => {
  const error = new Error("Route Not Found: " + req.originalUrl);
  res.status(404);
  next(error);
};
const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error("[ERROR]", err.message);
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};
module.exports = { notFound, errorHandler };
""")

w("models/Admin.js", """
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const adminSchema = new mongoose.Schema({
  name:     { type: String, required: [true, "Admin name is required."], trim: true },
  email:    { type: String, required: [true, "Email is required."], unique: true, lowercase: true, trim: true,
              match: [/^\\S+@\\S+\\.\\S+$/, "Provide a valid email."] },
  password: { type: String, required: [true, "Password is required."], minlength: [6,"Min 6 chars."], select: false },
  role:     { type: String, default: "admin" },
}, { timestamps: true });
adminSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(12));
    next();
  } catch (e) { next(e); }
});
adminSchema.methods.matchPassword = async function (pwd) {
  return bcrypt.compare(pwd, this.password);
};
module.exports = mongoose.model("Admin", adminSchema);
""")

w("models/MenuPricing.js", """
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
""")

w("models/HallBooking.js", """
const mongoose = require("mongoose");
const hallBookingSchema = new mongoose.Schema({
  clientName:   { type: String, required: [true,"Client name required."], trim: true },
  phone:        { type: String, required: [true,"Phone required."],
                  match: [/^\\d{4}-\\d{5}$/, "Phone must match XXXX-XXXXX (e.g. 0300-1234567)."] },
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

hallBookingSchema.pre("save", function (next) {
  try {
    const acExtra        = this.isAC ? this.acChargePerHead : 0;
    const pricePerHead   = this.basePricePerHead + this.cateringPricePerHead + acExtra;
    this.estimatedTotal  = parseFloat((pricePerHead * this.guestCount).toFixed(2));
    this.discountAmount  = parseFloat(((this.estimatedTotal * this.discountPercentage) / 100).toFixed(2));
    this.discountedTotal = parseFloat((this.estimatedTotal - this.discountAmount).toFixed(2));
    next();
  } catch (e) { next(e); }
});
module.exports = mongoose.model("HallBooking", hallBookingSchema);
""")

w("models/CateringOrder.js", """
const mongoose = require("mongoose");
const cateringOrderSchema = new mongoose.Schema({
  clientName:    { type: String, required: [true,"Client name required."], trim: true },
  phone:         { type: String, required: [true,"Phone required."],
                   match: [/^\\d{4}-\\d{5}$/, "Phone must match XXXX-XXXXX."] },
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
cateringOrderSchema.pre("save", function (next) {
  try {
    this.totalPricePerHead = this.selectedMenuItems.reduce((s,i) => s + (i.pricePerHead||0), 0);
    this.estimatedTotal    = parseFloat((this.totalPricePerHead * this.guestCount).toFixed(2));
    this.discountAmount    = parseFloat(((this.estimatedTotal * this.discountPercentage) / 100).toFixed(2));
    this.discountedTotal   = parseFloat((this.estimatedTotal - this.discountAmount).toFixed(2));
    next();
  } catch (e) { next(e); }
});
module.exports = mongoose.model("CateringOrder", cateringOrderSchema);
""")

w("models/Expense.js", """
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
""")

w("models/Worker.js", """
const mongoose = require("mongoose");
const workerSchema = new mongoose.Schema({
  name:     { type: String, required: [true,"Name required."], trim: true },
  type:     { type: String, required: [true,"Type required."],
              enum: { values: ["Permanent","PPD"], message: "Type must be Permanent or PPD." } },
  wageRate: { type: Number, required: [true,"Wage rate required."], min: 0 },
  phone:    { type: String, match: [/^\\d{4}-\\d{5}$/, "Phone must match XXXX-XXXXX."], default: "" },
  status:   { type: String, enum: { values: ["Active","Inactive","Terminated"], message: "Invalid status." }, default: "Active" },
  joiningDate: { type: Date, default: Date.now },
  notes:    { type: String, trim: true, default: "" },
}, { timestamps: true });
module.exports = mongoose.model("Worker", workerSchema);
""")

print("  Phase 1 models + config + middleware written.")

w("services/pricingService.js", """
"use strict";
const MenuPricing = require("../models/MenuPricing");

const PRICING_CONSTANTS = { HALL_ONLY_BASE: 500, AC_SURCHARGE: 100 };

const resolveMenuItems = async (menuItemIds = []) => {
  try {
    if (!menuItemIds || menuItemIds.length === 0) return [];
    const items = await MenuPricing.find({ _id: { $in: menuItemIds }, isActive: true })
      .select("dishName pricePerHead category");
    if (items.length !== menuItemIds.length) {
      const foundIds   = items.map((i) => i._id.toString());
      const missingIds = menuItemIds.filter((id) => !foundIds.includes(id.toString()));
      throw new Error("Menu items not found or inactive: [" + missingIds.join(", ") + "]");
    }
    return items.map((item) => ({ menuItem: item._id, dishName: item.dishName, pricePerHead: item.pricePerHead }));
  } catch (error) { throw new Error("Menu resolution failed: " + error.message); }
};

const calculatePricing = ({ hallType, guestCount, isAC=false, resolvedMenuItems=[], discountPercentage=0, customBasePerHead=null }) => {
  if (!hallType) throw new Error("hallType is required.");
  const guests = Number(guestCount);
  if (!guests || guests < 1) throw new Error("guestCount must be at least 1.");
  if (discountPercentage < 0 || discountPercentage > 100) throw new Error("discountPercentage must be 0-100.");

  const basePricePerHead = customBasePerHead !== null ? Number(customBasePerHead) : PRICING_CONSTANTS.HALL_ONLY_BASE;

  let cateringPricePerHead = 0;
  if (hallType === "Hall with Catering") {
    if (!resolvedMenuItems || resolvedMenuItems.length === 0)
      throw new Error("At least one menu item required for Hall with Catering.");
    cateringPricePerHead = resolvedMenuItems.reduce((sum, item) => sum + (item.pricePerHead || 0), 0);
  }

  const acChargePerHead = PRICING_CONSTANTS.AC_SURCHARGE;
  const acSurcharge     = isAC ? acChargePerHead : 0;
  const totalPerHead    = basePricePerHead + cateringPricePerHead + acSurcharge;
  const estimatedTotal  = parseFloat((totalPerHead * guests).toFixed(2));
  const discountAmount  = parseFloat(((estimatedTotal * discountPercentage) / 100).toFixed(2));
  const discountedTotal = parseFloat((estimatedTotal - discountAmount).toFixed(2));

  const breakdown = {
    packageLabel:   hallType === "Hall Only" ? "Hall Only Package (Rs.500/head)" : "Hall with Catering Package",
    menuItems:      resolvedMenuItems.map((m) => m.dishName + " - Rs." + m.pricePerHead + "/head"),
    baseCharge:     "Rs." + basePricePerHead + "/head x " + guests + " = Rs." + (basePricePerHead * guests),
    cateringCharge: hallType === "Hall with Catering"
      ? "Rs." + cateringPricePerHead + "/head x " + guests + " = Rs." + (cateringPricePerHead * guests)
      : "N/A",
    acCharge:        isAC ? "Rs." + acChargePerHead + "/head x " + guests + " = Rs." + (acSurcharge * guests) : "Not Selected",
    estimatedTotal:  "Rs." + estimatedTotal,
    discountGiven:   discountPercentage + "% = Rs." + discountAmount,
    discountedTotal: "Rs." + discountedTotal,
  };

  return { basePricePerHead, cateringPricePerHead, acChargePerHead, isAC,
    selectedMenuItems: resolvedMenuItems, discountPercentage,
    estimatedTotal, discountAmount, discountedTotal,
    totalPerHead, acSurcharge, guestCount: guests, breakdown };
};

const computeBookingPricing = async ({ hallType, guestCount, isAC=false, menuItemIds=[], discountPercentage=0, customBasePerHead=null }) => {
  try {
    const resolvedMenuItems = hallType === "Hall with Catering" ? await resolveMenuItems(menuItemIds) : [];
    return calculatePricing({ hallType, guestCount, isAC, resolvedMenuItems, discountPercentage, customBasePerHead });
  } catch (error) { throw new Error("Pricing computation failed: " + error.message); }
};

module.exports = { PRICING_CONSTANTS, resolveMenuItems, calculatePricing, computeBookingPricing };
""")

w("controllers/authController.js", """
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
""")

w("controllers/menuController.js", """
const MenuPricing = require("../models/MenuPricing");

const getAllMenuItems = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    const items = await MenuPricing.find(filter).sort({ category: 1, dishName: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("Get Menu Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch menu items.", error: error.message });
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuPricing.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found." });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch menu item.", error: error.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { dishName, category, pricePerHead, description } = req.body;
    if (!dishName || !category || pricePerHead === undefined)
      return res.status(400).json({ success: false, message: "dishName, category, pricePerHead required." });
    const existing = await MenuPricing.findOne({ dishName: dishName.trim() });
    if (existing) return res.status(400).json({ success: false, message: "Menu item already exists: " + dishName });
    const item = await MenuPricing.create({ dishName, category, pricePerHead, description });
    res.status(201).json({ success: true, message: "Menu item created.", data: item });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Failed to create menu item.", error: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuPricing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found." });
    res.status(200).json({ success: true, message: "Menu item updated. Price propagated globally.", data: item });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Failed to update menu item.", error: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuPricing.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found." });
    res.status(200).json({ success: true, message: "Menu item deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete menu item.", error: error.message });
  }
};

module.exports = { getAllMenuItems, getMenuItemById, createMenuItem, updateMenuItem, deleteMenuItem };
""")

print("  Phase 2 services + auth + menu controllers written.")

w("controllers/bookingController.js", """
"use strict";
const HallBooking               = require("../models/HallBooking");
const { computeBookingPricing } = require("../services/pricingService");

const PHONE_REGEX = /^\\d{4}-\\d{5}$/;
const toUTC = (d) => { const x=new Date(d); return new Date(Date.UTC(x.getFullYear(),x.getMonth(),x.getDate())); };
const findConflict = (bookingDate, shift, excludeId=null) => {
  const q = { bookingDate: toUTC(bookingDate), shift, status: { $ne: "Cancelled" } };
  if (excludeId) q._id = { $ne: excludeId };
  return HallBooking.findOne(q).select("clientName phone shift bookingDate status");
};

const getAllBookings = async (req, res) => {
  try {
    const { month, year, status, shift } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (shift)  filter.shift  = shift;
    if (month && year) {
      filter.bookingDate = { $gte: new Date(Date.UTC(+year,+month-1,1)), $lte: new Date(Date.UTC(+year,+month,0,23,59,59)) };
    } else if (year) {
      filter.bookingDate = { $gte: new Date(Date.UTC(+year,0,1)), $lte: new Date(Date.UTC(+year,11,31,23,59,59)) };
    }
    const bookings = await HallBooking.find(filter)
      .populate("selectedMenuItems.menuItem","dishName pricePerHead category")
      .sort({ bookingDate: -1, shift: 1 });
    res.status(200).json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    console.error("Get Bookings Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch bookings.", error: error.message });
  }
};

const getBookingById = async (req, res) => {
  try {
    const booking = await HallBooking.findById(req.params.id)
      .populate("selectedMenuItems.menuItem","dishName pricePerHead category");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found." });
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch booking.", error: error.message });
  }
};

const createBooking = async (req, res) => {
  try {
    const { clientName, phone, bookingDate, shift, hallType, guestCount,
            isAC=false, menuItemIds=[], discountPercentage=0, notes="" } = req.body;

    if (!clientName||!phone||!bookingDate||!shift||!hallType||!guestCount)
      return res.status(400).json({ success:false, message:"clientName, phone, bookingDate, shift, hallType, guestCount are required." });

    if (!PHONE_REGEX.test(phone))
      return res.status(400).json({ success:false, message:"Invalid phone. Required format: XXXX-XXXXX (e.g. 0333-1234567)" });

    if (!["Evening","Night"].includes(shift))
      return res.status(400).json({ success:false, message:"shift must be Evening (2-4 PM) or Night (6-10 PM)." });

    const conflict = await findConflict(bookingDate, shift);
    if (conflict) {
      return res.status(409).json({
        success:false,
        message: "The "+shift+" shift on "+new Date(bookingDate).toDateString()+" is already booked by '"+conflict.clientName+"' ("+conflict.phone+"). Cancel that booking first.",
        conflictingBooking: { id:conflict._id, clientName:conflict.clientName, phone:conflict.phone, shift:conflict.shift, bookingDate:conflict.bookingDate, status:conflict.status },
      });
    }

    let pricing;
    try {
      pricing = await computeBookingPricing({ hallType, guestCount:Number(guestCount), isAC:Boolean(isAC), menuItemIds, discountPercentage:Number(discountPercentage) });
    } catch (pErr) { return res.status(400).json({ success:false, message:pErr.message }); }

    const booking = await HallBooking.create({
      clientName, phone, bookingDate:toUTC(bookingDate), shift, hallType,
      guestCount:pricing.guestCount, isAC:pricing.isAC,
      basePricePerHead:pricing.basePricePerHead, acChargePerHead:pricing.acChargePerHead,
      selectedMenuItems:pricing.selectedMenuItems, cateringPricePerHead:pricing.cateringPricePerHead,
      discountPercentage:pricing.discountPercentage, estimatedTotal:pricing.estimatedTotal,
      discountAmount:pricing.discountAmount, discountedTotal:pricing.discountedTotal, notes,
    });
    res.status(201).json({ success:true, message:"Booking created successfully.", data:booking, billing:pricing.breakdown });
  } catch (error) {
    console.error("Create Booking Error:", error.message);
    if (error.code===11000) return res.status(409).json({ success:false, message:"Date and shift already booked." });
    if (error.name==="ValidationError") return res.status(400).json({ success:false, message:error.message });
    res.status(500).json({ success:false, message:"Failed to create booking.", error:error.message });
  }
};

const updateBooking = async (req, res) => {
  try {
    const booking = await HallBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found." });
    if (booking.status==="Cancelled") return res.status(400).json({ success:false, message:"Cannot update a cancelled booking." });

    const { clientName,phone,bookingDate,shift,hallType,guestCount,isAC,menuItemIds,discountPercentage,notes,status } = req.body;
    const incomingPhone = phone || booking.phone;
    if (!PHONE_REGEX.test(incomingPhone))
      return res.status(400).json({ success:false, message:"Invalid phone format. Required: XXXX-XXXXX" });

    const newDate  = bookingDate ? toUTC(bookingDate) : booking.bookingDate;
    const newShift = shift || booking.shift;
    const dateChanged  = bookingDate && toUTC(bookingDate).getTime() !== booking.bookingDate.getTime();
    const shiftChanged = shift && shift !== booking.shift;

    if (dateChanged || shiftChanged) {
      const conflict = await findConflict(newDate, newShift, req.params.id);
      if (conflict)
        return res.status(409).json({ success:false, message:"The "+newShift+" shift on "+new Date(newDate).toDateString()+" is already booked by '"+conflict.clientName+"'.",
          conflictingBooking:{id:conflict._id,clientName:conflict.clientName,shift:conflict.shift,bookingDate:conflict.bookingDate} });
    }

    const pricingChanged = hallType||guestCount!==undefined||isAC!==undefined||menuItemIds||discountPercentage!==undefined;
    let pricingBreakdown = null;
    if (pricingChanged) {
      let pricing;
      try {
        pricing = await computeBookingPricing({
          hallType:           hallType||booking.hallType,
          guestCount:         Number(guestCount??booking.guestCount),
          isAC:               isAC!==undefined?Boolean(isAC):booking.isAC,
          menuItemIds:        menuItemIds||booking.selectedMenuItems.map((m)=>m.menuItem),
          discountPercentage: Number(discountPercentage??booking.discountPercentage),
        });
      } catch (pErr) { return res.status(400).json({ success:false, message:pErr.message }); }
      booking.hallType=hallType||booking.hallType;
      booking.guestCount=pricing.guestCount; booking.isAC=pricing.isAC;
      booking.basePricePerHead=pricing.basePricePerHead; booking.acChargePerHead=pricing.acChargePerHead;
      booking.selectedMenuItems=pricing.selectedMenuItems; booking.cateringPricePerHead=pricing.cateringPricePerHead;
      booking.discountPercentage=pricing.discountPercentage; booking.estimatedTotal=pricing.estimatedTotal;
      booking.discountAmount=pricing.discountAmount; booking.discountedTotal=pricing.discountedTotal;
      pricingBreakdown=pricing.breakdown;
    }
    if (clientName) booking.clientName=clientName;
    if (phone)      booking.phone=phone;
    if (bookingDate) booking.bookingDate=newDate;
    if (shift)      booking.shift=newShift;
    if (notes!==undefined) booking.notes=notes;
    if (status)     booking.status=status;
    await booking.save();
    res.status(200).json({ success:true, message:"Booking updated.", data:booking, billing:pricingBreakdown });
  } catch (error) {
    console.error("Update Booking Error:", error.message);
    if (error.name==="ValidationError") return res.status(400).json({ success:false, message:error.message });
    res.status(500).json({ success:false, message:"Failed to update booking.", error:error.message });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await HallBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found." });
    if (booking.status==="Cancelled") return res.status(400).json({ success:false, message:"Already cancelled." });
    booking.status="Cancelled";
    await booking.save();
    res.status(200).json({ success:true, message:"Booking for '"+booking.clientName+"' ("+booking.shift+" shift) cancelled. Slot is now available." });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to cancel booking.", error:error.message });
  }
};

const getCalendarData = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month||!year) return res.status(400).json({ success:false, message:"month and year required." });
    const m=Number(month), y=Number(year);
    const bookings = await HallBooking.find({
      bookingDate: { $gte:new Date(Date.UTC(y,m-1,1)), $lte:new Date(Date.UTC(y,m,0,23,59,59)) },
      status: { $ne:"Cancelled" },
    }).select("bookingDate shift clientName status discountedTotal guestCount");
    const calendarMap = {};
    bookings.forEach((b) => {
      const key = b.bookingDate.toISOString().split("T")[0];
      if (!calendarMap[key]) calendarMap[key]={ bookings:[] };
      calendarMap[key].bookings.push({ id:b._id, shift:b.shift, clientName:b.clientName,
        status:b.status, discountedTotal:b.discountedTotal, guestCount:b.guestCount });
    });
    Object.keys(calendarMap).forEach((key) => {
      calendarMap[key].highlight = calendarMap[key].bookings.length>=2 ? "dark-green" : "light-green";
    });
    res.status(200).json({ success:true, data:calendarMap });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to fetch calendar data.", error:error.message });
  }
};

const checkAvailability = async (req, res) => {
  try {
    const { date, shift } = req.query;
    if (!date||!shift) return res.status(400).json({ success:false, message:"date and shift required." });
    if (!["Evening","Night"].includes(shift)) return res.status(400).json({ success:false, message:"shift must be Evening or Night." });
    const conflict = await findConflict(date, shift);
    if (conflict) {
      return res.status(200).json({ success:true, available:false,
        message:"The "+shift+" shift on "+new Date(date).toDateString()+" is OCCUPIED.",
        booking:{ id:conflict._id, clientName:conflict.clientName, phone:conflict.phone, shift:conflict.shift, bookingDate:conflict.bookingDate, status:conflict.status } });
    }
    res.status(200).json({ success:true, available:true, message:"The "+shift+" shift on "+new Date(date).toDateString()+" is AVAILABLE." });
  } catch (error) {
    res.status(500).json({ success:false, message:"Failed to check availability.", error:error.message });
  }
};

const getPricingPreview = async (req, res) => {
  try {
    const { hallType, guestCount, isAC=false, menuItemIds=[], discountPercentage=0 } = req.body;
    if (!hallType||!guestCount) return res.status(400).json({ success:false, message:"hallType and guestCount required." });
    const pricing = await computeBookingPricing({ hallType, guestCount:Number(guestCount), isAC:Boolean(isAC), menuItemIds, discountPercentage:Number(discountPercentage) });
    res.status(200).json({ success:true, message:"Pricing preview calculated.",
      pricing:{ basePricePerHead:pricing.basePricePerHead, cateringPricePerHead:pricing.cateringPricePerHead,
        acSurcharge:pricing.acSurcharge, totalPerHead:pricing.totalPerHead, guestCount:pricing.guestCount,
        estimatedTotal:pricing.estimatedTotal, discountPercentage:pricing.discountPercentage,
        discountAmount:pricing.discountAmount, discountedTotal:pricing.discountedTotal,
        selectedMenuItems:pricing.selectedMenuItems, breakdown:pricing.breakdown } });
  } catch (error) {
    res.status(400).json({ success:false, message:error.message });
  }
};

module.exports = { getAllBookings, getBookingById, createBooking, updateBooking, deleteBooking, getCalendarData, checkAvailability, getPricingPreview };
""")

print("  Booking controller (Phase 2) written.")

w("controllers/cateringController.js", """
const CateringOrder = require("../models/CateringOrder");
const getAllOrders = async (req,res) => {
  try {
    const {status}=req.query; const filter={}; if(status) filter.status=status;
    const orders = await CateringOrder.find(filter).populate("selectedMenuItems.menuItem","dishName pricePerHead category").sort({eventDate:-1});
    res.status(200).json({success:true,count:orders.length,data:orders});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch orders.",error:error.message});}
};
const getOrderById = async (req,res) => {
  try {
    const order = await CateringOrder.findById(req.params.id).populate("selectedMenuItems.menuItem","dishName pricePerHead category");
    if(!order) return res.status(404).json({success:false,message:"Catering order not found."});
    res.status(200).json({success:true,data:order});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch order.",error:error.message});}
};
const createOrder = async (req,res) => {
  try {
    const order = await CateringOrder.create(req.body);
    res.status(201).json({success:true,message:"Catering order created.",data:order});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to create order.",error:error.message});
  }
};
const updateOrder = async (req,res) => {
  try {
    const order = await CateringOrder.findById(req.params.id);
    if(!order) return res.status(404).json({success:false,message:"Catering order not found."});
    Object.assign(order,req.body); await order.save();
    res.status(200).json({success:true,message:"Order updated.",data:order});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to update order.",error:error.message});
  }
};
const deleteOrder = async (req,res) => {
  try {
    const order = await CateringOrder.findByIdAndDelete(req.params.id);
    if(!order) return res.status(404).json({success:false,message:"Catering order not found."});
    res.status(200).json({success:true,message:"Catering order deleted."});
  } catch(error){res.status(500).json({success:false,message:"Failed to delete order.",error:error.message});}
};
module.exports = {getAllOrders,getOrderById,createOrder,updateOrder,deleteOrder};
""")

w("controllers/expenseController.js", """
const Expense = require("../models/Expense");
const dateRange = (month,year) => month&&year
  ? {$gte:new Date(Date.UTC(+year,+month-1,1)),$lte:new Date(Date.UTC(+year,+month,0,23,59,59))}
  : year ? {$gte:new Date(Date.UTC(+year,0,1)),$lte:new Date(Date.UTC(+year,11,31,23,59,59))} : null;

const getAllExpenses = async (req,res) => {
  try {
    const {month,year,category}=req.query; const filter={}; if(category) filter.category=category;
    const r=dateRange(month,year); if(r) filter.expenseDate=r;
    const expenses = await Expense.find(filter).populate("worker","name type wageRate").sort({expenseDate:-1});
    const total = expenses.reduce((s,e)=>s+e.amount,0);
    res.status(200).json({success:true,count:expenses.length,total,data:expenses});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch expenses.",error:error.message});}
};
const getExpenseById = async (req,res) => {
  try {
    const expense=await Expense.findById(req.params.id).populate("worker","name type wageRate");
    if(!expense) return res.status(404).json({success:false,message:"Expense not found."});
    res.status(200).json({success:true,data:expense});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch expense.",error:error.message});}
};
const createExpense = async (req,res) => {
  try {
    const expense=await Expense.create(req.body);
    res.status(201).json({success:true,message:"Expense recorded.",data:expense});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to create expense.",error:error.message});
  }
};
const updateExpense = async (req,res) => {
  try {
    const expense=await Expense.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
    if(!expense) return res.status(404).json({success:false,message:"Expense not found."});
    res.status(200).json({success:true,message:"Expense updated.",data:expense});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to update expense.",error:error.message});
  }
};
const deleteExpense = async (req,res) => {
  try {
    const expense=await Expense.findByIdAndDelete(req.params.id);
    if(!expense) return res.status(404).json({success:false,message:"Expense not found."});
    res.status(200).json({success:true,message:"Expense deleted."});
  } catch(error){res.status(500).json({success:false,message:"Failed to delete expense.",error:error.message});}
};
const getExpenseSummary = async (req,res) => {
  try {
    const {month,year}=req.query; const matchFilter={}; const r=dateRange(month,year); if(r) matchFilter.expenseDate=r;
    const summary=await Expense.aggregate([{$match:matchFilter},{$group:{_id:"$category",total:{$sum:"$amount"},count:{$sum:1}}},{$sort:{total:-1}}]);
    const grandTotal=summary.reduce((s,i)=>s+i.total,0);
    res.status(200).json({success:true,grandTotal,data:summary});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch summary.",error:error.message});}
};
module.exports = {getAllExpenses,getExpenseById,createExpense,updateExpense,deleteExpense,getExpenseSummary};
""")

w("controllers/workerController.js", """
const Worker = require("../models/Worker");
const getAllWorkers = async (req,res) => {
  try {
    const {type,status}=req.query; const filter={}; if(type) filter.type=type; if(status) filter.status=status;
    const workers=await Worker.find(filter).sort({name:1});
    res.status(200).json({success:true,count:workers.length,data:workers});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch workers.",error:error.message});}
};
const getWorkerById = async (req,res) => {
  try {
    const worker=await Worker.findById(req.params.id);
    if(!worker) return res.status(404).json({success:false,message:"Worker not found."});
    res.status(200).json({success:true,data:worker});
  } catch(error){res.status(500).json({success:false,message:"Failed to fetch worker.",error:error.message});}
};
const createWorker = async (req,res) => {
  try {
    const worker=await Worker.create(req.body);
    res.status(201).json({success:true,message:"Worker added.",data:worker});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to add worker.",error:error.message});
  }
};
const updateWorker = async (req,res) => {
  try {
    const worker=await Worker.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true});
    if(!worker) return res.status(404).json({success:false,message:"Worker not found."});
    res.status(200).json({success:true,message:"Worker updated.",data:worker});
  } catch(error){
    if(error.name==="ValidationError") return res.status(400).json({success:false,message:error.message});
    res.status(500).json({success:false,message:"Failed to update worker.",error:error.message});
  }
};
const deleteWorker = async (req,res) => {
  try {
    const worker=await Worker.findById(req.params.id);
    if(!worker) return res.status(404).json({success:false,message:"Worker not found."});
    worker.status="Terminated"; await worker.save();
    res.status(200).json({success:true,message:"Worker terminated (soft delete — history preserved)."});
  } catch(error){res.status(500).json({success:false,message:"Failed to terminate worker.",error:error.message});}
};
module.exports = {getAllWorkers,getWorkerById,createWorker,updateWorker,deleteWorker};
""")

w("routes/authRoutes.js", """
const express=require("express"); const router=express.Router();
const {loginAdmin,getMe}=require("../controllers/authController");
const {protect}=require("../middleware/authMiddleware");
router.post("/login",loginAdmin);
router.get("/me",protect,getMe);
module.exports=router;
""")

w("routes/menuRoutes.js", """
const express=require("express"); const router=express.Router();
const {getAllMenuItems,getMenuItemById,createMenuItem,updateMenuItem,deleteMenuItem}=require("../controllers/menuController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.route("/").get(getAllMenuItems).post(createMenuItem);
router.route("/:id").get(getMenuItemById).put(updateMenuItem).delete(deleteMenuItem);
module.exports=router;
""")

w("routes/bookingRoutes.js", """
const express=require("express"); const router=express.Router();
const {getAllBookings,getBookingById,createBooking,updateBooking,deleteBooking,getCalendarData,checkAvailability,getPricingPreview}=require("../controllers/bookingController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.get("/calendar",getCalendarData);
router.get("/availability",checkAvailability);
router.post("/pricing-preview",getPricingPreview);
router.route("/").get(getAllBookings).post(createBooking);
router.route("/:id").get(getBookingById).put(updateBooking).delete(deleteBooking);
module.exports=router;
""")

w("routes/cateringRoutes.js", """
const express=require("express"); const router=express.Router();
const {getAllOrders,getOrderById,createOrder,updateOrder,deleteOrder}=require("../controllers/cateringController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.route("/").get(getAllOrders).post(createOrder);
router.route("/:id").get(getOrderById).put(updateOrder).delete(deleteOrder);
module.exports=router;
""")

w("routes/expenseRoutes.js", """
const express=require("express"); const router=express.Router();
const {getAllExpenses,getExpenseById,createExpense,updateExpense,deleteExpense,getExpenseSummary}=require("../controllers/expenseController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.get("/summary",getExpenseSummary);
router.route("/").get(getAllExpenses).post(createExpense);
router.route("/:id").get(getExpenseById).put(updateExpense).delete(deleteExpense);
module.exports=router;
""")

w("routes/workerRoutes.js", """
const express=require("express"); const router=express.Router();
const {getAllWorkers,getWorkerById,createWorker,updateWorker,deleteWorker}=require("../controllers/workerController");
const {protect}=require("../middleware/authMiddleware");
router.use(protect);
router.route("/").get(getAllWorkers).post(createWorker);
router.route("/:id").get(getWorkerById).put(updateWorker).delete(deleteWorker);
module.exports=router;
""")

w("scripts/seed.js", """
const path=require("path");
require("dotenv").config({path:path.join(__dirname,"../.env")});
const mongoose=require("mongoose");
const Admin=require("../models/Admin");
const MenuPricing=require("../models/MenuPricing");

const DEFAULT_ADMIN={name:"MHMS Admin",email:"admin@mhms.com",password:"Admin@1234"};
const DEFAULT_MENU=[
  {dishName:"Chicken Biryani",     category:"Rice",  pricePerHead:350,description:"Aromatic basmati rice with tender chicken"},
  {dishName:"Zarda Chawal",        category:"Rice",  pricePerHead:150,description:"Sweet saffron rice with dry fruits"},
  {dishName:"Gurr Waly Chawal",    category:"Rice",  pricePerHead:120,description:"Jaggery-flavored sweet rice"},
  {dishName:"Chana Pulao",         category:"Rice",  pricePerHead:200,description:"Fragrant rice with chickpeas"},
  {dishName:"Beef Salan",          category:"Curry", pricePerHead:400,description:"Rich slow-cooked beef curry"},
  {dishName:"Chicken Qorma Salan", category:"Curry", pricePerHead:350,description:"Creamy chicken qorma"},
  {dishName:"Simple Chicken Salan",category:"Curry", pricePerHead:250,description:"Classic homestyle chicken curry"},
];

const seedDB=async()=>{
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected. Seeding...");
    const existingAdmin=await Admin.findOne({email:DEFAULT_ADMIN.email});
    if(existingAdmin){console.log("Admin already exists. Skipping.");}
    else{await Admin.create(DEFAULT_ADMIN);console.log("Admin created: "+DEFAULT_ADMIN.email+" / "+DEFAULT_ADMIN.password);}
    let created=0,skipped=0;
    for(const item of DEFAULT_MENU){
      const exists=await MenuPricing.findOne({dishName:item.dishName});
      if(exists){skipped++;continue;}
      await MenuPricing.create(item);
      console.log("Seeded: "+item.dishName+" - Rs."+item.pricePerHead+"/head");
      created++;
    }
    console.log("Done. Created:"+created+" Skipped:"+skipped);
    process.exit(0);
  } catch(error){console.error("Seed Error:",error.message);process.exit(1);}
};
seedDB();
""")

w("server.js", """
"use strict";
const path=require("path");
require("dotenv").config({path:path.join(__dirname,".env")});
const express=require("express");
const cors=require("cors");
const connectDB=require("./config/db");
const {notFound,errorHandler}=require("./middleware/errorMiddleware");
const authRoutes    =require("./routes/authRoutes");
const menuRoutes    =require("./routes/menuRoutes");
const bookingRoutes =require("./routes/bookingRoutes");
const cateringRoutes=require("./routes/cateringRoutes");
const expenseRoutes =require("./routes/expenseRoutes");
const workerRoutes  =require("./routes/workerRoutes");

connectDB();
const app=express();

const allowedOrigins=["http://localhost:5173","http://localhost:3000",process.env.CLIENT_URL].filter(Boolean);
app.use(cors({
  origin:(origin,cb)=>{ if(!origin||allowedOrigins.includes(origin)) return cb(null,true); cb(new Error("CORS: "+origin+" not allowed.")); },
  credentials:true, methods:["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders:["Content-Type","Authorization"],
}));
app.use(express.json({limit:"10mb"}));
app.use(express.urlencoded({extended:true,limit:"10mb"}));

app.get("/api/health",(_req,res)=>res.status(200).json({success:true,message:"MHMS API running.",environment:process.env.NODE_ENV,timestamp:new Date().toISOString()}));

app.use("/api/auth",    authRoutes);
app.use("/api/menu",    menuRoutes);
app.use("/api/bookings",bookingRoutes);
app.use("/api/catering",cateringRoutes);
app.use("/api/expenses",expenseRoutes);
app.use("/api/workers", workerRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT=process.env.PORT||5000;
app.listen(PORT,()=>console.log("MHMS Server running in "+process.env.NODE_ENV+" mode on port "+PORT));
module.exports=app;
""")

print("\n" + "="*50)
print("  MHMS Phase 1 + Phase 2  COMPLETE")
print("  All files written. Run: npm run dev")
print("  Seed DB with: npm run seed")
print("="*50 + "\n")

# ════════════════════════════════════════════════════════════════════
# PHASE 3  -  Expense Tracking & Team/Employee Management
# ════════════════════════════════════════════════════════════════════
print("\n--- Writing Phase 3 files ---")
