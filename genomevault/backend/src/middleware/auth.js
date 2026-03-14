const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(401).json({ error: "No token provided" });

  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "genomevault-secret");
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
