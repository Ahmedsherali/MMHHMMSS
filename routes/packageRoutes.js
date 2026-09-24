const express = require("express"); const router = express.Router();
const { getAllPackages, createPackage, updatePackage, deletePackage } = require("../controllers/packageController");
const { protect } = require("../middleware/authMiddleware");
router.use(protect);
router.route("/").get(getAllPackages).post(createPackage);
router.route("/:id").put(updatePackage).delete(deletePackage);
module.exports = router;
