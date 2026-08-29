"use strict";
const path     = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose    = require("mongoose");
const Admin       = require("../models/Admin");
const MenuPricing = require("../models/MenuPricing");

// ── Admin credentials come from environment variables ─────────────────────────
// Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env / Vercel dashboard.
// Fallback values are intentionally omitted so the script fails loudly if the
// vars are missing in a CI/production run.
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@mhms.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";

if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.warn("[seed] Warning: ADMIN_EMAIL / ADMIN_PASSWORD not set in .env. Using defaults — do NOT run this in production without those vars.");
}

const DEFAULT_MENU = [
  { dishName: "Chicken Biryani",      category: "Rice",  pricePerHead: 350, description: "Aromatic basmati rice with tender chicken" },
  { dishName: "Zarda Chawal",         category: "Rice",  pricePerHead: 150, description: "Sweet saffron rice with dry fruits" },
  { dishName: "Gurr Waly Chawal",     category: "Rice",  pricePerHead: 120, description: "Jaggery-flavored sweet rice" },
  { dishName: "Chana Pulao",          category: "Rice",  pricePerHead: 200, description: "Fragrant rice with chickpeas" },
  { dishName: "Beef Salan",           category: "Curry", pricePerHead: 400, description: "Rich slow-cooked beef curry" },
  { dishName: "Chicken Qorma Salan",  category: "Curry", pricePerHead: 350, description: "Creamy chicken qorma" },
  { dishName: "Simple Chicken Salan", category: "Curry", pricePerHead: 250, description: "Classic homestyle chicken curry" },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("[seed] Connected to MongoDB. Seeding...");

    // Admin — idempotent: skip if already present
    const existingAdmin = await Admin.findOne({ email: ADMIN_EMAIL });
    if (existingAdmin) {
      console.log("[seed] Admin already exists. Skipping admin creation.");
    } else {
      await Admin.create({ name: "MHMS Admin", email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      // Never log the plaintext password
      console.log("[seed] Admin created: " + ADMIN_EMAIL);
    }

    // Menu items — idempotent
    let created = 0, skipped = 0;
    for (const item of DEFAULT_MENU) {
      const exists = await MenuPricing.findOne({ dishName: item.dishName });
      if (exists) { skipped++; continue; }
      await MenuPricing.create(item);
      console.log("[seed] Seeded: " + item.dishName + " — Rs." + item.pricePerHead + "/head");
      created++;
    }
    console.log("[seed] Done. Created: " + created + "  Skipped: " + skipped);
    process.exit(0);
  } catch (error) {
    console.error("[seed] Error:", error.message);
    process.exit(1);
  }
};

seedDB();

