const jwt = require("jsonwebtoken");
const protect = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ success: false, message: "Not authorized, no token provided." });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    if (error.name === "TokenExpiredError")
      return res.status(401).json({ success: false, message: "Token expired. Please log in again." });
    return res.status(401).json({ success: false, message: "Not authorized, invalid token." });
  }
};
module.exports = { protect };
