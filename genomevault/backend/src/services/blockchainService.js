const { ethers } = require("ethers");
const fs   = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const ADDRESSES_PATH = path.join(__dirname, "../../../../deployment/contract-addresses.json");

// Load ABIs
const REGISTRY_ABI = [
  "function registerGenome(bytes32,string,uint256,string,string) returns (bytes32)",
  "function getGenomeMetadata(bytes32) view returns (tuple(bytes32,string,address,uint256,uint256,bool,string,string,uint256))",
  "function getOwnerDatasets(address) view returns (bytes32[])",
  "function getAllDatasets() view returns (bytes32[])",
  "function updatePrice(bytes32,uint256)",
  "function addAuditLog(string,address,bytes32,string)",
  "function getAuditLogs() view returns (tuple(string,address,bytes32,string,uint256)[])",
  "event GenomeRegistered(bytes32 indexed,address indexed,string,uint256)"
];

const ACCESS_ABI = [
  "function requestAccess(bytes32,string,string,uint256,string) returns (bytes32)",
  "function approveAccess(bytes32,string,string)",
  "function revokeAccess(bytes32)",
  "function hasActiveAccess(bytes32,address) view returns (bool)",
  "function getResearcherRequests(address) view returns (bytes32[])",
  "function getDatasetRequests(bytes32) view returns (bytes32[])"
];

let provider, signer, registryContract, accessContract;

function getContracts() {
  if (registryContract && accessContract) return { registryContract, accessContract };

  const rpcUrl  = process.env.BLOCKCHAIN_RPC  || "http://127.0.0.1:8545";
  const privKey = process.env.BACKEND_PRIVATE_KEY;

  provider = new ethers.JsonRpcProvider(rpcUrl);
  signer   = privKey ? new ethers.Wallet(privKey, provider) : null;

  let addresses = { GenomeRegistry: null, AccessControl: null };
  try {
    if (fs.existsSync(ADDRESSES_PATH)) {
      addresses = JSON.parse(fs.readFileSync(ADDRESSES_PATH, "utf8"));
    }
  } catch (e) { logger.warn("Could not load contract addresses:", e.message); }

  if (addresses.GenomeRegistry && signer) {
    registryContract = new ethers.Contract(addresses.GenomeRegistry, REGISTRY_ABI, signer);
    accessContract   = new ethers.Contract(addresses.AccessControl, ACCESS_ABI, signer);
  }
  return { registryContract, accessContract };
}

async function registerGenome(datasetHash, ipfsCID, price, signatureHash, metadata, ownerAddress) {
  try {
    const { registryContract: rc } = getContracts();
    if (!rc) return { hash: null, datasetId: null }; // blockchain not configured, continue anyway
    const tx = await rc.registerGenome(datasetHash, ipfsCID, price, signatureHash, metadata);
    const receipt = await tx.wait();
    const event = receipt.logs?.find(l => l.fragment?.name === "GenomeRegistered");
    const datasetId = event?.args?.[0] || null;
    return { hash: receipt.hash, datasetId };
  } catch (err) {
    logger.error("registerGenome blockchain error:", err.message);
    return { hash: null, datasetId: null };
  }
}

async function requestAccess(datasetId, objective, funding, duration, sigHash, researcherAddress) {
  try {
    const { accessContract: ac } = getContracts();
    if (!ac) return { requestId: null };
    const tx = await ac.requestAccess(datasetId, objective, funding, duration, sigHash);
    const receipt = await tx.wait();
    return { hash: receipt.hash, requestId: datasetId + "-" + Date.now() };
  } catch (err) {
    logger.error("requestAccess blockchain error:", err.message);
    return { requestId: null };
  }
}

async function approveAccess(requestId, encryptedKeyHash, ownerSig) {
  try {
    const { accessContract: ac } = getContracts();
    if (!ac || !requestId) return;
    const tx = await ac.approveAccess(requestId, encryptedKeyHash, ownerSig);
    await tx.wait();
  } catch (err) {
    logger.error("approveAccess blockchain error:", err.message);
  }
}

async function addAuditLog(actionType, actor, datasetId, sigHash) {
  try {
    const { registryContract: rc } = getContracts();
    if (!rc) return;
    const dsBytes = datasetId.startsWith("0x") ? datasetId : ethers.id(datasetId);
    const tx = await rc.addAuditLog(actionType, actor, dsBytes, sigHash);
    await tx.wait();
  } catch (err) {
    logger.error("addAuditLog blockchain error:", err.message);
  }
}

module.exports = { registerGenome, requestAccess, approveAccess, addAuditLog };
