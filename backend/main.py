"""
FastAPI backend: POST /simulate accepts SimulationParameters JSON,
calls boomless_physics.run_simulation, returns SimulationResult JSON.
"""

import sys
from pathlib import Path

# Allow importing boomless_physics from repo root (when run from backend/ or repo root)
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from boomless_physics import run_simulation

app = FastAPI(title="Boomless Cruise API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    # Local dev + production: localhost, 127.0.0.1, and Vercel deployments
    allow_origin_regex=r"^https?://((localhost|127\.0\.0\.1)(:\d+)?|.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/simulate")
def simulate(params: dict) -> dict:
    """Accept SimulationParameters JSON; return SimulationResult JSON."""
    return run_simulation(params)
