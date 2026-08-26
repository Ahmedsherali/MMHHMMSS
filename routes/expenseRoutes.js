/**
 * MHMS Expense Routes  -  routes/expenseRoutes.js
 * -------------------------------------------------
 * CRITICAL ORDERING: Named routes (/summary, /monthly-trend)
 * are registered BEFORE /:id to prevent Express treating
 * string literals as MongoDB ObjectIDs.
 */

"use strict";

const express = require("express");
const router  = express.Router();
const {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getMonthlyTrend,
} = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");

// All expense routes require a valid JWT token
router.use(protect);

// ── Named endpoints FIRST (above /:id — prevents routing conflict) ──
router.get("/summary",        getExpenseSummary);  // GET /api/expenses/summary
router.get("/monthly-trend",  getMonthlyTrend);    // GET /api/expenses/monthly-trend

// ── Standard CRUD ──
router.route("/")
  .get(getAllExpenses)   // GET  /api/expenses
  .post(createExpense);  // POST /api/expenses

router.route("/:id")
  .get(getExpenseById)    // GET    /api/expenses/:id
  .put(updateExpense)     // PUT    /api/expenses/:id
  .delete(deleteExpense); // DELETE /api/expenses/:id

module.exports = router;
