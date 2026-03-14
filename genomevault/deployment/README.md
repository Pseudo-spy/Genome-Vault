# GenomeVault — Deployment Guide

## Prerequisites
- Node.js ≥ 18, Python ≥ 3.10, MongoDB ≥ 6, IPFS daemon
- MetaMask browser extension
- Polygon Mumbai testnet MATIC (from faucet.polygon.technology)

---

## 1. Clone and install

```bash
git clone <repo>
cd genomevault
```

---

## 2. Smart contracts

```bash
cd contracts
npm install
cp ../.env.example .env
# Fill DEPLOYER_PRIVATE_KEY, POLYGON_MUMBAI_RPC, POLYGONSCAN_API_KEY

# Local dev (Hardhat node)
npx hardhat node &
npx hardhat run scripts/deploy.js --network localhost

# Testnet
npx hardhat run scripts/deploy.js --network polygon_mumbai

# Verify on Polygonscan (optional)
npx hardhat verify --network polygon_mumbai <REGISTRY_ADDRESS>
```

Contract addresses are saved to `deployment/contract-addresses.json`.

---

## 3. IPFS daemon

```bash
# Install kubo (go-ipfs)
ipfs init
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]'
ipfs daemon &
# API available at http://localhost:5001
```

---

## 4. Backend (Node.js)

```bash
cd backend
npm install
cp .env.example .env

# Required env vars:
# MONGODB_URI=mongodb://localhost:27017/genomevault
# JWT_SECRET=<random-32-char-string>
# BLOCKCHAIN_RPC=http://127.0.0.1:8545
# BACKEND_PRIVATE_KEY=<funded-wallet-private-key>
# IPFS_API_URL=/ip4/127.0.0.1/tcp/5001
# GENOMIC_SERVICE_URL=http://localhost:8000
# FRONTEND_URL=http://localhost:3000

npm run dev          # development
npm start            # production
```

Backend runs on **http://localhost:5000**

---

## 5. Genomic service (FastAPI)

```bash
cd genomic-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI docs at **http://localhost:8000/docs**

---

## 6. Frontend (Next.js)

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
echo "NEXT_PUBLIC_CHAIN_ID=80001" >> .env.local
echo "NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs" >> .env.local

npm run dev
```

Frontend at **http://localhost:3000**

---

## 7. Create admin user

```bash
# Connect to MongoDB and insert admin
mongosh genomevault --eval "
db.dataowners.insertOne({
  walletAddress: '0xYOUR_ADMIN_WALLET',
  role: 'admin',
  createdAt: new Date()
})
"
```

Or use the API directly after setting `role: 'admin'` in your JWT_SECRET payload.

---

## Architecture diagram

```
Browser (Next.js)
    │  MetaMask wallet
    │
    ▼
Node.js API (Express) ──→ MongoDB (users, datasets, requests)
    │                ──→ IPFS (encrypted genome files)
    │                ──→ Polygon Contracts (registry, access, payment)
    │
    ▼
FastAPI Genomic Service (validation, metadata, health risk)
```

---

## Contract addresses (after deploy)

Stored in `deployment/contract-addresses.json`:

```json
{
  "GenomeRegistry": "0x...",
  "AccessControl":  "0x...",
  "PaymentContract":"0x...",
  "network": "maticmum",
  "deployedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## Production deployment (Docker)

```bash
# Build images
docker build -t genomevault-backend  ./backend
docker build -t genomevault-frontend ./frontend
docker build -t genomevault-genomic  ./genomic-service

# Run with docker-compose
docker-compose up -d
```

---

## Security checklist

- [ ] Rotate JWT_SECRET before production
- [ ] Use HTTPS with TLS certificates
- [ ] Enable MongoDB authentication
- [ ] Use Polygon mainnet (not testnet) for production
- [ ] Audit smart contracts with Trail of Bits or similar
- [ ] Enable IPFS pinning service (Pinata/Web3.Storage) for persistence
- [ ] Set up rate limiting on all API endpoints
- [ ] Configure CORS for production domain only
- [ ] Store BACKEND_PRIVATE_KEY in AWS Secrets Manager / HashiCorp Vault

---

## User flows

### Data Owner
1. Visit `http://localhost:3000`
2. Click **Connect Wallet** → MetaMask signs auth message
3. Redirected to `/dashboard`
4. Upload genome file → sign in MetaMask → encrypted to IPFS → registered on Polygon
5. Manage researcher access requests in the **Access Control** tab
6. View earnings in the **Earnings** tab

### Researcher
1. Visit `/researcher/signup` → fill form → upload ID + ethics approval
2. Admin verifies account at `/admin/dashboard`
3. Login at `/researcher/login` (wallet or email+password)
4. Browse marketplace at `/researcher/marketplace`
5. Submit access request → sign with MetaMask
6. Once approved by data owner, download dataset from dashboard

### Admin
1. Login with admin wallet at `/`
2. Visit `/admin/dashboard`
3. Review pending researcher applications
4. Approve or reject with reason
5. Monitor analytics and suspicious activity
