/**
 * MHMS Worker Controller  -  controllers/workerController.js
 * -----------------------------------------------------------
 * Phase 3: Team / Employee Management implementation.
 *
 * Worker Types:
 *   - Permanent: Monthly salaried staff
 *   - PPD (Pay-Per-Day): Daily wagers
 *
 * Endpoints (all protected by JWT):
 *   GET    /api/workers              - list workers (filter: type, status)
 *   POST   /api/workers              - register new worker
 *   GET    /api/workers/stats        - aggregate worker headcount & payroll stats
 *   GET    /api/workers/:id          - single worker profile
 *   PUT    /api/workers/:id          - update worker details
 *   DELETE /api/workers/:id          - soft terminate worker (status = Terminated)
 */

"use strict";

const Worker  = require("../models/Worker");
const Expense = require("../models/Expense");

const PHONE_REGEX = /^\d{4}-\d{7}$/;
const VALID_TYPES = ["Permanent", "PPD"];
const VALID_STATUSES = ["Active", "Inactive", "Terminated"];

// ════════════════════════════════════════════════════════════════════
// GET /api/workers
// Query: type (Permanent | PPD), status (Active | Inactive | Terminated)
// ════════════════════════════════════════════════════════════════════
const getAllWorkers = async (req, res) => {
  try {
    const { type, status, search } = req.query;
    const filter = {};

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid worker type. Valid values: Permanent, PPD.",
        });
      }
      filter.type = type;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Valid values: Active, Inactive, Terminated.",
        });
      }
      filter.status = status;
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    const workers = await Worker.find(filter).sort({ status: 1, name: 1 });

    res.status(200).json({
      success: true,
      count: workers.length,
      filters: {
        type: type || null,
        status: status || null,
        search: search || null,
      },
      data: workers,
    });
  } catch (error) {
    console.error("Get Workers Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch workers.",
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// GET /api/workers/stats
// Aggregates worker count, active permanent/PPD breakdown, and estimated payroll liability
// ════════════════════════════════════════════════════════════════════
const getWorkerStats = async (req, res) => {
  try {
    const stats = await Worker.aggregate([
      {
        $group: {
          _id: { type: "$type", status: "$status" },
          count: { $sum: 1 },
          totalWageRate: { $sum: "$wageRate" },
        },
      },
    ]);

    let activePermanent = 0;
    let activePPD = 0;
    let monthlyPayrollEstimate = 0;
    let dailyWagePool = 0;
    let terminatedCount = 0;
    let totalWorkers = 0;

    stats.forEach(({ _id, count, totalWageRate }) => {
      totalWorkers += count;
      if (_id.status === "Terminated") {
        terminatedCount += count;
      } else if (_id.status === "Active") {
        if (_id.type === "Permanent") {
          activePermanent += count;
          monthlyPayrollEstimate += totalWageRate;
        } else if (_id.type === "PPD") {
          activePPD += count;
          dailyWagePool += totalWageRate;
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalRegistered: totalWorkers,
        activeTotal: activePermanent + activePPD,
        activePermanent,
        activePPD,
        terminatedCount,
        monthlyPayrollEstimate: parseFloat(monthlyPayrollEstimate.toFixed(2)),
        dailyWagePoolEstimate: parseFloat(dailyWagePool.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Worker Stats Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to calculate worker statistics.",
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// GET /api/workers/:id
// Returns worker profile and optionally recent wage expense history
// ════════════════════════════════════════════════════════════════════
const getWorkerById = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    // Also fetch wage payment history logged under this worker
    const wageHistory = await Expense.find({ worker: worker._id })
      .sort({ expenseDate: -1 })
      .limit(20);

    const totalPaid = wageHistory.reduce((sum, item) => sum + item.amount, 0);

    res.status(200).json({
      success: true,
      data: worker,
      payrollSummary: {
        totalPaidLogged: parseFloat(totalPaid.toFixed(2)),
        recentPaymentsCount: wageHistory.length,
        recentPayments: wageHistory,
      },
    });
  } catch (error) {
    console.error("Get Worker Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch worker details.",
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// POST /api/workers
// Body: { name, type, wageRate, phone?, notes? }
// ════════════════════════════════════════════════════════════════════
const createWorker = async (req, res) => {
  try {
    const { name, type, wageRate, phone, notes } = req.body;

    // Required fields guard
    if (!name || !type || wageRate === undefined || wageRate === null) {
      return res.status(400).json({
        success: false,
        message: "name, type, and wageRate are required.",
      });
    }

    // Validate type enum
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be either 'Permanent' or 'PPD'.",
      });
    }

    // Validate non-negative wage rate
    if (Number(wageRate) < 0) {
      return res.status(400).json({
        success: false,
        message: "wageRate cannot be negative.",
      });
    }

    // Validate phone number format strictly if provided
    if (phone && phone.trim() !== "") {
      if (!PHONE_REGEX.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone format. Must match XXXX-XXXXXXX (e.g. 0300-1234567).",
        });
      }
    }

    const worker = await Worker.create({
      name: name.trim(),
      type,
      wageRate: parseFloat(Number(wageRate).toFixed(2)),
      phone: phone ? phone.trim() : "",
      status: "Active",
      joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : new Date(),
      notes: notes || "",
    });

    res.status(201).json({
      success: true,
      message: "Worker registered successfully.",
      data: worker,
    });
  } catch (error) {
    console.error("Create Worker Error:", error.message);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: "Failed to register worker.",
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// PUT /api/workers/:id
// ════════════════════════════════════════════════════════════════════
const updateWorker = async (req, res) => {
  try {
    const { name, type, wageRate, phone, status, notes } = req.body;

    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type must be either 'Permanent' or 'PPD'.",
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be 'Active', 'Inactive', or 'Terminated'.",
      });
    }

    if (wageRate !== undefined && Number(wageRate) < 0) {
      return res.status(400).json({
        success: false,
        message: "wageRate cannot be negative.",
      });
    }

    if (phone && phone.trim() !== "") {
      if (!PHONE_REGEX.test(phone.trim())) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone format. Must match XXXX-XXXXXXX (e.g. 0300-1234567).",
        });
      }
    }

    const worker = await Worker.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    res.status(200).json({
      success: true,
      message: "Worker profile updated.",
      data: worker,
    });
  } catch (error) {
    console.error("Update Worker Error:", error.message);
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({
      success: false,
      message: "Failed to update worker.",
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════
// DELETE /api/workers/:id  (Soft delete / termination)
// Sets status = "Terminated" to preserve historical payroll data.
// ════════════════════════════════════════════════════════════════════
const deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    if (worker.status === "Terminated") {
      return res.status(400).json({
        success: false,
        message: "Worker is already terminated.",
      });
    }

    worker.status = "Terminated";
    await worker.save();

    res.status(200).json({
      success: true,
      message: `Worker "${worker.name}" has been terminated. Historical records remain preserved.`,
      data: { id: worker._id, name: worker.name, type: worker.type, status: worker.status },
    });
  } catch (error) {
    console.error("Terminate Worker Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to terminate worker.", error: error.message });
  }
};

// ════════════════════════════════════════════════════════════════════
// DELETE /api/workers/:id/remove  (Hard / permanent delete)
// Only permitted when worker.status === "Terminated".
// Completely removes the document — use when historical payroll data
// has already been exported or is no longer needed.
// ════════════════════════════════════════════════════════════════════
const removeWorker = async (req, res) => {
  try {
    const worker = await Worker.findById(req.params.id);
    if (!worker) {
      return res.status(404).json({ success: false, message: "Worker not found." });
    }

    if (worker.status !== "Terminated") {
      return res.status(400).json({
        success: false,
        message: "Only terminated workers can be permanently removed. Terminate the worker first.",
      });
    }

    await Worker.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Worker "${worker.name}" has been permanently removed from the roster.`,
    });
  } catch (error) {
    console.error("Remove Worker Error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to permanently remove worker.",
      error: error.message,
    });
  }
};

module.exports = {
  getAllWorkers,
  getWorkerStats,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  removeWorker,
};

