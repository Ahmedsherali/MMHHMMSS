/**
 * MHMS Phase 2 Walkthrough DOCX Generator
 * Run: node scripts/generatePhase2Doc.js
 * Output: d:\PROJECT\SYSTEM\walkthrough_phase2.docx
 */
"use strict";
const path = require("path");
const fs   = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, UnderlineType,
} = require("docx");

const OUT = path.join(__dirname, "../walkthrough_phase2.docx");

// ── Helpers ───────────────────────────────────────────────────────
const h1 = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  run: { bold: true, color: "1F4E79" },
});

const h2 = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
  run: { bold: true, color: "2E75B6" },
});

const h3 = (text) => new Paragraph({
  text, heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
  run: { bold: true, color: "2F5496" },
});

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, ...opts })],
  spacing: { after: 120 },
});

const bullet = (text) => new Paragraph({
  children: [new TextRun({ text, size: 22 })],
  bullet: { level: 0 },
  spacing: { after: 80 },
});

const code = (text) => new Paragraph({
  children: [new TextRun({ text, font: "Courier New", size: 18, color: "C7254E" })],
  shading: { type: ShadingType.SOLID, color: "F5F5F5" },
  spacing: { after: 80 },
  indent: { left: 360 },
});

const divider = () => new Paragraph({
  children: [new TextRun({ text: "─".repeat(80), color: "CCCCCC", size: 18 })],
  spacing: { before: 200, after: 200 },
});

const tableRow = (cells, isHeader = false) => new TableRow({
  children: cells.map((c) =>
    new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: c, bold: isHeader, size: isHeader ? 20 : 18, color: isHeader ? "FFFFFF" : "000000" })],
        alignment: AlignmentType.LEFT,
      })],
      shading: isHeader ? { type: ShadingType.SOLID, color: "2E75B6" } : undefined,
      width: { size: Math.floor(10000 / cells.length), type: WidthType.DXA },
    })
  ),
});

const apiTable = (rows) => new Table({
  width: { size: 9500, type: WidthType.DXA },
  rows: [
    tableRow(["Method", "Endpoint", "Auth", "Description"], true),
    ...rows.map((r) => tableRow(r)),
  ],
  borders: {
    top:    { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left:   { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right:  { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    insideH:{ style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    insideV:{ style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  },
});

// ── Document ──────────────────────────────────────────────────────
const doc = new Document({
  creator: "MHMS Project",
  title: "MHMS Phase 2 Walkthrough",
  description: "Core Booking Engine & Business Logic",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22 },
      },
    },
  },
  sections: [{
    properties: {},
    children: [

      // ── Title Page ─────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: "MHMS — Marriage Hall Management System", bold: true, size: 52, color: "1F4E79" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 800, after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Phase 2: Core Booking Engine & Business Logic", bold: true, size: 36, color: "2E75B6" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Technical Walkthrough Document", size: 26, italics: true, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "Date: " + new Date().toLocaleDateString("en-PK"), size: 22, color: "888888" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),

      divider(),

      // ── Section 1: Overview ────────────────────────────────────
      h1("1. Phase 2 Overview"),
      p("Phase 2 of the MHMS backend extends the foundational Phase 1 structure by implementing the complete Hall Booking business engine. It introduces a dedicated Pricing Service, strict collision detection, dynamic billing computation, and three specialized endpoints that power the booking form UI.", {}),
      p("All pricing computations are fully automatic — the admin cannot manually override totals. Every amount is derived from the Pricing Engine, ensuring business rule consistency.", {}),

      divider(),

      // ── Section 2: Files Created/Modified ─────────────────────
      h1("2. Files Created / Modified"),
      h2("2.1 New File"),
      code("services/pricingService.js"),
      p("The central Pricing Engine for MHMS. Contains three exported functions:", {}),
      bullet("resolveMenuItems(menuItemIds[]) — fetches live menu prices from MongoDB by ID array."),
      bullet("calculatePricing({...}) — pure function: computes all billing amounts from resolved menu items."),
      bullet("computeBookingPricing({...}) — full async pipeline combining DB lookup + calculation."),

      h2("2.2 Enhanced File"),
      code("controllers/bookingController.js"),
      p("Completely rewritten in Phase 2 with the following additions:", {}),
      bullet("Phone regex guard (\\d{4}-\\d{5}) applied on both create and update."),
      bullet("Collision detection via findConflict() helper — 409 Conflict with full conflict details."),
      bullet("Pricing Engine integration — no manual price fields accepted from client."),
      bullet("AC surcharge toggle (+100 Rs/head) handled by pricingService."),
      bullet("Discount % applied → absolute discountAmount → final discountedTotal."),
      bullet("Three new endpoints: /calendar, /availability, /pricing-preview."),

      h2("2.3 Enhanced File"),
      code("routes/bookingRoutes.js"),
      p("Updated to wire three new Phase 2 endpoints before the /:id param route to prevent Express route conflicts:", {}),
      bullet("GET  /api/bookings/calendar"),
      bullet("GET  /api/bookings/availability"),
      bullet("POST /api/bookings/pricing-preview"),

      divider(),

      // ── Section 3: Pricing Engine ──────────────────────────────
      h1("3. Pricing Engine — services/pricingService.js"),

      h2("3.1 Business Constants"),
      new Table({
        width: { size: 6000, type: WidthType.DXA },
        rows: [
          tableRow(["Constant", "Value", "Purpose"], true),
          tableRow(["HALL_ONLY_BASE", "500 Rs/head", "Default base for Hall Only package"]),
          tableRow(["AC_SURCHARGE",   "100 Rs/head", "Added when isAC toggle is ON"]),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),

      h2("3.2 Pricing Formula"),
      p("The billing calculation follows this exact sequence — no step can be skipped or manually overridden:", {}),
      code("cateringPricePerHead = SUM(selectedMenuItems[].pricePerHead)   // 0 if Hall Only"),
      code("acSurcharge          = isAC ? 100 : 0"),
      code("totalPerHead         = basePricePerHead + cateringPricePerHead + acSurcharge"),
      code("estimatedTotal       = totalPerHead * guestCount"),
      code("discountAmount       = estimatedTotal * (discountPercentage / 100)"),
      code("discountedTotal      = estimatedTotal - discountAmount"),

      h2("3.3 Package Examples"),
      new Table({
        width: { size: 9500, type: WidthType.DXA },
        rows: [
          tableRow(["Package", "Menu Selection", "Guests", "AC", "Discount", "Estimated Total", "Discounted Total"], true),
          tableRow(["Hall Only",        "None",                              "200", "No",  "0%",  "Rs. 100,000", "Rs. 100,000"]),
          tableRow(["Hall Only",        "None",                              "200", "Yes", "0%",  "Rs. 120,000", "Rs. 120,000"]),
          tableRow(["Hall+Catering",    "Chicken Biryani + Chicken Qorma",  "200", "No",  "0%",  "Rs. 200,000", "Rs. 200,000"]),
          tableRow(["Hall+Catering",    "Chicken Biryani + Beef Salan",     "200", "No",  "10%", "Rs. 230,000", "Rs. 207,000"]),
          tableRow(["Hall+Catering",    "Chana Pulao + Simple Chicken",     "150", "Yes", "5%",  "Rs. 127,500", "Rs. 121,125"]),
        ],
      }),

      new Paragraph({ spacing: { after: 200 } }),

      divider(),

      // ── Section 4: Collision Detection ────────────────────────
      h1("4. Booking Collision Detection"),
      p("MHMS enforces a strict one-booking-per-slot rule. A 'slot' is the combination of bookingDate + shift.", {}),

      h2("4.1 Database Index"),
      code("hallBookingSchema.index("),
      code("  { bookingDate: 1, shift: 1 },"),
      code("  { unique: true, partialFilterExpression: { status: { $ne: 'Cancelled' } } }"),
      code(");"),
      p("The partial filter means cancelled bookings are excluded from the uniqueness constraint — enabling re-use of cancelled slots without permanently blocking them.", {}),

      h2("4.2 Controller Guard (findConflict helper)"),
      p("Before inserting or updating, the controller runs an explicit Mongoose query to detect conflicts:", {}),
      bullet("Returns the conflicting booking's id, clientName, phone, shift, bookingDate, status."),
      bullet("Responds with HTTP 409 Conflict and a human-readable message."),
      bullet("On update, excludes the booking being edited from the conflict check (using $ne on _id)."),
      bullet("Double-fail-safe: both the explicit check AND the DB unique index will catch duplicates."),

      h2("4.3 Cancel-to-Rebook Flow"),
      p("The only way to re-use an occupied slot is to cancel the existing booking first:", {}),
      bullet("DELETE /api/bookings/:id  → sets status = 'Cancelled' (soft delete)."),
      bullet("Soft delete preserves the booking record for auditing and revenue reporting."),
      bullet("Once cancelled, the slot is immediately available for a new booking."),

      divider(),

      // ── Section 5: Phone Validation ────────────────────────────
      h1("5. Phone Number Validation"),
      p("Phone numbers are validated at two layers, ensuring no malformed data enters the system:", {}),
      h2("5.1 Mongoose Schema Level"),
      code('match: [/^\\d{4}-\\d{5}$/, "Phone must match XXXX-XXXXX (e.g. 0300-1234567)."]'),
      p("Applied on: HallBooking, CateringOrder, Worker models.", {}),
      h2("5.2 Controller Level"),
      code("const PHONE_REGEX = /^\\d{4}-\\d{5}$/;"),
      code("if (!PHONE_REGEX.test(phone)) return res.status(400)..."),
      p("The controller guard runs before any DB operation, returning a clear 400 Bad Request if the format is wrong. Valid examples: 0300-1234567, 0333-9876543, 0311-1122334.", {}),

      divider(),

      // ── Section 6: API Endpoints ───────────────────────────────
      h1("6. Phase 2 API Endpoints"),

      h2("6.1 All Booking Endpoints"),
      apiTable([
        ["GET",    "/api/bookings",                   "JWT", "List bookings (filter: month, year, status, shift)"],
        ["POST",   "/api/bookings",                   "JWT", "Create booking — runs collision check + pricing engine"],
        ["GET",    "/api/bookings/:id",               "JWT", "Get single booking with populated menu items"],
        ["PUT",    "/api/bookings/:id",               "JWT", "Update booking — re-checks collision + re-computes pricing"],
        ["DELETE", "/api/bookings/:id",               "JWT", "Soft-cancel booking — frees slot for re-booking"],
        ["GET",    "/api/bookings/calendar",          "JWT", "Calendar map (month+year) with highlight colours"],
        ["GET",    "/api/bookings/availability",      "JWT", "Check if date+shift slot is free or occupied"],
        ["POST",   "/api/bookings/pricing-preview",   "JWT", "Live billing preview without saving"],
      ]),

      new Paragraph({ spacing: { after: 200 } }),

      h2("6.2 Pricing Preview Endpoint"),
      p("POST /api/bookings/pricing-preview accepts:", {}),
      code('{ "hallType": "Hall with Catering", "guestCount": 200, "isAC": true, "menuItemIds": ["<id1>","<id2>"], "discountPercentage": 10 }'),
      p("Returns the complete billing breakdown without writing to the database. The front-end uses this for live form price display as the admin fills in details.", {}),

      h2("6.3 Availability Check Endpoint"),
      p("GET /api/bookings/availability?date=2026-12-25&shift=Evening", {}),
      p("Returns available: true/false. If occupied, returns the conflicting booking's details so the UI can show which client has that slot.", {}),

      h2("6.4 Calendar Endpoint"),
      p("GET /api/bookings/calendar?month=12&year=2026", {}),
      p("Returns a date-keyed JSON object. Each date entry contains bookings and a highlight colour:", {}),
      bullet("light-green — 1 booking on that date (one shift booked, one free)"),
      bullet("dark-green  — 2 bookings on that date (both Evening and Night booked — full day)"),

      divider(),

      // ── Section 7: Error Handling ──────────────────────────────
      h1("7. Error Handling & HTTP Status Codes"),
      new Table({
        width: { size: 9500, type: WidthType.DXA },
        rows: [
          tableRow(["Status Code", "Scenario", "Handler"], true),
          tableRow(["200 OK",           "Successful read / availability check",    "Controller"]),
          tableRow(["201 Created",      "Booking / resource created",              "Controller"]),
          tableRow(["400 Bad Request",  "Missing fields, invalid phone, pricing error", "Controller guard"]),
          tableRow(["401 Unauthorized", "Missing/invalid/expired JWT",             "authMiddleware"]),
          tableRow(["404 Not Found",    "Booking / resource ID not found",         "Controller"]),
          tableRow(["409 Conflict",     "Slot already booked (collision)",         "findConflict() + DB index"]),
          tableRow(["500 Server Error", "Unhandled DB / runtime errors",           "try/catch + errorMiddleware"]),
        ],
      }),
      new Paragraph({ spacing: { after: 200 } }),
      p("Every controller function is wrapped in a try/catch block. Mongoose ValidationError is caught and returns 400. The global errorMiddleware catches any uncaught errors that propagate via next(error).", {}),

      divider(),

      // ── Section 8: Quick Start ─────────────────────────────────
      h1("8. Quick Start Guide"),
      h2("Step 1 — Configure Environment"),
      code("MONGO_URI=mongodb://localhost:27017/mhms"),
      code("JWT_SECRET=your_strong_secret_here"),
      code("PORT=5000"),
      h2("Step 2 — Seed the Database"),
      code("npm run seed"),
      p("Creates admin@mhms.com / Admin@1234 and 7 default menu items.", {}),
      h2("Step 3 — Start the Server"),
      code("npm run dev      # development with hot-reload"),
      code("npm start        # production"),
      h2("Step 4 — Login and Get JWT"),
      code('POST /api/auth/login'),
      code('Body: { "email": "admin@mhms.com", "password": "Admin@1234" }'),
      h2("Step 5 — Create a Booking"),
      code("POST /api/bookings"),
      code('Body: { "clientName": "Ali Khan", "phone": "0333-1234567",'),
      code('  "bookingDate": "2026-12-25", "shift": "Evening",'),
      code('  "hallType": "Hall with Catering", "guestCount": 200,'),
      code('  "isAC": true, "menuItemIds": ["<biryani_id>","<qorma_id>"],'),
      code('  "discountPercentage": 5 }'),

      divider(),

      // ── Footer ─────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: "MHMS  |  Phase 2 Complete  |  Generated " + new Date().toLocaleString("en-PK"), size: 18, color: "888888", italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUT, buffer);
  console.log("walkthrough_phase2.docx written to:", OUT);
}).catch((err) => {
  console.error("DOCX Error:", err.message);
  process.exit(1);
});
