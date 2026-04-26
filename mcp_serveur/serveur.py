from fastmcp import FastMCP
# importer gnupg pour piloter GPG
import gnupg
# pour generer une empreinte unique
import hashlib
# pour lire les metriques en temps reel
import psutil
# la base de donnees
import sqlite3
# pour lire les variables du fichier .env
import os
#
import subprocess
#
from datetime import datetime
#pour enregistrer la date et l'heure exacte de chaque log

mcp = FastMCP("Agent monitoring system")

# pour la connexion db
DB_PATH    = os.getenv("DB_PATH",    "../database/monitoring.db")
BACKUP_DIR = os.getenv("BACKUP_DIR", "../database/backup")
GPG_HOME   = os.getenv("GNUPGHOME",  "../database/.gnupg")

#Creer une table au demarrage
def init_db():
    conn = sqlite3.connect(DB_PATH)
#pour creer la table sante logs
    conn.execute("""
        CREATE TABLE IF NOT EXISTS health_logs (
            timestamp  TEXT,
            cpu        REAL,
            ram        REAL,
            disque     REAL,
            anomalie   TEXT,
            statut     TEXT
        )
    """)
#pour creer la table integrite logs
    conn.execute("""
        CREATE TABLE IF NOT EXISTS integrity_logs (
            timestamp  TEXT,
            file_path  TEXT,
            empreinte  TEXT,
            statut     TEXT
        )
    """)

#pour creer table logs backup
    conn.execute("""
        CREATE TABLE IF NOT EXISTS backup_logs (
            timestamp   TEXT,
            source_path TEXT,
            statut      TEXT
        )
    """)
    conn.commit()
    conn.close()

# outil pour interroger sur l'etat du serveur
@mcp.tool()
def get_system_health():
    """Retourne CPU, RAM, Disque en temps réel."""
#
    cpu   = psutil.cpu_percent(interval=1)
    ram   = psutil.virtual_memory()
    disk  = psutil.disk_usage("/")
#
    anomalie = None
    if cpu > 90:
        anomalie = f"CPU critique : {cpu}%"
    if ram.percent > 85:
        anomalie = f"RAM critique : {ram.percent}%"
    if disk.percent > 90:
        anomalie = f"Disque critique : {disk.percent}%"
#ajouter dans SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO health_logs VALUES (?,?,?,?,?,?)",
        (datetime.now(), cpu, ram.percent, disk.percent,
         anomalie, "CRITIQUE" if anomalie else "OK")
    )
    conn.commit()
    conn.close()
#afficher le resultat
    return {
        "cpu"     : cpu,
        "ram"     : ram.percent,
        "disque"  : disk.percent,
        "anomalie": anomalie,
        "statut"  : "CRITIQUE" if anomalie else "OK"
    }

# outil pour la sauvegarde
@mcp.tool()
def trigger_secure_backup(source_path: str):
    """Crée une sauvegarde chiffrée GPG."""
#creer l'archive tar.gz
    timestamp  = datetime.now().strftime("%Y%m%d_%H%M%S")
    archive    = f"{BACKUP_DIR}/backup_{timestamp}.tar.gz"

    subprocess.run(["tar", "-czf", archive, source_path])

# chiffrer avec GPG
    gpg        = gnupg.GPG(gnupghome=GPG_HOME)
    archive_gpg = f"{archive}.gpg"

    with open(archive, "rb") as f:
        gpg.encrypt_file(
            f,
            recipients=None,
            symmetric="AES256",
            passphrase=os.getenv("GPG_PASSPHRASE"),
            output=archive_gpg
        )
# Sauvegarder dans SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "INSERT INTO backup_logs VALUES (?,?,?)",
        (datetime.now(), source_path, "SUCCESS")
    )
    conn.commit()
    conn.close()

# Supprimer l'archive non chiffree
    os.remove(archive)
#afficher le resultat
    return {
        "statut"   : "SUCCESS",
        "fichier"  : archive_gpg,
        "timestamp": timestamp
    }


# outil pour verifier l'integrite
@mcp.tool()
def check_file_integrity(file_path: str):
    """Vérifie l'intégrité d'un fichier via SHA-256."""
#calcul de l'empreinte du fichier
    with open(file_path, "rb") as f:
        empreinte = hashlib.sha256(f.read()).hexdigest()
#comparer avec l'empreinte precedente dans SQLite
    conn = sqlite3.connect(DB_PATH)
    
    precedent = conn.execute(
        "SELECT empreinte FROM integrity_logs \
         WHERE file_path=? ORDER BY timestamp DESC LIMIT 1",
        (file_path,)
    ).fetchone()
#detecter si le fichier a changer
    if precedent is None:
        statut = "PREMIER SCAN"
    elif precedent[0] == empreinte:
        statut = "OK"
    else:
        statut = "MODIFIE"
#sauvegarder dans SQLite
    conn.execute(
        "INSERT INTO integrity_logs VALUES (?,?,?,?)",
        (datetime.now(), file_path, empreinte, statut)
    )
    conn.commit()
    conn.close()
#afficher le resultat
    return {
        "fichier"  : file_path,
        "empreinte": empreinte,
        "statut"   : statut,
        "timestamp": datetime.now().isoformat()
    }

# pour demarrer le serveur mcp
if __name__ == "__main__":
    init_db()
    mcp.run(transport="http", host="0.0.0.0", port=8000)
