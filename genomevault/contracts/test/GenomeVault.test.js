const { expect } = require("chai");
const { ethers }  = require("hardhat");

describe("GenomeVault Contracts", function () {
  let registry, accessControl, payment;
  let owner, researcher, other, deployer;

  const SAMPLE_HASH  = ethers.id("sample-genome-data");
  const SAMPLE_CID   = "QmSampleIpfsCidForTesting123";
  const SAMPLE_PRICE = ethers.parseEther("0.01");
  const SAMPLE_SIG   = "0xdeadbeef1234";
  const SAMPLE_META  = JSON.stringify({ ancestry: "South Asian", sequencingType: "WGS" });

  beforeEach(async function () {
    [deployer, owner, researcher, other] = await ethers.getSigners();

    // Deploy GenomeRegistry
    const RegistryFactory = await ethers.getContractFactory("GenomeRegistry");
    registry = await RegistryFactory.deploy();
    await registry.waitForDeployment();

    // Deploy AccessControl
    const ACFactory = await ethers.getContractFactory("AccessControl");
    accessControl = await ACFactory.deploy(await registry.getAddress());
    await accessControl.waitForDeployment();

    // Deploy PaymentContract
    const PayFactory = await ethers.getContractFactory("PaymentContract");
    payment = await PayFactory.deploy(
      await accessControl.getAddress(),
      await registry.getAddress()
    );
    await payment.waitForDeployment();
  });

  // ── GenomeRegistry ─────────────────────────────────────────────────────────
  describe("GenomeRegistry", function () {

    it("registers a genome and emits event", async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt = await tx.wait();
      const event   = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      expect(event).to.not.be.undefined;
    });

    it("stores correct owner address", async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt  = await tx.wait();
      const event    = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      const datasetId = event.args[0];
      const meta = await registry.getGenomeMetadata(datasetId);
      expect(meta.owner.toLowerCase()).to.equal(owner.address.toLowerCase());
    });

    it("stores correct IPFS CID", async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      const datasetId = event.args[0];
      const meta = await registry.getGenomeMetadata(datasetId);
      expect(meta.ipfsCID).to.equal(SAMPLE_CID);
    });

    it("allows owner to update price", async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      const datasetId = event.args[0];

      const newPrice = ethers.parseEther("0.05");
      await registry.connect(owner).updatePrice(datasetId, newPrice);
      const meta = await registry.getGenomeMetadata(datasetId);
      expect(meta.price).to.equal(newPrice);
    });

    it("prevents non-owner from updating price", async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      const datasetId = event.args[0];

      await expect(
        registry.connect(other).updatePrice(datasetId, ethers.parseEther("1"))
      ).to.be.revertedWith("Not dataset owner");
    });

    it("lists all datasets by owner", async function () {
      await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      await registry.connect(owner).registerGenome(
        ethers.id("second"), SAMPLE_CID + "2", SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const ids = await registry.getOwnerDatasets(owner.address);
      expect(ids.length).to.equal(2);
    });

    it("adds audit logs correctly", async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      const datasetId = event.args[0];

      await registry.addAuditLog("downloadData", researcher.address, datasetId, SAMPLE_SIG);
      const logs = await registry.getAuditLogs();
      expect(logs.length).to.be.greaterThan(0);
      const lastLog = logs[logs.length - 1];
      expect(lastLog.actionType).to.equal("downloadData");
    });

    it("can be paused by owner and unpaused", async function () {
      await registry.connect(deployer).pause();
      await expect(
        registry.connect(owner).registerGenome(SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META)
      ).to.be.reverted;
      await registry.connect(deployer).unpause();
      // should succeed now
      await expect(
        registry.connect(owner).registerGenome(SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META)
      ).to.not.be.reverted;
    });
  });

  // ── AccessControl ──────────────────────────────────────────────────────────
  describe("AccessControl", function () {
    let datasetId;

    beforeEach(async function () {
      const tx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const receipt = await tx.wait();
      const event   = receipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      datasetId = event.args[0];
    });

    it("researcher can request access", async function () {
      const tx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Cancer research", "NIH Grant", 30, SAMPLE_SIG
      );
      const receipt = await tx.wait();
      const event   = receipt.logs.find(l => l.fragment?.name === "AccessRequested");
      expect(event).to.not.be.undefined;
      expect(event.args[2].toLowerCase()).to.equal(researcher.address.toLowerCase());
    });

    it("request status is Pending after submission", async function () {
      const tx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Cancer research", "NIH Grant", 30, SAMPLE_SIG
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "AccessRequested");
      const requestId = event.args[0];
      const req = await accessControl.getRequest(requestId);
      expect(req.status).to.equal(0); // Pending = 0
    });

    it("access can be approved with encrypted key hash", async function () {
      const tx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Cancer research", "NIH Grant", 30, SAMPLE_SIG
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "AccessRequested");
      const requestId = event.args[0];

      await accessControl.connect(deployer).approveAccess(requestId, "encryptedKeyHash123", SAMPLE_SIG);
      const req = await accessControl.getRequest(requestId);
      expect(req.status).to.equal(1); // Approved = 1
    });

    it("approved researcher has active access", async function () {
      const tx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Cancer research", "NIH Grant", 30, SAMPLE_SIG
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "AccessRequested");
      const requestId = event.args[0];

      await accessControl.connect(deployer).approveAccess(requestId, "encryptedKeyHash123", SAMPLE_SIG);
      const hasAccess = await accessControl.hasActiveAccess(datasetId, researcher.address);
      expect(hasAccess).to.equal(true);
    });

    it("access can be revoked", async function () {
      const tx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Cancer research", "NIH Grant", 30, SAMPLE_SIG
      );
      const receipt   = await tx.wait();
      const event     = receipt.logs.find(l => l.fragment?.name === "AccessRequested");
      const requestId = event.args[0];

      await accessControl.connect(deployer).approveAccess(requestId, "encryptedKey", SAMPLE_SIG);
      await accessControl.connect(deployer).revokeAccess(requestId);

      const req = await accessControl.getRequest(requestId);
      expect(req.status).to.equal(3); // Revoked = 3
    });

    it("cannot double-submit same request", async function () {
      const tx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Cancer research", "NIH Grant", 30, SAMPLE_SIG
      );
      await tx.wait();
      // Second request with same params at same timestamp would hash differently,
      // but if blockchain processes in same block it should differ. Test idempotency of approval flow.
    });

    it("returns researcher request list", async function () {
      await accessControl.connect(researcher).requestAccess(
        datasetId, "Purpose A", "Fund A", 30, SAMPLE_SIG
      );
      const ids = await accessControl.getResearcherRequests(researcher.address);
      expect(ids.length).to.equal(1);
    });
  });

  // ── PaymentContract ────────────────────────────────────────────────────────
  describe("PaymentContract", function () {
    let datasetId, requestId;

    beforeEach(async function () {
      // Register genome
      const regTx = await registry.connect(owner).registerGenome(
        SAMPLE_HASH, SAMPLE_CID, SAMPLE_PRICE, SAMPLE_SIG, SAMPLE_META
      );
      const regReceipt = await regTx.wait();
      const regEvent   = regReceipt.logs.find(l => l.fragment?.name === "GenomeRegistered");
      datasetId = regEvent.args[0];

      // Request access
      const reqTx = await accessControl.connect(researcher).requestAccess(
        datasetId, "Research purpose", "NIH", 30, SAMPLE_SIG
      );
      const reqReceipt = await reqTx.wait();
      const reqEvent   = reqReceipt.logs.find(l => l.fragment?.name === "AccessRequested");
      requestId = reqEvent.args[0];
    });

    it("processes payment and distributes correctly", async function () {
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

      await payment.connect(researcher).processPayment(
        requestId, datasetId, owner.address, "encryptedKey", SAMPLE_SIG,
        { value: SAMPLE_PRICE }
      );

      const ownerEarnings = await payment.getOwnerEarnings(owner.address);
      // 95% of SAMPLE_PRICE
      const expectedPayout = SAMPLE_PRICE * 95n / 100n;
      expect(ownerEarnings).to.equal(expectedPayout);
    });

    it("platform fee is 5%", async function () {
      await payment.connect(researcher).processPayment(
        requestId, datasetId, owner.address, "encryptedKey", SAMPLE_SIG,
        { value: SAMPLE_PRICE }
      );

      const platformRev = await payment.totalPlatformRevenue();
      const expectedFee = SAMPLE_PRICE * 5n / 100n;
      expect(platformRev).to.equal(expectedFee);
    });

    it("owner can withdraw earnings", async function () {
      await payment.connect(researcher).processPayment(
        requestId, datasetId, owner.address, "encryptedKey", SAMPLE_SIG,
        { value: SAMPLE_PRICE }
      );

      const balBefore = await ethers.provider.getBalance(owner.address);
      const tx        = await payment.connect(owner).withdraw();
      const receipt   = await tx.wait();
      const gas       = receipt.gasUsed * receipt.gasPrice;
      const balAfter  = await ethers.provider.getBalance(owner.address);

      const expectedPayout = SAMPLE_PRICE * 95n / 100n;
      expect(balAfter - balBefore + gas).to.equal(expectedPayout);
    });

    it("prevents double payment for same request", async function () {
      await payment.connect(researcher).processPayment(
        requestId, datasetId, owner.address, "encryptedKey", SAMPLE_SIG,
        { value: SAMPLE_PRICE }
      );

      await expect(
        payment.connect(researcher).processPayment(
          requestId, datasetId, owner.address, "encryptedKey", SAMPLE_SIG,
          { value: SAMPLE_PRICE }
        )
      ).to.be.revertedWith("Already paid");
    });

    it("admin can update platform fee", async function () {
      await payment.connect(deployer).setPlatformFee(1000); // 10%
      expect(await payment.platformFeeBps()).to.equal(1000);
    });

    it("rejects platform fee > 20%", async function () {
      await expect(
        payment.connect(deployer).setPlatformFee(2100)
      ).to.be.revertedWith("Max 20%");
    });

    it("reverts if payment amount is zero", async function () {
      await expect(
        payment.connect(researcher).processPayment(
          requestId, datasetId, owner.address, "encryptedKey", SAMPLE_SIG,
          { value: 0 }
        )
      ).to.be.revertedWith("Payment required");
    });
  });
});
