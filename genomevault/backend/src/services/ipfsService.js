const logger = require("../utils/logger");
const crypto = require("crypto");

async function uploadBuffer(buffer, filename = "file") {
  try {
    const { create } = await import("kubo-rpc-client");
    const ipfs = create({ url: process.env.IPFS_API_URL || "/ip4/127.0.0.1/tcp/5001" });
    const result = await ipfs.add({ path: filename, content: buffer }, { pin: true });
    logger.info(`IPFS upload: ${result.cid.toString()}`);
    return result.cid.toString();
  } catch (err) {
    logger.warn("IPFS not available, using mock CID");
    const fake = "Qm" + crypto.createHash("sha256").update(buffer).digest("hex").substring(0, 44);
    return fake;
  }
}

async function retrieveBuffer(cid) {
  try {
    const { create } = await import("kubo-rpc-client");
    const ipfs = create({ url: process.env.IPFS_API_URL || "/ip4/127.0.0.1/tcp/5001" });
    const chunks = [];
    for await (const chunk of ipfs.cat(cid)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    throw new Error("IPFS retrieve failed: " + err.message);
  }
}

module.exports = { uploadBuffer, retrieveBuffer };