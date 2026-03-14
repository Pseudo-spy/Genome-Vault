const express = require("express");
const { ethers } = require("ethers");
const jwt       = require("jsonwebtoken");
const bcrypt    = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Researcher = require("../models/Researcher");
const DataOwner  = require("../models/DataOwner");
const logger     = require("../utils/logger");

const router = express.Router();

// ── Wallet auth (Data Owners + Researchers with wallet) ──────────────────────
router.post("/wallet-login", async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    if (!address || !signature || !message) {
      return res.status(400).json({ error: "address, signature and message required" });
    }

    // Verify signature
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Check if this wallet belongs to a researcher
    let user = await Researcher.findOne({ walletAddress: address.toLowerCase() });
    let role = "researcher";

    if (!user) {
  user = await DataOwner.findOneAndUpdate(
    { walletAddress: address.toLowerCase() },
    { walletAddress: address.toLowerCase(), lastLogin: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  role = user.role === "admin" ? "admin" : "dataOwner";
}

    if (role === "researcher" && user.status !== "verified") {
      return res.status(403).json({ error: "Researcher account not verified yet", status: user.status });
    }

    const token = jwt.sign(
      { id: user._id, address: address.toLowerCase(), role },
      process.env.JWT_SECRET || "genomevault-secret",
      { expiresIn: "7d" }
    );

    logger.info(`Wallet login: ${address} role=${role}`);
    res.json({ token, role, user: sanitizeUser(user), message: "Login successful" });
  } catch (err) {
    logger.error("wallet-login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Researcher email+password login ──────────────────────────────────────────
router.post("/researcher/login", [
  body("email").isEmail(),
  body("password").notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { email, password } = req.body;
    const researcher = await Researcher.findOne({ email: email.toLowerCase() }).select("+password");
    if (!researcher || !(await bcrypt.compare(password, researcher.password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (researcher.status !== "verified") {
      return res.status(403).json({ error: "Account not verified", status: researcher.status });
    }

    const token = jwt.sign(
      { id: researcher._id, address: researcher.walletAddress, role: "researcher" },
      process.env.JWT_SECRET || "genomevault-secret",
      { expiresIn: "7d" }
    );

    res.json({ token, role: "researcher", user: sanitizeUser(researcher) });
  } catch (err) {
    logger.error("researcher login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Verify token ──────────────────────────────────────────────────────────────
router.get("/verify", require("../middleware/auth"), (req, res) => {
  res.json({ valid: true, user: req.user });
});

function sanitizeUser(u) {
  const obj = u.toObject ? u.toObject() : u;
  delete obj.password;
  return obj;
}

router.post("/set-admin", async (req, res) => {
  const { address, secretKey } = req.body;
  if (secretKey !== "genomevault-admin-2024") {
    return res.status(403).json({ error: "Invalid secret key" });
  }
  try {
    let user = await DataOwner.findOneAndUpdate(
      { walletAddress: address.toLowerCase() },
      { walletAddress: address.toLowerCase(), role: "admin" },
      { upsert: true, new: true }
    );
    res.json({ message: "Admin role set", user });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});
module.exports = router;
