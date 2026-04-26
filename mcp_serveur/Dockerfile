FROM python:3.12-slim

WORKDIR /app

# Installer GPG et tar
RUN apt-get update && apt-get install -y \
    gnupg \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le serveur MCP
COPY serveur.py .

COPY api.py .

# Créer les dossiers database
RUN mkdir -p /database/backup /database/.gnupg \
    && chmod 700 /database/.gnupg

EXPOSE 8000

#CMD ["python", "serveur.py"]
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000"]
