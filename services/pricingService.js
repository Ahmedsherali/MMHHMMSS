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
