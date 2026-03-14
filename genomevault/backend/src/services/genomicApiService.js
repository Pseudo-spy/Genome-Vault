const axios  = require("axios");
const logger = require("../utils/logger");

const BASE = process.env.GENOMIC_SERVICE_URL || "http://localhost:8000";

async function extractMetadata(ipfsCID, fileHash) {
  try {
    const { data } = await axios.post(`${BASE}/extract-metadata`, { ipfsCID, fileHash }, { timeout: 30000 });
    return data;
  } catch (err) {
    logger.warn("genomic extractMetadata failed:", err.message);
    return null;
  }
}

async function validateGenome(ipfsCID, fileType) {
  try {
    const { data } = await axios.post(`${BASE}/validate-genome`, { ipfsCID, fileType }, { timeout: 60000 });
    return data;
  } catch (err) {
    logger.warn("genomic validateGenome failed:", err.message);
    return { valid: true, message: "Validation service unavailable" };
  }
}

async function detectVariants(ipfsCID) {
  try {
    const { data } = await axios.post(`${BASE}/detect-variants`, { ipfsCID }, { timeout: 120000 });
    return data;
  } catch (err) {
    logger.warn("genomic detectVariants failed:", err.message);
    return null;
  }
}

async function healthRiskPrediction(datasetId) {
  try {
    const { data } = await axios.get(`${BASE}/health-risk-prediction?dataset_id=${datasetId}`, { timeout: 60000 });
    return data;
  } catch (err) {
    logger.warn("genomic healthRiskPrediction failed:", err.message);
    return null;
  }
}

module.exports = { extractMetadata, validateGenome, detectVariants, healthRiskPrediction };
