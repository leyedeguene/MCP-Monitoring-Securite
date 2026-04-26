import { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis,
         CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API_URL = "/api";

async function fetchHealth()          { return (await fetch(`${API_URL}/health`)).json(); }
async function fetchSummary()         { return (await fetch(`${API_URL}/summary`)).json(); }
async function fetchHistory()         { return (await fetch(`${API_URL}/history`)).json(); }
async function fetchBackupHistory()   { return (await fetch(`${API_URL}/backup/history`)).json(); }
async function fetchIntegrityHistory(){ return (await fetch(`${API_URL}/integrity/history`)).json(); }

async function doBackup(source_path) {
  return (await fetch(`${API_URL}/backup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source_path }),
  })).json();
}

async function doIntegrity(file_path) {
  return (await fetch(`${API_URL}/integrity`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path }),
  })).json();
}

// ── Composants UI ────────────────────────────────────

function KpiCard({ label, value, accent = "#22d3ee" }) {
  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b",
                  borderTop: `2px solid ${accent}`, borderRadius: 8,
                  padding: "14px 18px" }}>
      <div style={{ color: "#64748b", fontFamily: "monospace",
                    fontSize: 10, letterSpacing: 1, marginBottom: 6 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ color: "#f1f5f9", fontSize: 26,
                    fontWeight: 700, fontFamily: "monospace" }}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function GaugeBar({ label, value, warn = 70, crit = 90 }) {
  const color = value >= crit ? "#ef4444"
              : value >= warn ? "#f59e0b"
              : "#22d3ee";
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between",
                    marginBottom: 4 }}>
        <span style={{ color: "#94a3b8", fontFamily: "monospace",
                       fontSize: 12 }}>{label}</span>
        <span style={{ color, fontFamily: "monospace",
                       fontSize: 13, fontWeight: 600 }}>
          {value != null ? `${value}%` : "—"}
        </span>
      </div>
      <div style={{ background: "#1e293b", borderRadius: 3, height: 6 }}>
        <div style={{ width: `${Math.min(value || 0, 100)}%`,
                      height: "100%", background: color,
                      borderRadius: 3, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

function StatusBadge({ statut }) {
  const ok = statut === "OK" || statut === "NOMINAL";
  return (
    <span style={{ background: ok ? "#0a2e1a" : "#2e0a0a",
                   color: ok ? "#4ade80" : "#f87171",
                   fontFamily: "monospace", fontSize: 10,
                   padding: "2px 8px", borderRadius: 4,
                   letterSpacing: 1 }}>
      ● {ok ? "NOMINAL" : "CRITIQUE"}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center",
                    gap: 8, marginBottom: 12 }}>
        <div style={{ width: 3, height: 14, background: "#22d3ee",
                      borderRadius: 2 }} />
        <span style={{ color: "#94a3b8", fontFamily: "monospace",
                       fontSize: 10, letterSpacing: 2 }}>
          {title.toUpperCase()}
        </span>
      </div>
      {children}
    </div>
  );
}

// ── App principale ───────────────────────────────────

export default function App() {
  const [health,           setHealth]           = useState(null);
  const [summary,          setSummary]          = useState(null);
  const [history,          setHistory]          = useState([]);
  const [backupLogs,       setBackupLogs]       = useState([]);
  const [integrityLogs,    setIntegrityLogs]    = useState([]);
  const [tab,              setTab]              = useState("dashboard");
  const [backupPath,       setBackupPath]       = useState("/etc");
  const [integrityPath,    setIntegrityPath]    = useState("/etc/passwd");
  const [actionResult,     setActionResult]     = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [autoRefresh,      setAutoRefresh]      = useState(true);

  const refreshAll = async () => {
    try {
      const [h, s, hist, bk, int] = await Promise.all([
        fetchHealth(),
        fetchSummary(),
        fetchHistory(),
        fetchBackupHistory(),
        fetchIntegrityHistory(),
      ]);
      setHealth(h);
      setSummary(s);
      setHistory(hist);
      setBackupLogs(bk);
      setIntegrityLogs(int);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refreshAll, 15000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const triggerBackup = async () => {
    setLoading(true); setActionResult(null);
    const r = await doBackup(backupPath);
    setActionResult(r); setLoading(false);
    refreshAll();
  };

  const triggerIntegrity = async () => {
    setLoading(true); setActionResult(null);
    const r = await doIntegrity(integrityPath);
    setActionResult(r); setLoading(false);
    refreshAll();
  };

  const fmtTime = (ts) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("fr-FR",
      { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const TABS = ["dashboard", "sauvegardes", "intégrité", "logs"];

  return (
    <div style={{ minHeight: "100vh", background: "#020817",
                  color: "#e2e8f0" }}>

      {/* ── Header ── */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "12px 24px",
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", background: "#0a0f1e" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%",
                        background: health?.statut === "OK" ? "#22d3ee" : "#ef4444",
                        boxShadow: `0 0 6px ${health?.statut === "OK" ? "#22d3ee" : "#ef4444"}` }} />
          <span style={{ fontFamily: "monospace", fontSize: 13,
                         color: "#94a3b8", letterSpacing: 2 }}>
            MCP MONITOR
          </span>
          <span style={{ color: "#334155" }}>|</span>
          <span style={{ fontFamily: "monospace", fontSize: 11,
                         color: "#64748b" }}>
            {health?.hostname || "prod-server-01"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {health?.statut && <StatusBadge statut={health.statut} />}
          <button onClick={() => setAutoRefresh(a => !a)}
            style={{ background: autoRefresh ? "#0c2a3a" : "transparent",
                     border: "1px solid #1e3a4a",
                     color: autoRefresh ? "#22d3ee" : "#64748b",
                     fontFamily: "monospace", fontSize: 10,
                     padding: "4px 12px", borderRadius: 4,
                     cursor: "pointer", letterSpacing: 1 }}>
            {autoRefresh ? "AUTO" : "▶ MANUEL"}
          </button>
          <button onClick={refreshAll}
            style={{ background: "transparent",
                     border: "1px solid #22d3ee33", color: "#22d3ee",
                     fontFamily: "monospace", fontSize: 10,
                     padding: "4px 12px", borderRadius: 4,
                     cursor: "pointer" }}>
            ↻ RAFRAÎCHIR
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ borderBottom: "1px solid #1e293b",
                    padding: "0 24px", display: "flex" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setActionResult(null); }}
            style={{ background: "none", border: "none",
                     borderBottom: tab === t
                       ? "2px solid #22d3ee"
                       : "2px solid transparent",
                     color: tab === t ? "#22d3ee" : "#64748b",
                     fontFamily: "monospace", fontSize: 11,
                     letterSpacing: 1, padding: "12px 18px",
                     cursor: "pointer", textTransform: "uppercase" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 24px" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && (
          <>
            {/* KPIs */}
            {summary?.kpis && (
              <div style={{ display: "grid",
                            gridTemplateColumns: "repeat(5, 1fr)",
                            gap: 12, marginBottom: 20 }}>
                <KpiCard label="Checks total"
                         value={summary.kpis.total_checks} />
                <KpiCard label="Événements critiques"
                         value={summary.kpis.critical_events}
                         accent="#ef4444" />
                <KpiCard label="Sauvegardes OK"
                         value={summary.kpis.backups_ok}
                         accent="#22d3ee" />
                <KpiCard label="Échecs intégrité"
                         value={summary.kpis.integrity_failures}
                         accent="#f59e0b" />
                <KpiCard label="Score uptime"
                         value={`${summary.kpis.uptime_score}%`}
                         accent="#4ade80" />
              </div>
            )}

            <div style={{ display: "grid",
                          gridTemplateColumns: "280px 1fr",
                          gap: 16, marginBottom: 16 }}>

              {/* Jauges */}
              <div style={{ background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 8, padding: 16 }}>
                <Section title="Santé système">
                  <GaugeBar label="CPU"    value={health?.cpu} />
                  <GaugeBar label="RAM"    value={health?.ram}
                            warn={80} crit={90} />
                  <GaugeBar label="DISQUE" value={health?.disque}
                            warn={80} crit={90} />
                  <div style={{ borderTop: "1px solid #1e293b",
                                paddingTop: 12, marginTop: 4 }}>
                    {[
                      ["OS",        health?.os || "Linux"],
                      ["Processus", health?.processes_count],
                      ["Uptime",    health?.uptime_hours
                                    ? `${health.uptime_hours}h` : "—"],
                      ["Réseau ↑",  health?.net_sent],
                      ["Réseau ↓",  health?.net_recv],
                    ].map(([k, v]) => (
                      <div key={k} style={{ display: "flex",
                                            justifyContent: "space-between",
                                            marginBottom: 6 }}>
                        <span style={{ color: "#64748b", fontSize: 12 }}>
                          {k}
                        </span>
                        <span style={{ color: "#94a3b8",
                                       fontFamily: "monospace",
                                       fontSize: 12 }}>
                          {v ?? "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                  {health?.anomalie && (
                    <div style={{ marginTop: 10, background: "#2e0a0a",
                                  border: "1px solid #ef444433",
                                  borderRadius: 6, padding: "8px 10px",
                                  fontSize: 11, color: "#f87171",
                                  fontFamily: "monospace" }}>
                      ⚠ {health.anomalie}
                    </div>
                  )}
                </Section>
              </div>

              {/* Graphique */}
              <div style={{ background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 8, padding: 16 }}>
                <Section title="Historique métriques">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={history}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        {[["cpu","#22d3ee"],["ram","#a78bfa"],
                          ["disque","#fb923c"]].map(([k,c]) => (
                          <linearGradient key={k} id={`g-${k}`}
                            x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={c}
                                  stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={c}
                                  stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3"
                                     stroke="#1e293b" />
                      <XAxis dataKey="timestamp"
                        tickFormatter={fmtTime}
                        tick={{ fill: "#475569", fontSize: 9 }}
                        interval="preserveStartEnd" />
                      <YAxis domain={[0,100]}
                        tick={{ fill: "#475569", fontSize: 9 }} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a",
                                        border: "1px solid #1e293b",
                                        fontSize: 11 }}
                        labelFormatter={fmtTime} />
                      <Area type="monotone" dataKey="cpu"
                        stroke="#22d3ee" fill="url(#g-cpu)"
                        strokeWidth={1.5} dot={false} name="CPU %" />
                      <Area type="monotone" dataKey="ram"
                        stroke="#a78bfa" fill="url(#g-ram)"
                        strokeWidth={1.5} dot={false} name="RAM %" />
                      <Area type="monotone" dataKey="disque"
                        stroke="#fb923c" fill="url(#g-disque)"
                        strokeWidth={1.5} dot={false} name="Disque %" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    {[["CPU","#22d3ee"],["RAM","#a78bfa"],
                      ["Disque","#fb923c"]].map(([l,c]) => (
                      <div key={l} style={{ display: "flex",
                                           alignItems: "center", gap: 6 }}>
                        <div style={{ width: 16, height: 2,
                                      background: c }} />
                        <span style={{ color: "#64748b", fontSize: 11 }}>
                          {l}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>
              </div>
            </div>

            {/* Timeline */}
            {summary?.timeline?.length > 0 && (
              <div style={{ background: "#0f172a",
                            border: "1px solid #1e293b",
                            borderRadius: 8, padding: 16 }}>
                <Section title="Timeline des événements récents">
                  {summary.timeline.map((e, i) => (
                    <div key={i}
                      style={{ display: "flex", alignItems: "center",
                               gap: 12, padding: "6px 0",
                               borderBottom: "1px solid #0f172a" }}>
                      <span style={{ color: "#475569",
                                     fontFamily: "monospace",
                                     fontSize: 11, minWidth: 70 }}>
                        {fmtTime(e.timestamp)}
                      </span>
                      <StatusBadge statut={e.statut} />
                      <span style={{ color: e.anomalie
                                       ? "#f87171" : "#64748b",
                                     fontSize: 12,
                                     fontFamily: "monospace" }}>
                        {e.anomalie || "Système nominal"}
                      </span>
                    </div>
                  ))}
                </Section>
              </div>
            )}
          </>
        )}

        {/* ── SAUVEGARDES ── */}
        {tab === "sauvegardes" && (
          <div style={{ display: "grid",
                        gridTemplateColumns: "320px 1fr", gap: 16 }}>
            <div style={{ background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8, padding: 16 }}>
              <Section title="Déclencher une sauvegarde">
                <input value={backupPath}
                  onChange={e => setBackupPath(e.target.value)}
                  style={{ width: "100%", background: "#020817",
                           border: "1px solid #1e293b", borderRadius: 6,
                           color: "#e2e8f0", fontFamily: "monospace",
                           fontSize: 13, padding: "10px 12px",
                           marginBottom: 12, boxSizing: "border-box" }} />
                <button onClick={triggerBackup} disabled={loading}
                  style={{ width: "100%", background: "#0c2a3a",
                           border: "1px solid #22d3ee44",
                           color: loading ? "#475569" : "#22d3ee",
                           fontFamily: "monospace", fontSize: 11,
                           padding: 12, borderRadius: 6,
                           cursor: loading ? "not-allowed" : "pointer",
                           letterSpacing: 1 }}>
                  {loading ? "EN COURS..." : "LANCER SAUVEGARDE GPG"}
                </button>
                {actionResult && (
                  <pre style={{ marginTop: 12, color: "#94a3b8",
                                fontFamily: "monospace", fontSize: 10,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all" }}>
                    {JSON.stringify(actionResult, null, 2)}
                  </pre>
                )}
              </Section>
            </div>
            <div style={{ background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8, padding: 16 }}>
              <Section title="Historique des sauvegardes">
                <table style={{ width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Horodatage","Source","Statut"].map(h => (
                        <th key={h} style={{ color: "#475569",
                          fontFamily: "monospace", fontSize: 10,
                          letterSpacing: 1, padding: "6px 10px",
                          textAlign: "left", fontWeight: 500 }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backupLogs.map((b, i) => (
                      <tr key={i}
                        style={{ borderBottom: "1px solid #0f172a" }}>
                        <td style={{ color: "#64748b",
                                     fontFamily: "monospace",
                                     fontSize: 11, padding: "8px 10px" }}>
                          {fmtTime(b.timestamp)}
                        </td>
                        <td style={{ color: "#94a3b8",
                                     fontFamily: "monospace",
                                     fontSize: 11, padding: "8px 10px" }}>
                          {b.source_path}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <StatusBadge statut={b.statut} />
                        </td>
                      </tr>
                    ))}
                    {backupLogs.length === 0 && (
                      <tr><td colSpan={3}
                        style={{ color: "#475569",
                                 fontFamily: "monospace",
                                 fontSize: 12, padding: 16,
                                 textAlign: "center" }}>
                        Aucune sauvegarde
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </Section>
            </div>
          </div>
        )}

        {/* ── INTÉGRITÉ ── */}
        {tab === "intégrité" && (
          <div style={{ display: "grid",
                        gridTemplateColumns: "320px 1fr", gap: 16 }}>
            <div style={{ background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8, padding: 16 }}>
              <Section title="Vérifier un fichier">
                <input value={integrityPath}
                  onChange={e => setIntegrityPath(e.target.value)}
                  style={{ width: "100%", background: "#020817",
                           border: "1px solid #1e293b", borderRadius: 6,
                           color: "#e2e8f0", fontFamily: "monospace",
                           fontSize: 13, padding: "10px 12px",
                           marginBottom: 12, boxSizing: "border-box" }} />
                <button onClick={triggerIntegrity} disabled={loading}
                  style={{ width: "100%", background: "#0a2e1a",
                           border: "1px solid #22d3ee44",
                           color: loading ? "#475569" : "#4ade80",
                           fontFamily: "monospace", fontSize: 11,
                           padding: 12, borderRadius: 6,
                           cursor: loading ? "not-allowed" : "pointer",
                           letterSpacing: 1 }}>
                  {loading ? "CALCUL..." : "VÉRIFIER SHA-256"}
                </button>
                {actionResult && (
                  <pre style={{ marginTop: 12, color: "#94a3b8",
                                fontFamily: "monospace", fontSize: 10,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all" }}>
                    {JSON.stringify(actionResult, null, 2)}
                  </pre>
                )}
              </Section>
            </div>
            <div style={{ background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 8, padding: 16 }}>
              <Section title="Historique des audits">
                <table style={{ width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1e293b" }}>
                      {["Horodatage","Fichier","Statut"].map(h => (
                        <th key={h} style={{ color: "#475569",
                          fontFamily: "monospace", fontSize: 10,
                          letterSpacing: 1, padding: "6px 10px",
                          textAlign: "left", fontWeight: 500 }}>
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {integrityLogs.map((r, i) => (
                      <tr key={i}
                        style={{ borderBottom: "1px solid #0f172a" }}>
                        <td style={{ color: "#64748b",
                                     fontFamily: "monospace",
                                     fontSize: 11, padding: "8px 10px" }}>
                          {fmtTime(r.timestamp)}
                        </td>
                        <td style={{ color: "#94a3b8",
                                     fontFamily: "monospace",
                                     fontSize: 11, padding: "8px 10px" }}>
                          {r.file_path}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <StatusBadge statut={r.statut} />
                        </td>
                      </tr>
                    ))}
                    {integrityLogs.length === 0 && (
                      <tr><td colSpan={3}
                        style={{ color: "#475569",
                                 fontFamily: "monospace",
                                 fontSize: 12, padding: 16,
                                 textAlign: "center" }}>
                        Aucun audit
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </Section>
            </div>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab === "logs" && (
          <div style={{ background: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: 8, padding: 16 }}>
            <Section title="Logs bruts — 20 derniers checks">
              {summary?.timeline?.length > 0
                ? summary.timeline.map((e, i) => (
                  <div key={i}
                    style={{ display: "flex", gap: 12,
                             alignItems: "center", padding: "7px 0",
                             borderBottom: "1px solid #0f172a" }}>
                    <span style={{ color: "#334155",
                                   fontFamily: "monospace",
                                   fontSize: 11, minWidth: 22 }}>
                      {String(i+1).padStart(2,"0")}
                    </span>
                    <span style={{ color: "#475569",
                                   fontFamily: "monospace",
                                   fontSize: 11, minWidth: 70 }}>
                      {fmtTime(e.timestamp)}
                    </span>
                    <StatusBadge statut={e.statut} />
                    <span style={{ color: e.anomalie
                                     ? "#f87171" : "#475569",
                                   fontFamily: "monospace",
                                   fontSize: 11 }}>
                      {e.anomalie || "— nominal"}
                    </span>
                  </div>
                ))
                : <div style={{ color: "#475569", fontSize: 12,
                                fontFamily: "monospace" }}>
                    Aucun log disponible
                  </div>
              }
            </Section>
          </div>
        )}

      </div>
    </div>
  );
}
