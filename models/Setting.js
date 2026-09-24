const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true, trim: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });

settingSchema.statics.getSetting = async function (key, defaultValue) {
  let doc = await this.findOne({ key });
  if (!doc) {
    doc = await this.create({ key, value: defaultValue });
  }
  return doc.value;
};

settingSchema.statics.setSetting = async function (key, value) {
  const doc = await this.findOneAndUpdate(
    { key },
    { value },
    { new: true, upsert: true, runValidators: true }
  );
  return doc.value;
};

module.exports = mongoose.model("Setting", settingSchema);
