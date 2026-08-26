const MenuPricing = require("../models/MenuPricing");

const getAllMenuItems = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    const items = await MenuPricing.find(filter).sort({ category: 1, dishName: 1 });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error("Get Menu Error:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch menu items.", error: error.message });
  }
};

const getMenuItemById = async (req, res) => {
  try {
    const item = await MenuPricing.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found." });
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch menu item.", error: error.message });
  }
};

const createMenuItem = async (req, res) => {
  try {
    const { dishName, category, pricePerHead, description } = req.body;
    if (!dishName || !category || pricePerHead === undefined)
      return res.status(400).json({ success: false, message: "dishName, category, pricePerHead required." });
    const existing = await MenuPricing.findOne({ dishName: dishName.trim() });
    if (existing) return res.status(400).json({ success: false, message: "Menu item already exists: " + dishName });
    const item = await MenuPricing.create({ dishName, category, pricePerHead, description });
    res.status(201).json({ success: true, message: "Menu item created.", data: item });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Failed to create menu item.", error: error.message });
  }
};

const updateMenuItem = async (req, res) => {
  try {
    const item = await MenuPricing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found." });
    res.status(200).json({ success: true, message: "Menu item updated. Price propagated globally.", data: item });
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
    res.status(500).json({ success: false, message: "Failed to update menu item.", error: error.message });
  }
};

const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuPricing.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Menu item not found." });
    res.status(200).json({ success: true, message: "Menu item deleted." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete menu item.", error: error.message });
  }
};

module.exports = { getAllMenuItems, getMenuItemById, createMenuItem, updateMenuItem, deleteMenuItem };
