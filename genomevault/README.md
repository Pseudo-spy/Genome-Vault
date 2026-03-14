# GenomeVault — Decentralized Genomic Data Ownership & Research Marketplace

A production-ready Web3 platform where individuals own their genomic data,
control researcher access, and earn rewards via smart contracts on Polygon.

---

## Project Structure

```
genomevault/
├── contracts/          # Solidity smart contracts (Hardhat)
├── backend/            # Node.js + Express API
├── genomic-service/    # FastAPI Python genomic analysis
├── frontend/           # Next.js + Tailwind + GSAP
└── deployment/         # Contract addresses (auto-generated)
```

---

## Prerequisites

- Node.js >= 18
- Python >= 3.10
- MongoDB (local or Atlas)
- IPFS daemon (or use Infura/Pinata)
- MetaMask browser extension
- Git

---

## 1. Smart Contracts

```bash
cd contracts
npm install

# Copy env
cp ../.env.example .env
# Fill in DEPLOYER_PRIVATE_KEY and POLYGON_MUMBAI_RPC

# Compile
npx hardhat compile

# Deploy locally (for development)
npx hardhat node &
npx hardhat run scripts/deploy.js --network localhost

# Deploy to Polygon Mumbai (testnet)
npx hardhat run scripts/deploy.js --network polygon_mumbai
```

Contract addresses are auto-saved to `deployment/contract-addresses.json`.

---

## 2. Backend (Node.js)

```bash
cd backend
npm install

cp .env.example .env
# Edit .env with your values:
#   MONGODB_URI=mongodb://localhost:27017/genomevault
#   JWT_SECRET=your-secret
#   BLOCKCHAIN_RPC=http://127.0.0.1:8545
#   BACKEND_PRIVATE_KEY=0x...   (wallet with gas for contract calls)

# Start development
npm run dev

# Production
npm start
```

API runs on http://localhost:5000

### Creating an Admin User

Connect to MongoDB and run:
```js
db.dataowners.updateOne(
  { walletAddress: "0xYOUR_WALLET" },
  { $set: { role: "admin" } },
  { upsert: true }
)
```

Or add an `admin` role field to the JWT payload by creating a separate Admin model.

---

## 3. Genomic Service (FastAPI)

```bash
cd genomic-service

python -m venv venv
source venv/bin/activate     # Windows: venv\Scripts\activate

pip install -r requirements.txt

# Start
uvicorn main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

---

## 4. IPFS (Local)

```bash
# Install IPFS CLI: https://docs.ipfs.tech/install/
ipfs init
ipfs daemon
```

Or use Infura/Pinata by updating `IPFS_API_URL` in the backend `.env`.

---

## 5. Frontend (Next.js)

```bash
cd frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local
echo "NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs" >> .env.local
echo "NEXT_PUBLIC_CHAIN_ID=80001" >> .env.local

npm run dev
```

Frontend runs on http://localhost:3000

---

## Full Local Dev (all services)

Open 4 terminals:

```bash
# Terminal 1 – Hardhat local node
cd contracts && npx hardhat node

# Terminal 2 – Deploy contracts, then start backend
cd contracts && npx hardhat run scripts/deploy.js --network localhost
cd ../backend && npm run dev

# Terminal 3 – FastAPI
cd genomic-service && uvicorn main:app --reload

# Terminal 4 – Frontend
cd frontend && npm run dev
```

---

## Environment Variables Reference

### Backend `.env`
| Variable | Description |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `FRONTEND_URL` | Frontend URL for CORS |
| `BLOCKCHAIN_RPC` | JSON-RPC URL for blockchain |
| `BACKEND_PRIVATE_KEY` | Backend wallet private key |
| `IPFS_API_URL` | IPFS API URL |
| `GENOMIC_SERVICE_URL` | FastAPI URL |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/wallet-login` | MetaMask wallet login (data owners + researchers) |
| POST | `/api/auth/researcher/login` | Email + password login |
| GET  | `/api/auth/verify` | Verify JWT token |

### Datasets
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/datasets/upload` | Upload + encrypt genome file |
| GET  | `/api/datasets/my` | Owner's datasets |
| GET  | `/api/datasets/marketplace` | Browse marketplace (researchers) |
| GET  | `/api/datasets/:id` | Single dataset metadata |
| PATCH| `/api/datasets/:id/price` | Update dataset price |

### Access Control
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/access/request` | Submit research access request |
| GET  | `/api/access/pending` | Owner's pending requests |
| POST | `/api/access/:id/approve` | Approve request |
| POST | `/api/access/:id/reject` | Reject request |
| POST | `/api/access/:id/revoke` | Revoke approved access |
| POST | `/api/access/:id/download` | Download approved dataset |
| GET  | `/api/access/my-requests` | Researcher's request history |
| GET  | `/api/access/audit-log` | Owner's audit log |

### Researchers
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/researchers/signup` | Researcher application |
| GET  | `/api/researchers/profile` | Researcher profile |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| PATCH| `/api/admin/researchers/:id/verify` | Approve/reject researcher |
| GET  | `/api/admin/researchers` | List researchers by status |
| GET  | `/api/admin/analytics` | Platform analytics |
| GET  | `/api/admin/suspicious` | Suspicious activity |

### Earnings
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/earnings` | Owner earnings dashboard |

---

## FastAPI Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/validate-genome` | Validate genomic file format |
| POST | `/extract-metadata` | Extract ancestry, SNPs, coverage |
| POST | `/detect-variants` | Identify genetic variants |
| GET  | `/health-risk-prediction?dataset_id=X` | Polygenic risk scores |

---

## Smart Contract Addresses

After deployment, addresses are saved to `deployment/contract-addresses.json`:

```json
{
  "GenomeRegistry":  "0x...",
  "AccessControl":   "0x...",
  "PaymentContract": "0x...",
  "network":         "maticmum",
  "deployedAt":      "2024-01-01T00:00:00.000Z"
}
```

---

## Security Features

- **AES-256 encryption** — genomic files encrypted before IPFS upload
- **SHA-256 hashing** — file integrity verification
- **MetaMask signature verification** — ethers.js `verifyMessage()`
- **JWT authentication** — all API routes protected
- **Role-based access control** — dataOwner / researcher / admin
- **Rate limiting** — 200 req/15min per IP
- **Helmet.js** — security headers
- **ZK-ready audit trail** — all actions logged on-chain with signature hashes

---

## Production Deployment (Polygon Mainnet)

1. Set `DEPLOYER_PRIVATE_KEY` to a funded Polygon wallet
2. Set `POLYGON_RPC=https://polygon-rpc.com`
3. Deploy: `npx hardhat run scripts/deploy.js --network polygon`
4. Set `BLOCKCHAIN_RPC=https://polygon-rpc.com` in backend
5. Use MongoDB Atlas for production database
6. Use Infura or Pinata for production IPFS
7. Deploy frontend to Vercel, backend to Railway/Render/AWS

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18, Tailwind CSS, GSAP |
| Wallet | MetaMask, ethers.js v6 |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Genomic Analysis | FastAPI, Python 3.10+ |
| Blockchain | Solidity 0.8.19, Hardhat, OpenZeppelin |
| Network | Polygon (Mumbai testnet / Mainnet) |
| Storage | IPFS (decentralized) |
| Encryption | AES-256 (CryptoJS), SHA-256 |
| Auth | JWT + MetaMask signature |
| State | Zustand (persistent) |
| Charts | Recharts |
| File Upload | react-dropzone |
