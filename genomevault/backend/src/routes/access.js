const express  = require("express");
const crypto   = require("crypto");
const CryptoJS = require("crypto-js");
const auth      = require("../middleware/auth");
const authorize = require("../middleware/authorize");
const blockchainSvc = require("../services/blockchainService");
const Dataset       = require("../models/Dataset");
const AccessRequest = require("../models/AccessRequest");
const logger        = require("../utils/logger");

const router = express.Router();

// ── Submit research access request ─────────────────────────────────────────
router.post("/request", auth, authorize("researcher"), async (req, res) => {
  try {
    const { datasetId, researchObjective, fundingSource, durationDays, signatureHash, signedMessage } = req.body;

    const dataset = await Dataset.findById(datasetId);
    if (!dataset || !dataset.isActive) return res.status(404).json({ error: "Dataset not found" });

    const existing = await AccessRequest.findOne({
      dataset: datasetId, researcher: req.user.id, status: { $in: ["pending","approved"] }
    });
    if (existing) return res.status(409).json({ error: "Request already exists", request: existing });

    // Record on blockchain
    const txResult = await blockchainSvc.requestAccess(
      dataset.blockchainDatasetId || datasetId,
      researchObjective, fundingSource, durationDays || 30,
      signatureHash || "", req.user.address
    );

    const request = await AccessRequest.create({
      dataset:           datasetId,
      researcher:        req.user.id,
      researcherAddress: req.user.address,
      researchObjective,
      fundingSource,
      durationDays:      durationDays || 30,
      signatureHash:     signatureHash || "",
      blockchainRequestId: txResult?.requestId || "",
      status:            "pending"
    });

    logger.info(`Access request ${request._id} from ${req.user.address} for dataset ${datasetId}`);
    res.status(201).json({ message: "Request submitted", requestId: request._id });
  } catch (err) {
    logger.error("request access error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Get pending requests for owner's datasets ──────────────────────────────
router.get("/pending", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const myDatasets = await Dataset.find({ owner: req.user.id }).select("_id");
    const ids = myDatasets.map(d => d._id);
    const requests = await AccessRequest.find({ dataset: { $in: ids }, status: "pending" })
      .populate("researcher", "fullName institution researchField walletAddress reputationScore")
      .populate("dataset", "metadata fileName price");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Approve request ─────────────────────────────────────────────────────────
router.post("/:id/approve", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const { signatureHash } = req.body;
    const request = await AccessRequest.findById(req.params.id).populate("dataset");
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (String(request.dataset.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Generate encrypted access key for researcher
    const tempKey = crypto.randomBytes(16).toString("hex");
    const dataset = await Dataset.findById(request.dataset._id);
    const ownerKey = CryptoJS.AES.decrypt(dataset.encryptedKey, req.user.address).toString(CryptoJS.enc.Utf8);
    const encryptedKeyForResearcher = CryptoJS.AES.encrypt(
      ownerKey, request.researcherAddress
    ).toString();

    await blockchainSvc.approveAccess(
      request.blockchainRequestId, encryptedKeyForResearcher, signatureHash || ""
    );

    request.status       = "approved";
    request.approvedAt   = new Date();
    request.encryptedKey = encryptedKeyForResearcher;
    request.signatureHashApproval = signatureHash || "";
    await request.save();

    logger.info(`Access approved: ${request._id}`);
    res.json({ message: "Access approved", requestId: request._id });
  } catch (err) {
    logger.error("approve error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Reject request ──────────────────────────────────────────────────────────
router.post("/:id/reject", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const request = await AccessRequest.findByIdAndUpdate(
      req.params.id, { status: "rejected" }, { new: true }
    );
    if (!request) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Request rejected" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Revoke access ───────────────────────────────────────────────────────────
router.post("/:id/revoke", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const request = await AccessRequest.findByIdAndUpdate(
      req.params.id, { status: "revoked", revokedAt: new Date() }, { new: true }
    );
    if (!request) return res.status(404).json({ error: "Not found" });
    res.json({ message: "Access revoked" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Download dataset (researcher, must have approval) ───────────────────────
router.post("/:id/download", auth, authorize("researcher"), async (req, res) => {
  try {
    const { signatureHash } = req.body;
    const request = await AccessRequest.findById(req.params.id).populate("dataset");
    if (!request || request.status !== "approved") {
      return res.status(403).json({ error: "Access not approved" });
    }
    if (String(request.researcher) !== String(req.user.id)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Log the download on blockchain
    await blockchainSvc.addAuditLog(
      "downloadData", req.user.address,
      request.dataset.blockchainDatasetId || request.dataset._id.toString(),
      signatureHash || ""
    );

    res.json({
      ipfsCID:      request.dataset.ipfsCID,
      encryptedKey: request.encryptedKey, // researcher decrypts with their own address
      fileName:     request.dataset.fileName,
      message:      "Use your wallet address as the decryption key"
    });
  } catch (err) {
    logger.error("download error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── Researcher's request history ────────────────────────────────────────────
router.get("/my-requests", auth, authorize("researcher"), async (req, res) => {
  try {
    const requests = await AccessRequest.find({ researcher: req.user.id })
      .populate("dataset", "metadata fileName price")
      .sort("-createdAt");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Audit log for owner's datasets ─────────────────────────────────────────
router.get("/audit-log", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const myDatasets = await Dataset.find({ owner: req.user.id }).select("_id");
    const ids = myDatasets.map(d => d._id);
    const logs = await AccessRequest.find({ dataset: { $in: ids } })
      .populate("researcher", "fullName institution walletAddress")
      .populate("dataset", "fileName")
      .sort("-createdAt");
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
