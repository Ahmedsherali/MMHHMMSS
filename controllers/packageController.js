const Package = require("../models/Package");

const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({ isActive: true }).sort({ title: 1 });
    res.status(200).json({ success: true, count: packages.length, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch packages.", error: error.message });
  }
};

const createPackage = async (req, res) => {
  try {
    const { title, items, pricePerHead } = req.body;
    if (!title || !items || pricePerHead === undefined)
      return res.status(400).json({ success: false, message: "title, items, and pricePerHead are required." });
    const existing = await Package.findOne({ title: title.trim() });
    if (existing) return res.status(400).json({ success: false, message: "Package already exists: " + title });
    const pkg = await Package.create({ title, items, pricePerHead });
    res.status(201).json({ success: true, message: "Package created.", data: pkg });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Failed to create package.", error: error.message });
  }
};

const updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found." });
    res.status(200).json({ success: true, message: "Package updated.", data: pkg });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Failed to update package.", error: error.message });
  }
};

const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: "Package not found." });
    res.status(200).json({ success: true, message: "Package deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete package.", error: error.message });
  }
};

module.exports = { getAllPackages, createPackage, updatePackage, deletePackage };
