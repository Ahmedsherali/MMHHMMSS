"use strict";
const HallBooking               = require("../models/HallBooking");
const { computeBookingPricing } = require("../services/pricingService");

const PHONE_REGEX = /^\d{4}-\d{7}$/;
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
      return res.status(400).json({ success:false, message:"Invalid phone. Required format: XXXX-XXXXXXX (e.g. 0300-1234567)" });

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
      return res.status(400).json({ success:false, message:"Invalid phone format. Required: XXXX-XXXXXXX (e.g. 0300-1234567)" });

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
