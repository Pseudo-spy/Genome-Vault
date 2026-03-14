const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 1. GenomeRegistry
  const GenomeRegistry = await ethers.getContractFactory("GenomeRegistry");
  const registry = await GenomeRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("GenomeRegistry deployed to:", registryAddress);

  // 2. AccessControl
  const AccessControlFactory = await ethers.getContractFactory("AccessControl");
  const accessControl = await AccessControlFactory.deploy(registryAddress);
  await accessControl.waitForDeployment();
  const accessAddress = await accessControl.getAddress();
  console.log("AccessControl deployed to:", accessAddress);

  // 3. PaymentContract
  const PaymentContract = await ethers.getContractFactory("PaymentContract");
  const payment = await PaymentContract.deploy(accessAddress, registryAddress);
  await payment.waitForDeployment();
  const paymentAddress = await payment.getAddress();
  console.log("PaymentContract deployed to:", paymentAddress);

  // Save addresses
  const addresses = {
    GenomeRegistry:  registryAddress,
    AccessControl:   accessAddress,
    PaymentContract: paymentAddress,
    network:         "localhost",
    deployedAt:      new Date().toISOString()
  };

  const outPath = path.join(__dirname, "../../deployment/contract-addresses.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses saved to deployment/contract-addresses.json");
  console.log(addresses);
}

main().catch(e => { console.error(e); process.exitCode = 1; });