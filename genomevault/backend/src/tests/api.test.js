/**
 * GenomeVault Backend Integration Tests
 * Run: cd backend && npm test
 * Requires: MongoDB running locally, IPFS daemon (optional)
 */

const request = require("supertest");
const mongoose = require("mongoose");
const { ethers } = require("ethers");
const app = require("../src/index");

// Create a test wallet
const wallet = ethers.Wallet.createRandom();

let authToken;
let researcherToken;
let datasetId;

describe("Auth — Wallet Login", () => {
  it("should reject missing params", async () => {
    const res = await request(app).post("/api/auth/wallet-login").send({});
    expect(res.status).toBe(400);
  });

  it("should reject invalid signature", async () => {
    const res = await request(app).post("/api/auth/wallet-login").send({
      address: wallet.address,
      signature: "0xbadsig",
      message: "test"
    });
    expect(res.status).toBe(401);
  });

  it("should authenticate with valid wallet signature", async () => {
    const message = `GenomeVault Authentication\n\nWallet: ${wallet.address}\nTimestamp: ${Date.now()}\n\nSign this message to authenticate.`;
    const signature = await wallet.signMessage(message);

    const res = await request(app).post("/api/auth/wallet-login").send({
      address: wallet.address, signature, message
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe("dataOwner");
    authToken = res.body.token;
  });
});

describe("Datasets", () => {
  it("should reject upload without auth", async () => {
    const res = await request(app).post("/api/datasets/upload").send({});
    expect(res.status).toBe(401);
  });

  it("should reject upload without file", async () => {
    const res = await request(app)
      .post("/api/datasets/upload")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ price: "0" });
    expect(res.status).toBe(400);
  });

  it("should return empty datasets list for new wallet", async () => {
    const res = await request(app)
      .get("/api/datasets/my")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should return marketplace listing", async () => {
    const res = await request(app)
      .get("/api/datasets/marketplace")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("datasets");
    expect(res.body).toHaveProperty("total");
  });
});

describe("Researchers — Signup", () => {
  it("should reject signup without required fields", async () => {
    const res = await request(app)
      .post("/api/researchers/signup")
      .field("fullName", "Dr. Test")
      .field("email", "not-an-email");
    expect(res.status).toBe(400);
  });
});

describe("Admin — Analytics", () => {
  it("should reject analytics without admin token", async () => {
    const res = await request(app)
      .get("/api/admin/analytics")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Earnings", () => {
  it("should return earnings for authenticated owner", async () => {
    const res = await request(app)
      .get("/api/earnings")
      .set("Authorization", `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalEarnings");
    expect(res.body).toHaveProperty("totalAccesses");
  });
});

afterAll(async () => {
  // Clean up test data
  if (mongoose.connection.readyState === 1) {
    const { DataOwner } = require("../src/models/index");
    await DataOwner.deleteOne({ walletAddress: wallet.address.toLowerCase() });
    await mongoose.connection.close();
  }
});
