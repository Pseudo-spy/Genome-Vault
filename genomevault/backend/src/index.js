require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");
const mongoose  = require("mongoose");
const logger    = require("./utils/logger");

const authRoutes       = require("./routes/auth");
const datasetRoutes    = require("./routes/datasets");
const researcherRoutes = require("./routes/researchers");
const accessRoutes     = require("./routes/access");
const earningsRoutes   = require("./routes/earnings");
const adminRoutes      = require("./routes/admin");

const app  = express();
const PORT = process.env.PORT || 5000;

// Security
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(morgan("combined", { stream: { write: msg => logger.info(msg.trim()) } }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: "Too many requests" });
app.use(limiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Routes
app.use("/api/auth",        authRoutes);
app.use("/api/datasets",    datasetRoutes);
app.use("/api/researchers", researcherRoutes);
app.use("/api/access",      accessRoutes);
app.use("/api/earnings",    earningsRoutes);
app.use("/api/admin",       adminRoutes);

app.get("/health", (_, res) => res.json({ status: "ok", timestamp: new Date() }));

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// DB + Start
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/genomevault")
  .then(() => {
    logger.info("MongoDB connected");
    app.listen(PORT, () => logger.info(`GenomeVault API running on port ${PORT}`));
  })
  .catch(err => { logger.error("DB connection failed:", err); process.exit(1); });

module.exports = app;
