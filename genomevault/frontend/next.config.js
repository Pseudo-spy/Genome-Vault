/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL:      process.env.NEXT_PUBLIC_API_URL      || "http://localhost:5000/api",
    NEXT_PUBLIC_IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://ipfs.io/ipfs",
    NEXT_PUBLIC_CHAIN_ID:     process.env.NEXT_PUBLIC_CHAIN_ID     || "80001",
  }
};
module.exports = nextConfig;
