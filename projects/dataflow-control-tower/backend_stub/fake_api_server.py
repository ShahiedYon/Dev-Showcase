"""
Fake API server for the DataFlow Control Tower portfolio project.

Run:
    pip install fastapi uvicorn
    uvicorn fake_api_server:app --reload --port 8088

Endpoints:
    GET /shipments
    GET /support-tickets
"""
from pathlib import Path
import json
from fastapi import FastAPI, Query

app = FastAPI(title="CourierHub + Helpdesk Mock API", version="1.0.0")
ROOT = Path(__file__).resolve().parent.parent / "data" / "raw" / "fake_api"

def load_json(name: str):
    with open(ROOT / name, "r", encoding="utf-8") as f:
        return json.load(f)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/shipments")
def shipments(status: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    data = load_json("shipments_api_response.json")
    rows = data["shipments"]
    if status:
        rows = [r for r in rows if str(r.get("status", "")).lower() == status.lower()]
    return {"count": len(rows[:limit]), "shipments": rows[:limit]}

@app.get("/support-tickets")
def support_tickets(priority: str | None = Query(default=None), limit: int = Query(default=100, ge=1, le=500)):
    data = load_json("support_tickets_api_response.json")
    rows = data["tickets"]
    if priority:
        rows = [r for r in rows if str(r.get("priority", "")).lower() == priority.lower()]
    return {"count": len(rows[:limit]), "tickets": rows[:limit]}