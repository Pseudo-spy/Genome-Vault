# 🧬 GenomeVault

> **Decentralized Genomic Data Ownership and Research Marketplace**

GenomeVault is a Web3 platform where individuals securely own their genomic DNA data and share it with verified researchers for medical research — while earning rewards. Built on Polygon blockchain with zero-knowledge proofs, IPFS decentralized storage, and MetaMask authentication.

---
<div align="center">
  <img src="Screenshot 2026-03-14 202828.png" width="1200" alt="GenomeVault Banner"/>
</div>

## ✨ Features

### For Data Owners
- Upload genomic files (VCF, FASTQ, BAM) — AES-256 encrypted before upload
- Files stored on IPFS — never on any central server
- Set your own price for dataset access
- Approve or reject researcher access requests
- Earn 95% of every access payment automatically
- Full audit trail of who accessed your data and when

### For Researchers
- Sign up with institutional credentials and ethics approval
- Admin-verified accounts only
- Browse genomic dataset marketplace with filters
- Submit signed access requests with research objectives
- Download approved datasets securely
- Build reputation score through completed studies

### Platform
- MetaMask wallet login — no username or password needed
- Smart contracts on Polygon handle all payments
- Zero-knowledge proofs verify settlements without exposing data
- Every action signed with MetaMask and recorded on-chain
- Admin panel for researcher verification and platform monitoring

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, Tailwind CSS, GSAP animations |
| Wallet | ethers.js v6, MetaMask |
| State | Zustand |
| Backend | Node.js, Express, Mongoose |
| Auth | JWT + MetaMask signMessage |
| Storage | IPFS, MongoDB |
| Encryption | AES-256, SHA-256 |
| Blockchain | Solidity 0.8.19, Hardhat, Polygon |
| Genomic AI | FastAPI, Python 3.11 |

---

## 📁 Folder Structure
```
genomevault/
├── frontend/          Next.js app
├── backend/           Node.js API
├── contracts/         Solidity smart contracts
├── genomic-service/   FastAPI Python service
└── deployment/        Deploy scripts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18, Python >= 3.10, MongoDB, MetaMask

### Installation

**1. Clone the repo**
```bash
git clone https://github.com/Pseudo-spy/Genome-Vault.git
cd Genome-Vault
```

**2. Install dependencies**
```bash
# Windows
install.bat

# Mac / Linux
chmod +x install.sh && ./install.sh
```

**3. Configure environment**
```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

**4. Start local blockchain**
```bash
cd contracts && npx hardhat node
cd contracts && npx hardhat run scripts/deploy.js --network localhost
```

**5. Start all services**
```bash
cd backend && npm run dev
cd genomic-service && uvicorn main:app --reload --port 8000
cd frontend && npm run dev
```

**6. Open** `http://localhost:3000`

---

## 🔐 Smart Contracts

| Contract | Description |
|---|---|
| GenomeRegistry.sol | Dataset registration on-chain |
| AccessControl.sol | Request, approve, revoke access |
| PaymentContract.sol | 95% owner / 5% platform fee split |

---

## 👥 User Roles

| Role | Login | Access |
|---|---|---|
| Data Owner | MetaMask wallet | Upload, manage, earn |
| Researcher | MetaMask or email | Browse, request, download |
| Admin | MetaMask wallet | Verify researchers, analytics |

---

## 🔒 Security

- Genome files encrypted in the browser before upload
- MetaMask signatures verified server-side
- Immutable on-chain audit log for every action
- Role-based access control on all API routes

---

## 📄 License

MIT License

---

<p align="center">Built with ❤️ for genomic data sovereignty</p>
