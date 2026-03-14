#!/usr/bin/env bash
# GenomeVault — Stop all services
echo "Stopping GenomeVault services..."
pkill -f "hardhat node"        2>/dev/null && echo "  Hardhat stopped"
pkill -f "uvicorn main:app"    2>/dev/null && echo "  Genomic service stopped"
pkill -f "nodemon src/index"   2>/dev/null && echo "  Backend stopped"
pkill -f "node src/index"      2>/dev/null && echo "  Backend stopped"
pkill -f "next dev"            2>/dev/null && echo "  Frontend stopped"
pkill -f "ipfs daemon"         2>/dev/null && echo "  IPFS stopped"
echo "All services stopped."
