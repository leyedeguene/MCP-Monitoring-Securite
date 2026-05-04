# Serveur MCP de Monitoring & Sécurité d'Infrastructure

Ce projet vise à mettre en place un système de surveillance intelligent combinant un monitoring humain via un dashboard et un monitoring automatisé par IA via le protocole MCP.

L'idée est de transformer un simple outil de monitoring en un agent intelligent capable de rapporter l’état du système à un LLM ou à un dashboard centralisé.


## Concept

Développer un serveur MCP (en Python ou Node.js) qui expose des **Tools** et des **Resources** permettant de :

* surveiller un serveur,
* déclencher des sauvegardes sécurisées (GPG),
* vérifier l’intégrité des données en temps réel.

## Composantes techniques

### MCP Tools

Création de fonctions exposées via MCP :

* `get_system_health()`
* `trigger_secure_backup()`
* `check_file_integrity()`

### Sécurité

* Automatisation du chiffrement GPG pour les sauvegardes
* Accès via des commandes sécurisées du serveur MCP

### Infrastructure

* Serveur MCP conteneurisé avec Docker
* Déploiement simplifié dans tout environnement SI

### Alertes

* Envoi de notifications JSON-RPC via MCP en cas d’anomalie détectée

## Objectif

Moderniser la **surveillance des infrastructures** en rendant les données d’audit accessibles aux outils d’IA opérationnels (AIOps).

## Utilité en entreprise

### Pour l’administrateur système

* Surveiller plusieurs serveurs depuis une interface unique
* Détecter immédiatement les surcharges (CPU > 90 %, RAM > 85 %)
* Analyser l’historique pour identifier les pics de charge

### Pour la sécurité

* Détecter les modifications de fichiers critiques (`/etc/passwd`, `/etc/hosts`, configurations, etc.)
* Identifier précisément la date des modifications grâce aux horodatages SQLite
* Protéger les sauvegardes avec le chiffrement GPG

### Pour la conformité

* Conserver une trace des audits d’intégrité dans SQLite
* Garantir le chiffrement des données sensibles avant stockage
* Maintenir un historique complet des sauvegardes avec checksums

### Pour l’IA (AIOps)

* Interroger directement le serveur MCP
* Poser des questions comme : *« Y a-t-il des anomalies ? »*
* Automatiser les sauvegardes via des commandes en langage naturel

## Résumé

Un système de surveillance intelligent combinant :

* monitoring humain (dashboard),
* monitoring automatisé par IA (MCP).


## Technologies utilisées & missions

| Composant            | Rôle                                                            |
| -------------------- | --------------------------------------------------------------- |
| **FastMCP**          | Exposition des outils système au LLM via JSON-RPC               |
| **Python**           | Logique métier : monitoring, chiffrement GPG, audit d’intégrité |
| **FastAPI**          | API de communication entre React et le serveur MCP              |
| **SQLite**           | Stockage des logs, métriques et états système                   |
| **React + Recharts** | Dashboard de visualisation pour l’administrateur                |
| **Docker Compose**   | Conteneurisation, isolation et portabilité                      |
<img width="686" height="651" alt="Capture d&#39;écran 2026-04-24 004642" src="https://github.com/user-attachments/assets/4d851445-8913-4f95-818d-cbdf8501ba82" />
