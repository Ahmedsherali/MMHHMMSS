/**
 * MHMS Worker Routes  -  routes/workerRoutes.js
 * -----------------------------------------------
 * CRITICAL ORDERING: Named routes (/stats, /:id/remove) are registered
 * BEFORE plain /:id to prevent Express interpreting named segments as ObjectIDs.
 */

"use strict";

const express = require("express");
const router  = express.Router();
const {
  getAllWorkers,
  getWorkerStats,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  removeWorker,
} = require("../controllers/workerController");
const { protect } = require("../middleware/authMiddleware");

// All worker routes require a valid JWT
router.use(protect);

// ── Named endpoints FIRST (above /:id) ──
router.get("/stats", getWorkerStats);              // GET    /api/workers/stats
router.delete("/:id/remove", removeWorker);        // DELETE /api/workers/:id/remove (hard delete)

// ── Standard CRUD ──
router.route("/")
  .get(getAllWorkers)    // GET  /api/workers
  .post(createWorker);  // POST /api/workers

router.route("/:id")
  .get(getWorkerById)    // GET    /api/workers/:id
  .put(updateWorker)     // PUT    /api/workers/:id
  .delete(deleteWorker); // DELETE /api/workers/:id (soft-terminate)

module.exports = router;
