from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import sys
import os

sys.path.insert(0, "/app")
from serveur import get_system_health, trigger_secure_backup, check_file_integrity, init_db

DB_PATH = os.getenv("DB_PATH", "/database/monitoring.db")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()

# ── Santé système ────────────────────────────────────
@app.get("/api/health")
def health():
    return get_system_health()

# ── KPIs ─────────────────────────────────────────────
@app.get("/api/summary")
def summary():
    conn = sqlite3.connect(DB_PATH)

    total_checks = conn.execute(
        "SELECT COUNT(*) FROM health_logs"
    ).fetchone()[0]

    critical_events = conn.execute(
        "SELECT COUNT(*) FROM health_logs WHERE statut='CRITIQUE'"
    ).fetchone()[0]

    backups_ok = conn.execute(
        "SELECT COUNT(*) FROM backup_logs WHERE statut='SUCCESS'"
    ).fetchone()[0]

    integrity_failures = conn.execute(
        "SELECT COUNT(*) FROM integrity_logs WHERE statut='MODIFIE'"
    ).fetchone()[0]

    uptime_score = round(
        max(0, 100 - (critical_events / max(total_checks, 1)) * 100), 1
    )

    # Timeline des 20 derniers événements
    timeline = conn.execute(
        "SELECT timestamp, statut, anomalie FROM health_logs ORDER BY rowid DESC LIMIT 20"
    ).fetchall()

    conn.close()

    return {
        "kpis": {
            "total_checks"      : total_checks,
            "critical_events"   : critical_events,
            "backups_ok"        : backups_ok,
            "integrity_failures": integrity_failures,
            "uptime_score"      : uptime_score,
        },
        "timeline": [
            {
                "timestamp": row[0],
                "statut"   : row[1],
                "anomalie" : row[2],
            }
            for row in timeline
        ]
    }

# ── Historique métriques ─────────────────────────────
@app.get("/api/history")
def history(limit: int = 60):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT timestamp, cpu, ram, disque FROM health_logs ORDER BY rowid DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [
        { "timestamp": r[0], "cpu": r[1], "ram": r[2], "disque": r[3] }
        for r in reversed(rows)
    ]

# ── Sauvegarde ───────────────────────────────────────
class BackupRequest(BaseModel):
    source_path: str

@app.post("/api/backup")
def backup(req: BackupRequest):
    return trigger_secure_backup(req.source_path)

@app.get("/api/backup/history")
def backup_history(limit: int = 20):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT timestamp, source_path, statut FROM backup_logs ORDER BY rowid DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [
        { "timestamp": r[0], "source_path": r[1], "statut": r[2] }
        for r in rows
    ]

# ── Intégrité ────────────────────────────────────────
class IntegrityRequest(BaseModel):
    file_path: str

@app.post("/api/integrity")
def integrity(req: IntegrityRequest):
    return check_file_integrity(req.file_path)

@app.get("/api/integrity/history")
def integrity_history(limit: int = 20):
    conn = sqlite3.connect(DB_PATH)
    rows = conn.execute(
        "SELECT timestamp, file_path, statut FROM integrity_logs ORDER BY rowid DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return [
        { "timestamp": r[0], "file_path": r[1], "statut": r[2] }
        for r in rows
    ]
