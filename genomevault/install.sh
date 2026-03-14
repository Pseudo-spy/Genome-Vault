#!/usr/bin/env bash
# ============================================================
# GenomeVault — One-shot dependency installer
# Run this once after extracting the zip:
#   chmod +x install.sh && ./install.sh
# ============================================================
set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${GREEN}[GV]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# ── Prerequisite checks ──────────────────────────────────────
step "Checking prerequisites"

command -v node  >/dev/null 2>&1 || err "Node.js >= 18 required. Install: https://nodejs.org"
command -v npm   >/dev/null 2>&1 || err "npm required"
command -v python3 >/dev/null 2>&1 || err "Python 3.10+ required. Install: https://python.org"
command -v pip3  >/dev/null 2>&1 || command -v pip >/dev/null 2>&1 || err "pip required"

NODE_VER=$(node -e "process.exit(parseInt(process.version.slice(1)) < 18 ? 1 : 0)" 2>&1) || err "Node.js >= 18 required (current: $(node -v))"
log "Node $(node -v) ✓"
log "npm $(npm -v) ✓"
log "Python $(python3 --version) ✓"

PIP=$(command -v pip3 || command -v pip)

# ── Smart contracts ──────────────────────────────────────────
step "Installing smart contract dependencies"
cd contracts
npm install
log "Hardhat + OpenZeppelin installed ✓"
cd ..

# ── Node.js backend ──────────────────────────────────────────
step "Installing backend dependencies"
cd backend
npm install
log "Express + Mongoose + ethers.js installed ✓"
cd ..

# ── FastAPI genomic service ──────────────────────────────────
step "Installing Python genomic service dependencies"
cd genomic-service
$PIP install -r requirements.txt --quiet
log "FastAPI + uvicorn installed ✓"
cd ..

# ── Next.js frontend ─────────────────────────────────────────
step "Installing frontend dependencies"
cd frontend
npm install
log "Next.js + Tailwind + GSAP installed ✓"
cd ..

# ── Environment files ────────────────────────────────────────
step "Setting up environment files"

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  # Generate a random JWT secret
  JWT=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  sed -i.bak "s/your-super-secret-jwt-key-change-this/$JWT/" backend/.env
  rm -f backend/.env.bak
  warn "backend/.env created. Fill in BACKEND_PRIVATE_KEY and BLOCKCHAIN_RPC."
else
  log "backend/.env already exists, skipping"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.local.example frontend/.env.local
  log "frontend/.env.local created"
else
  log "frontend/.env.local already exists, skipping"
fi

# ── IPFS check ────────────────────────────────────────────────
step "Checking IPFS"
if command -v ipfs >/dev/null 2>&1; then
  log "IPFS (kubo) found ✓"
else
  warn "IPFS not found. Install kubo for decentralised storage:"
  warn "  https://docs.ipfs.tech/install/command-line/"
  warn "  Or: brew install ipfs  /  choco install ipfs"
  warn "The backend will use mock CIDs in development without IPFS."
fi

# ── MongoDB check ─────────────────────────────────────────────
step "Checking MongoDB"
if command -v mongod >/dev/null 2>&1 || command -v mongosh >/dev/null 2>&1; then
  log "MongoDB found ✓"
else
  warn "MongoDB not found. Install: https://www.mongodb.com/try/download/community"
  warn "  Or: brew tap mongodb/brew && brew install mongodb-community"
fi

# ── MetaMask reminder ─────────────────────────────────────────
echo ""
echo -e "${CYAN}━━━ Setup complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}Next steps:${NC}"
echo ""
echo "  1.  Start a local blockchain:"
echo "      cd contracts && npx hardhat node"
echo ""
echo "  2.  Deploy contracts (new terminal):"
echo "      cd contracts && npx hardhat run scripts/deploy.js --network localhost"
echo ""
echo "  3.  Start IPFS daemon (optional, new terminal):"
echo "      ipfs daemon"
echo ""
echo "  4.  Start backend (new terminal):"
echo "      cd backend && npm run dev"
echo ""
echo "  5.  Start genomic service (new terminal):"
echo "      cd genomic-service && uvicorn main:app --reload --port 8000"
echo ""
echo "  6.  Start frontend (new terminal):"
echo "      cd frontend && npm run dev"
echo ""
echo -e "  Open ${GREEN}http://localhost:3000${NC} in your browser"
echo -e "  Install MetaMask: ${CYAN}https://metamask.io${NC}"
echo ""
