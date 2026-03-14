const express   = require("express");
const multer    = require("multer");
const crypto    = require("crypto");
const CryptoJS  = require("crypto-js");
const auth      = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const ipfsService    = require("../services/ipfsService");
const blockchainSvc  = require("../services/blockchainService");
const genomicService = require("../services/genomicApiService");
const Dataset        = require("../models/Dataset");
const logger         = require("../utils/logger");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

// ── Upload genome dataset ───────────────────────────────────────────────────
router.post("/upload", auth, authorize("dataOwner"), upload.single("genomeFile"), async (req, res) => {
  try {
    const { price, signatureHash, signedMessage, metadata } = req.body;
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const fileBuffer = req.file.buffer;
    const fileHash   = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // AES-encrypt before IPFS upload
    const encKey      = crypto.randomBytes(32).toString("hex");
    const wordArray   = CryptoJS.lib.WordArray.create(fileBuffer);
    const encrypted   = CryptoJS.AES.encrypt(wordArray, encKey).toString();
    const encBuffer   = Buffer.from(encrypted);

    // Upload encrypted file to IPFS
    const ipfsCID = await ipfsService.uploadBuffer(encBuffer, req.file.originalname);

    // Store encryption key encrypted with owner's address (simplified - in prod use asymmetric)
    const encryptedKey = CryptoJS.AES.encrypt(encKey, req.user.address).toString();

    // Register on blockchain
    const datasetHash = "0x" + fileHash;
    const txResult = await blockchainSvc.registerGenome(
      datasetHash, ipfsCID, price || "0", signatureHash || "", metadata || "{}", req.user.address
    );

    const dataset = await Dataset.create({
      datasetHash:   fileHash,
      ipfsCID,
      owner:         req.user.id,
      ownerAddress:  req.user.address,
      price:         price || 0,
      signatureHash: signatureHash || "",
      metadata:      JSON.parse(metadata || "{}"),
      fileName:      req.file.originalname,
      fileSize:      req.file.size,
      fileType:      req.file.mimetype,
      encryptedKey,
      blockchainTxHash: txResult?.hash || "",
      blockchainDatasetId: txResult?.datasetId || ""
    });

    // Async: call FastAPI for metadata extraction
    genomicService.extractMetadata(ipfsCID, fileHash).catch(e => logger.warn("metadata extraction:", e.message));

    logger.info(`Dataset uploaded by ${req.user.address}: ${ipfsCID}`);
    res.status(201).json({
      message:   "Dataset uploaded and registered",
      datasetId: dataset._id,
      ipfsCID,
      fileHash,
      blockchainTxHash: txResult?.hash
    });
  } catch (err) {
    logger.error("upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Get owner's datasets ────────────────────────────────────────────────────
router.get("/my", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const datasets = await Dataset.find({ owner: req.user.id }).sort("-createdAt");
    res.json(datasets);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Marketplace browse (researchers) ────────────────────────────────────────
router.get("/marketplace", auth, async (req, res) => {
  try {
    const { ancestry, diseaseMarker, sequencingType, region, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    if (ancestry)       query["metadata.ancestry"]       = new RegExp(ancestry, "i");
    if (sequencingType) query["metadata.sequencingType"] = new RegExp(sequencingType, "i");
    if (region)         query["metadata.populationRegion"] = new RegExp(region, "i");

    const datasets = await Dataset.find(query)
      .select("-encryptedKey -datasetHash") // don't expose key or raw hash
      .populate("owner", "walletAddress")
      .sort("-createdAt")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Dataset.countDocuments(query);
    res.json({ datasets, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Get single dataset metadata ──────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const dataset = await Dataset.findById(req.params.id)
      .select("-encryptedKey")
      .populate("owner", "walletAddress");
    if (!dataset) return res.status(404).json({ error: "Not found" });
    res.json(dataset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Update price ─────────────────────────────────────────────────────────────
router.patch("/:id/price", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const { price } = req.body;
    const dataset = await Dataset.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { price },
      { new: true }
    );
    if (!dataset) return res.status(404).json({ error: "Not found or not authorized" });
    res.json(dataset);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
