#!/usr/bin/env bash
# ============================================================
# GenomeVault — Start all services
# Usage: ./start.sh [local|testnet]
# ============================================================
set -e

MODE=${1:-local}
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[GV]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
head() { echo -e "\n${CYAN}${BOLD}$1${NC}"; }

# Cleanup on exit
cleanup() {
  echo -e "\n${RED}Shutting down all services...${NC}"
  kill $(jobs -p) 2>/dev/null
  wait 2>/dev/null
  echo "Done."
}
trap cleanup EXIT INT TERM

head "═══ GenomeVault ═══════════════════════════════════"
echo -e "  Mode: ${CYAN}$MODE${NC}"
echo ""

# Check deps installed
[ ! -d "backend/node_modules" ]         && echo -e "${RED}Run ./install.sh first${NC}" && exit 1
[ ! -d "frontend/node_modules" ]        && echo -e "${RED}Run ./install.sh first${NC}" && exit 1
[ ! -d "contracts/node_modules" ]       && echo -e "${RED}Run ./install.sh first${NC}" && exit 1
[ ! -f "backend/.env" ]                 && echo -e "${RED}Copy backend/.env.example to backend/.env and fill in values${NC}" && exit 1
[ ! -f "frontend/.env.local" ]          && cp frontend/.env.local.example frontend/.env.local

# ── 1. Hardhat local node (local mode only) ──────────────────
if [ "$MODE" = "local" ]; then
  head "[1/5] Starting local Hardhat blockchain..."
  cd contracts
  npx hardhat node --port 8545 > /tmp/gv-hardhat.log 2>&1 &
  HARDHAT_PID=$!
  cd ..
  sleep 3

  # Deploy contracts if no addresses file
  if [ ! -f "deployment/contract-addresses.json" ]; then
    head "[2/5] Deploying contracts to localhost..."
    cd contracts
    npx hardhat run scripts/deploy.js --network localhost >> /tmp/gv-hardhat.log 2>&1
    cd ..
    log "Contracts deployed — addresses saved to deployment/contract-addresses.json"
  else
    log "Contracts already deployed — skipping"
  fi
else
  head "[1/5] Skipping local blockchain (testnet mode)"
  head "[2/5] Skipping contract deploy (testnet mode)"
  warn "Make sure deployment/contract-addresses.json exists with testnet addresses"
fi

# ── 2. IPFS daemon ───────────────────────────────────────────
head "[3/5] Starting IPFS daemon..."
if command -v ipfs >/dev/null 2>&1; then
  # Init if first run
  [ ! -d ~/.ipfs ] && ipfs init
  ipfs daemon > /tmp/gv-ipfs.log 2>&1 &
  sleep 2
  log "IPFS daemon started → http://localhost:5001"
else
  warn "IPFS not installed — backend will use mock CIDs"
fi

# ── 3. FastAPI genomic service ───────────────────────────────
head "[4/5] Starting genomic service (FastAPI)..."
cd genomic-service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload > /tmp/gv-genomic.log 2>&1 &
GENOMIC_PID=$!
cd ..
sleep 2
log "Genomic service started → http://localhost:8000"
log "API docs → http://localhost:8000/docs"

# ── 4. Node.js backend ──────────────────────────────────────
head "[5/5] Starting Node.js backend..."
cd backend
npm run dev > /tmp/gv-backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 3
log "Backend API started → http://localhost:5000"

# ── 5. Next.js frontend ──────────────────────────────────────
head "[6/6] Starting Next.js frontend..."
cd frontend
npm run dev > /tmp/gv-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
sleep 4

# ── Ready ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  GenomeVault is running!${NC}"
echo -e "${GREEN}${BOLD}══════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BOLD}Frontend:${NC}         ${CYAN}http://localhost:3000${NC}"
echo -e "  ${BOLD}Backend API:${NC}      ${CYAN}http://localhost:5000${NC}"
echo -e "  ${BOLD}Genomic Service:${NC}  ${CYAN}http://localhost:8000${NC}"
echo -e "  ${BOLD}API Docs:${NC}         ${CYAN}http://localhost:8000/docs${NC}"
if [ "$MODE" = "local" ]; then
echo -e "  ${BOLD}Blockchain RPC:${NC}   ${CYAN}http://localhost:8545${NC}"
fi
echo ""
echo -e "  Log files:"
echo -e "    /tmp/gv-backend.log"
echo -e "    /tmp/gv-frontend.log"
echo -e "    /tmp/gv-genomic.log"
[ "$MODE" = "local" ] && echo -e "    /tmp/gv-hardhat.log"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Wait for all background processes
wait
