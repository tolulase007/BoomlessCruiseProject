"""
FastAPI backend: POST /simulate accepts SimulationParameters JSON,
calls boomless_physics.run_simulation, returns SimulationResult JSON.
"""

import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

# Allow importing boomless_physics from repo root (when run from backend/ or repo root)
_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from boomless_physics import run_simulation

app = FastAPI(title="Boomless Cruise API", version="1.0.0")
TRACKING_DB_PATH = Path(__file__).resolve().parent / "tracking.sqlite3"

app.add_middleware(
    CORSMiddleware,
    # Local dev + production: localhost, 127.0.0.1, and Vercel deployments
    allow_origin_regex=r"^https?://((localhost|127\.0\.0\.1)(:\d+)?|.*\.vercel\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_tracking_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(TRACKING_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_tracking_db() -> None:
    conn = _get_tracking_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tracked_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                source TEXT NOT NULL,
                path TEXT,
                timezone TEXT,
                country TEXT,
                region TEXT,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                time_spent_seconds INTEGER,
                UNIQUE(session_id, source)
            )
            """
        )
        conn.commit()
    finally:
        conn.close()


def _extract_country_region(request: Request) -> tuple[str | None, str | None]:
    country = request.headers.get("x-vercel-ip-country") or request.headers.get("cf-ipcountry")
    region = request.headers.get("x-vercel-ip-country-region") or request.headers.get("x-geo-region")
    country_value = country.strip() if isinstance(country, str) and country.strip() else None
    region_value = region.strip() if isinstance(region, str) and region.strip() else None
    return country_value, region_value


_init_tracking_db()


@app.post("/simulate")
def simulate(params: dict) -> dict:
    """Accept SimulationParameters JSON; return SimulationResult JSON."""
    return run_simulation(params)


@app.post("/track")
async def track_session_event(request: Request) -> dict:
    payload = await request.json()
    event = str(payload.get("event", "")).strip()
    session_id = str(payload.get("session_id", "")).strip()
    source = str(payload.get("source", "")).strip()
    if event not in {"session_start", "session_end"} or not session_id or not source:
        raise HTTPException(status_code=400, detail="invalid tracking payload")

    path_value = payload.get("path")
    timezone_value = payload.get("timezone")
    path = str(path_value).strip()[:255] if isinstance(path_value, str) and path_value.strip() else None
    timezone_name = str(timezone_value).strip()[:64] if isinstance(timezone_value, str) and timezone_value.strip() else None

    country, region = _extract_country_region(request)
    now_iso = _utc_now_iso()

    conn = _get_tracking_connection()
    try:
        if event == "session_start":
            conn.execute(
                """
                INSERT OR IGNORE INTO tracked_sessions (
                    session_id, source, path, timezone, country, region, started_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (session_id, source, path, timezone_name, country, region, now_iso),
            )
        else:
            row = conn.execute(
                """
                SELECT id, started_at
                FROM tracked_sessions
                WHERE session_id = ? AND source = ?
                ORDER BY id DESC
                LIMIT 1
                """,
                (session_id, source),
            ).fetchone()
            if row is not None:
                started_at = str(row["started_at"])
                duration_seconds: int | None = None
                try:
                    start_dt = datetime.fromisoformat(started_at)
                    end_dt = datetime.fromisoformat(now_iso)
                    duration_seconds = max(0, int((end_dt - start_dt).total_seconds()))
                except ValueError:
                    duration_seconds = None
                conn.execute(
                    """
                    UPDATE tracked_sessions
                    SET ended_at = COALESCE(ended_at, ?),
                        time_spent_seconds = COALESCE(time_spent_seconds, ?),
                        country = COALESCE(country, ?),
                        region = COALESCE(region, ?)
                    WHERE id = ?
                    """,
                    (now_iso, duration_seconds, country, region, int(row["id"])),
                )
        conn.commit()
    finally:
        conn.close()

    return {"ok": True}


@app.get("/track/summary")
def get_track_summary(limit: int = 25) -> dict:
    safe_limit = max(1, min(limit, 100))
    conn = _get_tracking_connection()
    try:
        rows = conn.execute(
            """
            SELECT source, path, timezone, country, region, started_at, ended_at, time_spent_seconds
            FROM tracked_sessions
            ORDER BY started_at DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()
        sessions = [dict(row) for row in rows]
    finally:
        conn.close()
    return {"sessions": sessions}
