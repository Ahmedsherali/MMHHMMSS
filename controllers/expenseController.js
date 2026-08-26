/**
 * MHMS Expense Controller  -  controllers/expenseController.js
 * -------------------------------------------------------------
 * Phase 3: Full Expense Tracking.
 *
 * Endpoints (all protected by JWT):
 *   GET    /api/expenses                 list with filters
 *   POST   /api/expenses                 record new expense
 *   GET    /api/expenses/summary         aggregated totals per category
 *   GET    /api/expenses/monthly-trend   month-by-month totals for a year
 *   GET    /api/expenses/:id             single expense
 *   PUT    /api/expenses/:id             update expense
 *   DELETE /api/expenses/:id             hard delete
 */

"use strict";

const Expense = require("../models/Expense");
const Worker  = require("../models/Worker");

// Valid categories mirrors the Expense model enum exactly
const VALID_CATEGORIES = [
  "Electricity", "Gas", "Water",
  "Wear & Tear", "Manager Wages", "Worker Wages", "Other",
];

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// ── Helper: build a UTC date-range filter from month/year query params ──
const buildDateFilter = (month, year) => {
  if (month && year) {
    return {
      $gte: new Date(Date.UTC(+year, +month - 1, 1)),
      $lte: new Date(Date.UTC(+year, +month,     0, 23, 59, 59)),
    };
  }
  if (year) {
    return {
      $gte: new Date(Date.UTC(+year,  0,  1)),
      $lte: new Date(Date.UTC(+year, 11, 31, 23, 59, 59)),
    };
  }
  return null;
};

// ════════════════════════════════════════════════════════════════════
// GET /api/expenses
// Query: month, year, category
// ════════════════════════════════════════════════════════════════════
const getAllExpenses = async (req, res) => {
  try {
    const { month, year, category } = req.query;
    const filter = {};

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category. Valid values: " + VALID_CATEGORIES.join(", "),
        });
      }
      filter.category = category;
    }

    const dateFilter = buildDateFilter(month, year);
    if (dateFilter) filter.expenseDate = dateFilter;

    const expenses = await Expense.find(filter)
      .populate("worker", "name type wageRate phone status")
      .sort({ expenseDate: -1, createdAt: -1 });

    const total = parseFloat(
      expenses.reduce((sum, e) => sum + e.amount, 0).toFixed(2)
    );

    res.status(200).json({
      success: true,
      count:   expenses.length,
      total,
      filters: {
        month:    month    || null,
        year:     year     || null,
        category: category || null,
      },
      data: expenses,
    });
  } catch (error) {
    console.error("Get Expenses Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses.",
      error:   error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// GET /api/expenses/summary
// Aggregates total + count per category. Every category appears in
// the response even if it has zero entries (ensures consistent shape
// for the front-end dashboard cards).
// Query: month, year (optional)
// ════════════════════════════════════════════════════════════════════
const getExpenseSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const matchStage = {};
    const dateFilter  = buildDateFilter(month, year);
    if (dateFilter) matchStage.expenseDate = dateFilter;

    const rawSummary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id:   "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    // Map results for O(1) lookup
    const categoryMap = {};
    rawSummary.forEach((row) => {
      categoryMap[row._id] = {
        total: parseFloat(row.total.toFixed(2)),
        count: row.count,
      };
    });

    // Ensure every category appears (zero-fill missing ones)
    const fullSummary = VALID_CATEGORIES.map((cat) => ({
      category: cat,
      total:    categoryMap[cat] ? categoryMap[cat].total : 0,
      count:    categoryMap[cat] ? categoryMap[cat].count : 0,
    }));

    const grandTotal = parseFloat(
      fullSummary.reduce((sum, s) => sum + s.total, 0).toFixed(2)
    );

    res.status(200).json({
      success:    true,
      period:     { month: month || "All", year: year || "All" },
      grandTotal,
      categories: fullSummary,
    });
  } catch (error) {
    console.error("Expense Summary Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense summary.",
      error:   error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// GET /api/expenses/monthly-trend?year=2026
// Returns 12-month breakdown for a given year.
// Each month contains a total plus a per-category sub-total.
// Front-end uses this to render bar/line charts.
// ════════════════════════════════════════════════════════════════════
const getMonthlyTrend = async (req, res) => {
  try {
    const { year } = req.query;
    if (!year) {
      return res.status(400).json({
        success: false,
        message: "year query parameter is required (e.g. ?year=2026).",
      });
    }

    const startDate = new Date(Date.UTC(+year,  0,  1));
    const endDate   = new Date(Date.UTC(+year, 11, 31, 23, 59, 59));

    const rawTrend = await Expense.aggregate([
      { $match: { expenseDate: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: {
            month:    { $month: "$expenseDate" },
            category: "$category",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.month": 1 } },
    ]);

    // Build 12-month scaffold initialised to zero for each category
    const scaffold = MONTH_LABELS.map((label, idx) => {
      const entry = { month: label, monthNumber: idx + 1, total: 0 };
      VALID_CATEGORIES.forEach((cat) => { entry[cat] = 0; });
      return entry;
    });

    rawTrend.forEach(({ _id, total }) => {
      const entry = scaffold[_id.month - 1];
      if (entry && VALID_CATEGORIES.includes(_id.category)) {
        entry[_id.category] = parseFloat(total.toFixed(2));
        entry.total          = parseFloat((entry.total + total).toFixed(2));
      }
    });

    // Year-level summary
    const yearTotal = parseFloat(
      scaffold.reduce((sum, m) => sum + m.total, 0).toFixed(2)
    );
    const peakMonth = scaffold.reduce(
      (peak, m) => (m.total > peak.total ? m : peak),
      scaffold[0]
    );

    res.status(200).json({
      success:    true,
      year:       +year,
      yearTotal,
      peakMonth:  { month: peakMonth.month, total: peakMonth.total },
      data:       scaffold,
    });
  } catch (error) {
    console.error("Monthly Trend Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly trend.",
      error:   error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// GET /api/expenses/:id
// ════════════════════════════════════════════════════════════════════
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("worker", "name type wageRate phone status");
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }
    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    console.error("Get Expense Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expense.",
      error:   error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// POST /api/expenses
// Body: { category, amount, expenseDate, description?, worker? }
// ════════════════════════════════════════════════════════════════════
const createExpense = async (req, res) => {
  try {
    const { category, amount, expenseDate, description, worker } = req.body;

    // Required field guard
    if (!category || amount === undefined || amount === null || !expenseDate) {
      return res.status(400).json({
        success: false,
        message: "category, amount, and expenseDate are required.",
      });
    }

    // Category enum guard (controller-level for clear error messages)
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Valid values: " + VALID_CATEGORIES.join(", "),
      });
    }

    // Amount must be non-negative
    if (Number(amount) < 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount cannot be negative.",
      });
    }

    // If category is Worker Wages and a worker ref is provided, validate it exists
    if (category === "Worker Wages" && worker) {
      const workerDoc = await Worker.findById(worker).select("_id name status");
      if (!workerDoc) {
        return res.status(404).json({
          success: false,
          message: "Referenced worker not found. Verify the worker ID.",
        });
      }
      if (workerDoc.status === "Terminated") {
        return res.status(400).json({
          success: false,
          message: "Cannot log wages for a terminated worker.",
        });
      }
    }

    const expense = await Expense.create({
      category,
      amount:      parseFloat(Number(amount).toFixed(2)),
      expenseDate: new Date(expenseDate),
      description: description || "",
      worker:      worker || null,
    });

    await expense.populate("worker", "name type wageRate");

    res.status(201).json({
      success: true,
      message: "Expense recorded successfully.",
      data:    expense,
    });
  } catch (error) {
    console.error("Create Expense Error:", error.message);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: "Failed to record expense.",
      error:   error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// PUT /api/expenses/:id
// ════════════════════════════════════════════════════════════════════
const updateExpense = async (req, res) => {
  try {
    // Category guard if being changed
    if (req.body.category && !VALID_CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category. Valid values: " + VALID_CATEGORIES.join(", "),
      });
    }

    // Amount guard if being changed
    if (req.body.amount !== undefined && Number(req.body.amount) < 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount cannot be negative.",
      });
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate("worker", "name type wageRate phone status");

    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }

    res.status(200).json({
      success: true,
      message: "Expense updated successfully.",
      data:    expense,
    });
  } catch (error) {
    console.error("Update Expense Error:", error.message);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update expense.",
      error:   error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// DELETE /api/expenses/:id  (hard delete — expenses can be fully removed)
// ════════════════════════════════════════════════════════════════════
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found." });
    }
    res.status(200).json({
      success: true,
      message: "Expense deleted successfully.",
      deleted: {
        id:       expense._id,
        category: expense.category,
        amount:   expense.amount,
        date:     expense.expenseDate,
      },
    });
  } catch (error) {
    console.error("Delete Expense Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete expense.",
      error:   error.message,
    });
  }
};

module.exports = {
  getAllExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
  getMonthlyTrend,
};
