const express  = require("express");
const multer   = require("multer");
const bcrypt   = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Researcher = require("../models/Researcher");
const auth       = require("../middleware/auth");
const authorize  = require("../middleware/authorize");
const ipfsService = require("../services/ipfsService");
const logger     = require("../utils/logger");

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Researcher signup ─────────────────────────────────────────────────────────
router.post("/signup", upload.fields([
  { name: "institutionalId", maxCount: 1 },
  { name: "ethicsApproval",  maxCount: 1 }
]), [
  body("fullName").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
  body("institution").notEmpty(),
  body("researchField").notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { fullName, email, password, institution, department, researchField, linkedIn, walletAddress } = req.body;

    if (await Researcher.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: "Email already registered" });
    }

    let idCID = "", ethicsCID = "";
    if (req.files?.institutionalId) {
      idCID = await ipfsService.uploadBuffer(req.files.institutionalId[0].buffer, "institutional-id");
    }
    if (req.files?.ethicsApproval) {
      ethicsCID = await ipfsService.uploadBuffer(req.files.ethicsApproval[0].buffer, "ethics-approval");
    }

    const hashed = await bcrypt.hash(password, 12);
    const researcher = await Researcher.create({
      fullName,
      email:          email.toLowerCase(),
      password:       hashed,
      institution,
      department:     department || "",
      researchField,
      linkedIn:       linkedIn || "",
      walletAddress:  walletAddress ? walletAddress.toLowerCase() : "",
      institutionalIdCID: idCID,
      ethicsApprovalCID:  ethicsCID,
      status:         "pending"
    });

    logger.info(`New researcher signup: ${email}`);
    res.status(201).json({
      message:  "Application submitted. Awaiting admin verification.",
      id:       researcher._id,
      status:   "pending"
    });
  } catch (err) {
    logger.error("researcher signup error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ── Get researcher profile ─────────────────────────────────────────────────────
router.get("/profile", auth, authorize("researcher"), async (req, res) => {
  try {
    const r = await Researcher.findById(req.user.id).select("-password");
    if (!r) return res.status(404).json({ error: "Not found" });
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Update reputation score ────────────────────────────────────────────────────
router.patch("/:id/reputation", auth, async (req, res) => {
  try {
    const { score } = req.body;
    const r = await Researcher.findByIdAndUpdate(req.params.id,
      { $set: { reputationScore: score } },
      { new: true }
    ).select("-password");
    res.json(r);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
