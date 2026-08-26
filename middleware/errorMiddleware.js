const notFound = (req, res, next) => {
  const error = new Error("Route Not Found: " + req.originalUrl);
  res.status(404);
  next(error);
};
const errorHandler = (err, req, res, next) => {
  console.error("[ERROR]", err.name, err.message);

  // Mongoose validation errors (e.g. invalid phone regex) → 400
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message).join(" | ");
    return res.status(400).json({ success: false, message: messages });
  }

  // Mongoose bad ObjectId cast → 400
  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: `Invalid value for field '${err.path}'.` });
  }

  // MongoDB duplicate key → 409
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ success: false, message: `Duplicate entry: ${field} already exists.` });
  }

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = { notFound, errorHandler };
