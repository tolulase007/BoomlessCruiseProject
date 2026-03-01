# Boomless Cruise API

Run the Python backend so the web app can use "Use Python" to compute results from `boomless_physics`.

## Install

```bash
pip install -r requirements.txt
```

## Quick Start (terminal commands)

**Windows PowerShell** (from project root):

```powershell
cd BoomlessCruiseProject
.\.venv\Scripts\Activate.ps1
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

**Linux / macOS** (from project root):

```bash
cd BoomlessCruiseProject
source .venv/bin/activate
uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

The API will be at **http://localhost:8000**.

## Run (from project root)

From the **project root** (BoomlessCruiseProject), not from inside `backend/`:

```bash
uvicorn backend.main:app --reload
```

The API will be at **http://localhost:8000**. The frontend (Vite on port 5173) will call this URL when "Use Python" is checked.

### Windows PowerShell (alternative)

If you prefer to run from inside `backend/`:

```powershell
cd backend
$env:PYTHONPATH = ".."
uvicorn main:app --reload
```

On Linux/macOS from inside `backend/`:

```bash
PYTHONPATH=.. uvicorn main:app --reload
```

## Ports

- **5173** – Vite dev server (frontend). You open the app at http://localhost:5173.
- **8000** – This FastAPI backend. Set `VITE_API_URL=http://localhost:8000` in `boomless-web/.env` so the frontend can reach it.
