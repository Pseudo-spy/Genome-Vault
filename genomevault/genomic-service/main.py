from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import hashlib, random, os
from routers import genome_router

app = FastAPI(
    title="GenomeVault Genomic Service",
    description="Genomic data analysis, validation, and health prediction",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(genome_router.router, prefix="", tags=["Genomic Analysis"])

@app.get("/health")
def health(): return {"status": "ok", "service": "GenomeVault Genomic Service"}
