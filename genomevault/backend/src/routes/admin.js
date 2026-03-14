const express    = require("express");
const auth       = require("../middleware/auth");
const authorize  = require("../middleware/authorize");
const Researcher = require("../models/Researcher");
const Dataset    = require("../models/Dataset");
const AccessRequest = require("../models/AccessRequest");

const router = express.Router();

// Admin middleware
const adminOnly = [auth, authorize("admin")];

// ── Verify / reject researcher ───────────────────────────────────────────────
router.patch("/researchers/:id/verify", ...adminOnly, async (req, res) => {
  try {
    const { status, rejectionReason } = req.body; // "verified" | "rejected"
    if (!["verified","rejected"].includes(status)) {
      return res.status(400).json({ error: "status must be verified or rejected" });
    }
    const r = await Researcher.findByIdAndUpdate(
      req.params.id,
      { status, rejectionReason: rejectionReason || "" },
      { new: true }
    ).select("-password");
    if (!r) return res.status(404).json({ error: "Researcher not found" });
    res.json({ message: `Researcher ${status}`, researcher: r });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── List all researchers ─────────────────────────────────────────────────────
router.get("/researchers", ...adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const researchers = await Researcher.find(query).select("-password").sort("-createdAt");
    res.json(researchers);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Analytics dashboard ──────────────────────────────────────────────────────
router.get("/analytics", ...adminOnly, async (req, res) => {
  try {
    const [
      totalDatasets, activeDatasets,
      totalResearchers, verifiedResearchers, pendingResearchers,
      totalRequests, approvedRequests
    ] = await Promise.all([
      Dataset.countDocuments(),
      Dataset.countDocuments({ isActive: true }),
      Researcher.countDocuments(),
      Researcher.countDocuments({ status: "verified" }),
      Researcher.countDocuments({ status: "pending" }),
      AccessRequest.countDocuments(),
      AccessRequest.countDocuments({ status: "approved" })
    ]);

    // Recent uploads (last 7 days)
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUploads   = await Dataset.countDocuments({ createdAt: { $gte: week } });
    const recentRequests  = await AccessRequest.countDocuments({ createdAt: { $gte: week } });

    res.json({
      datasets:    { total: totalDatasets, active: activeDatasets, recentUploads },
      researchers: { total: totalResearchers, verified: verifiedResearchers, pending: pendingResearchers },
      access:      { totalRequests, approvedRequests, recentRequests },
      revenue: {
        // simplified — in prod query PaymentContract events
        totalTransactions: approvedRequests
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// ── Monitor suspicious activity ──────────────────────────────────────────────
router.get("/suspicious", ...adminOnly, async (req, res) => {
  try {
    // Flag: researchers with > 20 requests in 24h
    const day = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const suspicious = await AccessRequest.aggregate([
      { $match: { createdAt: { $gte: day } } },
      { $group: { _id: "$researcher", count: { $sum: 1 } } },
      { $match: { count: { $gt: 20 } } },
      { $lookup: { from: "researchers", localField: "_id", foreignField: "_id", as: "researcher" } }
    ]);
    res.json(suspicious);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
