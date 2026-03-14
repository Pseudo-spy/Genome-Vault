const express  = require("express");
const auth     = require("../middleware/auth");
const authorize= require("../middleware/authorize");
const Dataset  = require("../models/Dataset");
const AccessRequest = require("../models/AccessRequest");

const router = express.Router();

router.get("/", auth, authorize("dataOwner"), async (req, res) => {
  try {
    const myDatasets = await Dataset.find({ owner: req.user.id }).select("_id price accessCount fileName createdAt");
    const datasetIds = myDatasets.map(d => d._id);

    const approvedReqs = await AccessRequest.find({ dataset: { $in: datasetIds }, status: "approved" })
      .populate("dataset", "price fileName")
      .populate("researcher", "fullName institution")
      .sort("-approvedAt");

    const totalEarnings = approvedReqs.reduce((sum, r) => sum + (r.dataset?.price || 0) * 0.95, 0);
    const totalAccesses = approvedReqs.length;

    // monthly breakdown (last 6 months)
    const monthly = {};
    approvedReqs.forEach(r => {
      const key = r.approvedAt
        ? `${r.approvedAt.getFullYear()}-${String(r.approvedAt.getMonth()+1).padStart(2,"0")}`
        : "unknown";
      monthly[key] = (monthly[key] || 0) + (r.dataset?.price || 0) * 0.95;
    });

    res.json({ totalEarnings, totalAccesses, datasets: myDatasets, recentAccesses: approvedReqs.slice(0,10), monthly });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
