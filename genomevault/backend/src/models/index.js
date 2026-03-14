const mongoose = require("mongoose");

// ── Dataset ──────────────────────────────────────────────────────────────────
const DatasetSchema = new mongoose.Schema({
  datasetHash:     { type: String, required: true },
  ipfsCID:         { type: String, required: true },
  owner:           { type: mongoose.Schema.Types.ObjectId, ref: "DataOwner", required: true },
  ownerAddress:    { type: String, required: true, lowercase: true },
  price:           { type: Number, default: 0 },
  isActive:        { type: Boolean, default: true },
  signatureHash:   { type: String, default: "" },
  fileName:        { type: String, default: "" },
  fileSize:        { type: Number, default: 0 },
  fileType:        { type: String, default: "" },
  encryptedKey:    { type: String, select: false },
  blockchainTxHash:    { type: String, default: "" },
  blockchainDatasetId: { type: String, default: "" },
  accessCount:     { type: Number, default: 0 },
  metadata: {
    ancestry:         { type: String, default: "" },
    sequencingType:   { type: String, enum: ["WGS","WES","SNP-array","RNA-seq","FASTQ","VCF","BAM","other"], default: "other" },
    populationRegion: { type: String, default: "" },
    diseaseMarkers:   [String],
    coverage:         { type: Number, default: 0 },
    qualityScore:     { type: Number, default: 0 },
    snpCount:         { type: Number, default: 0 },
    description:      { type: String, default: "" }
  }
}, { timestamps: true });

// ── Researcher ────────────────────────────────────────────────────────────────
const ResearcherSchema = new mongoose.Schema({
  fullName:        { type: String, required: true },
  email:           { type: String, required: true, unique: true, lowercase: true },
  password:        { type: String, required: true, select: false },
  institution:     { type: String, required: true },
  department:      { type: String, default: "" },
  researchField:   { type: String, required: true },
  linkedIn:        { type: String, default: "" },
  walletAddress:   { type: String, default: "", lowercase: true },
  institutionalIdCID: { type: String, default: "" },
  ethicsApprovalCID:  { type: String, default: "" },
  status:          { type: String, enum: ["pending","verified","rejected"], default: "pending" },
  rejectionReason: { type: String, default: "" },
  reputationScore: { type: Number, default: 0 },
  completedStudies:{ type: Number, default: 0 },
  lastLogin:       { type: Date }
}, { timestamps: true });

// ── DataOwner ─────────────────────────────────────────────────────────────────
const DataOwnerSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true, unique: true, lowercase: true },
  role:          { type: String, default: "dataOwner" },
  totalEarnings: { type: Number, default: 0 },
  totalAccesses: { type: Number, default: 0 },
  lastLogin:     { type: Date }
}, { timestamps: true });;

// ── AccessRequest ─────────────────────────────────────────────────────────────
const AccessRequestSchema = new mongoose.Schema({
  dataset:           { type: mongoose.Schema.Types.ObjectId, ref: "Dataset", required: true },
  researcher:        { type: mongoose.Schema.Types.ObjectId, ref: "Researcher", required: true },
  researcherAddress: { type: String, default: "", lowercase: true },
  researchObjective: { type: String, required: true },
  fundingSource:     { type: String, default: "" },
  durationDays:      { type: Number, default: 30 },
  status:            { type: String, enum: ["pending","approved","rejected","revoked"], default: "pending" },
  signatureHash:     { type: String, default: "" },
  signatureHashApproval: { type: String, default: "" },
  encryptedKey:      { type: String, default: "", select: false },
  blockchainRequestId:   { type: String, default: "" },
  approvedAt:        { type: Date },
  revokedAt:         { type: Date }
}, { timestamps: true });

module.exports = {
  Dataset:       mongoose.model("Dataset",       DatasetSchema),
  Researcher:    mongoose.model("Researcher",    ResearcherSchema),
  DataOwner:     mongoose.model("DataOwner",     DataOwnerSchema),
  AccessRequest: mongoose.model("AccessRequest", AccessRequestSchema)
};
