"use client";

import { useEffect, useState } from "react";
import { STAGES, DEFAULT_STAGE } from "../lib/stages";

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  return res.json();
}

// "3d ago" / "5h ago" — how long since a task was last touched.
function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor(ms / 3600000);
  if (hours > 0) return `${hours}h ago`;
  return "just now";
}

function ageColor(iso) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days >= 4) return "var(--p1)";
  if (days >= 2) return "var(--p2)";
  return "var(--muted)";
}

const lastTouched = (t) => t.updated_at || t.created_at;

// Attention score, 0–100: what deserves your eyes first. Transparent math —
// priority is the big lever, neglect and "waiting on you" add pressure.
function attentionScore(t) {
  let s = (6 - (t.priority || 3)) * 18; // P1=90 … P5=18
  const days = (Date.now() - new Date(lastTouched(t)).getTime()) / 86400000;
  s += Math.min(days * 4, 20); // untouched work grows louder
  if (t.stage === "review") s += 8; // blocked on you
  if (!t.next_step) s += 6; // undefined next action
  return Math.round(Math.min(s, 100));
}

function scoreReasons(t) {
  const parts = [`P${t.priority || 3}`];
  const days = Math.floor((Date.now() - new Date(lastTouched(t)).getTime()) / 86400000);
  if (t.stage === "review") parts.push("waiting on you");
  if (days >= 2) parts.push(`${days}d untouched`);
  if (!t.next_step) parts.push("no next step");
  return parts.join(" · ");
}

function scoreColors(score) {
  if (score >= 75) return { color: "#c0392b", background: "#fdecea" };
  if (score >= 50) return { color: "#b07d2a", background: "#fbf3e4" };
  return { color: "#3a6b5c", background: "#eef2ef" };
}

function parseHandoff(text) {
  const grab = (k) => {
    const m = text.match(new RegExp(`^\\s*${k}\\s*:\\s*(.+)$`, "mi"));
    return m ? m[1].trim() : "";
  };
  return {
    task_id: grab("task"),
    summary: grab("did") || grab("summary"),
    next_step: grab("next"),
    stage: grab("stage"),
    source: "pasted-handoff",
  };
}

function groupByDay(entries) {
  const groups = [];
  for (const e of entries) {
    const day = new Date(e.created_at).toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }
  return groups;
}

// Collapsible section with persisted open/closed state.
function Section({ id, title, count, defaultOpen, open, setOpen, children, extra }) {
  const isOpen = open[id] ?? defaultOpen;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button className="section-head" onClick={() => setOpen({ ...open, [id]: !isOpen })} style={{ flex: 1 }}>
          <span className="section-title">{title}</span>
          {count !== undefined && <span className="section-count">{count}</span>}
          <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
        </button>
        {extra}
      </div>
      {isOpen && <div className="section-body">{children}</div>}
    </div>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [ideaSource, setIdeaSource] = useState("");
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", project: "", next_step: "", notes: "", priority: 3 });
  const [loggingId, setLoggingId] = useState(null);
  const [logDraft, setLogDraft] = useState({ summary: "", next_step: "", stage: "" });
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [tab, setTab] = useState("All");
  const [open, setOpen] = useState({});

  // Restore tab + section state after mount (avoids SSR/localStorage mismatch).
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("hub.tab");
      if (savedTab) setTab(savedTab);
      const savedOpen = localStorage.getItem("hub.sections");
      if (savedOpen) setOpen(JSON.parse(savedOpen));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("hub.tab", tab);
      localStorage.setItem("hub.sections", JSON.stringify(open));
    } catch {}
  }, [tab, open]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [t, i, l] = await Promise.all([api("/api/tasks"), api("/api/ideas"), api("/api/log")]);
      setTasks(t.tasks || []);
      setIdeas(i.ideas || []);
      setLog(l.log || []);
    } catch (err) {
      setError(err.message || "Something went wrong loading your hub.");
    } finally {
      setLoading(false);
    }
  }

  async function mutate(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await loadAll();
    } catch (err) {
      setError(err.message || "That change didn't save.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await mutate(async () => {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          stage: DEFAULT_STAGE,
          project: tab !== "All" ? tab : taskProject,
        }),
      });
      setTaskTitle("");
      setTaskProject("");
    });
  }

  async function moveTask(id, stage) {
    await mutate(() => api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) }));
  }

  async function deleteTask(id) {
    await mutate(() => api(`/api/tasks/${id}`, { method: "DELETE" }));
  }

  async function cyclePriority(t) {
    const next = ((t.priority || 3) % 5) + 1;
    await mutate(() =>
      api(`/api/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ priority: next }) })
    );
  }

  async function toggleAutopilot(t) {
    await mutate(async () => {
      await api(`/api/tasks/${t.id}`, {
        method: "PATCH",
        body: JSON.stringify({ autopilot: !t.autopilot }),
      });
      setNotice(
        t.autopilot
          ? "Removed from the Claude autopilot queue."
          : "Queued for Claude — autopilot picks this up on its next run."
      );
    });
  }

  function startEdit(t) {
    setEditingId(t.id);
    setDraft({
      title: t.title,
      project: t.project || "",
      next_step: t.next_step || "",
      notes: t.notes || "",
      priority: t.priority || 3,
    });
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    await mutate(async () => {
      await api(`/api/tasks/${editingId}`, { method: "PATCH", body: JSON.stringify(draft) });
      setEditingId(null);
    });
  }

  function startLog(t) {
    setLoggingId(t.id);
    setLogDraft({ summary: "", next_step: t.next_step || "", stage: t.stage });
  }

  async function saveLog(e) {
    e.preventDefault();
    if (!logDraft.summary.trim()) return;
    await mutate(async () => {
      await api("/api/handoff", {
        method: "POST",
        body: JSON.stringify({ task_id: loggingId, ...logDraft, source: "hub" }),
      });
      setLoggingId(null);
    });
  }

  async function applyPaste(e) {
    e.preventDefault();
    const parsed = parseHandoff(pasteText);
    if (!parsed.summary) {
      setError('Could not find a "did:" line in that block.');
      return;
    }
    await mutate(async () => {
      await api("/api/handoff", { method: "POST", body: JSON.stringify(parsed) });
      setPasteText("");
      setShowPaste(false);
      setNotice("Handoff applied — task and log updated.");
    });
  }

  async function copyPrompt(t) {
    try {
      const res = await fetch(`/api/continue/${t.id}?copy=1`);
      await navigator.clipboard.writeText(await res.text());
      setNotice("Handoff prompt copied — paste it into any Claude session.");
    } catch {
      setError("Couldn't copy the prompt.");
    }
  }

  async function addIdea(e) {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    await mutate(async () => {
      await api("/api/ideas", {
        method: "POST",
        body: JSON.stringify({ title: ideaTitle, notes: ideaNotes, source: ideaSource }),
      });
      setIdeaTitle("");
      setIdeaNotes("");
      setIdeaSource("");
      setShowIdeaForm(false);
    });
  }

  async function deleteIdea(id) {
    await mutate(() => api(`/api/ideas/${id}`, { method: "DELETE" }));
  }

  async function promoteIdea(idea) {
    await mutate(async () => {
      await api("/api/tasks", {
        method: "POST",
        body: JSON.stringify({ title: idea.title, stage: "idea", notes: idea.notes || "" }),
      });
      await api(`/api/ideas/${idea.id}`, { method: "DELETE" });
      setNotice("Idea promoted to a task on the board.");
    });
  }

  // ---- derived views ----
  const projects = [...new Set(tasks.map((t) => t.project).filter(Boolean))].sort();
  const inTab = (t) => tab === "All" || t.project === tab;
  const visibleTasks = tasks.filter(inTab);

  const projectOf = {};
  for (const t of tasks) projectOf[t.id] = t.project;
  const visibleLog = log.filter(
    (e) => tab === "All" || (e.task_id && projectOf[e.task_id] === tab)
  );

  const active = visibleTasks
    .filter((t) => t.stage === "in_dev" || t.stage === "review")
    .sort((a, b) => attentionScore(b) - attentionScore(a));
  const focus = active.slice(0, 3);
  const restActive = active.slice(3);
  const queued = tasks.filter((t) => t.autopilot);

  const prioPill = (t) => (
    <button
      className={`pill p${t.priority || 3}`}
      disabled={busy}
      onClick={() => cyclePriority(t)}
      title="Priority — tap to cycle P1→P5"
    >
      P{t.priority || 3}
    </button>
  );

  const claudeButtons = (t) => (
    <>
      <a
        href={`/api/continue/${t.id}`}
        target="_blank"
        rel="noreferrer"
        className="btn-small"
        style={{ ...smallBtnStyle, background: "var(--accent)", color: "#fff", textDecoration: "none", display: "inline-block", border: "1px solid var(--accent)" }}
      >
        ▶ Continue in Claude
      </a>
      <button onClick={() => copyPrompt(t)} disabled={busy} className="btn-small" style={smallBtnStyle} title="Copy the handoff prompt for any Claude session">
        ⧉ Prompt
      </button>
      <button onClick={() => startLog(t)} disabled={busy} className="btn-small" style={smallBtnStyle}>
        📝 Log
      </button>
      <button
        onClick={() => toggleAutopilot(t)}
        disabled={busy}
        className="btn-small"
        style={{ ...smallBtnStyle, ...(t.autopilot ? { background: "#3b3a56", color: "#fff", borderColor: "#3b3a56" } : {}) }}
        title="Queue for the morning Claude autopilot"
      >
        🤖 {t.autopilot ? "Queued" : "Autopilot"}
      </button>
    </>
  );

  const logForm = (t) =>
    loggingId === t.id && (
      <form onSubmit={saveLog} style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        <input
          value={logDraft.summary}
          onChange={(e) => setLogDraft({ ...logDraft, summary: e.target.value })}
          placeholder="What happened? (one line)"
          style={smallInputStyle}
          autoFocus
        />
        <input
          value={logDraft.next_step}
          onChange={(e) => setLogDraft({ ...logDraft, next_step: e.target.value })}
          placeholder="New next step"
          style={smallInputStyle}
        />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <select
            value={logDraft.stage}
            onChange={(e) => setLogDraft({ ...logDraft, stage: e.target.value })}
            style={{ ...smallInputStyle, flex: "0 1 auto" }}
          >
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <button type="submit" disabled={busy} className="btn-small" style={smallBtnStyle}>Save</button>
          <button type="button" onClick={() => setLoggingId(null)} className="btn-small" style={smallBtnStyle}>Cancel</button>
        </div>
      </form>
    );

  const editForm = (t) => (
    <form onSubmit={saveEdit} style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
      <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" style={smallInputStyle} />
      <div style={{ display: "flex", gap: 6 }}>
        <input value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} placeholder="Project" style={{ ...smallInputStyle, flex: 2 }} />
        <select
          value={draft.priority}
          onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })}
          style={{ ...smallInputStyle, flex: 1 }}
        >
          {[1, 2, 3, 4, 5].map((p) => (
            <option key={p} value={p}>P{p} {p === 1 ? "— do first" : p === 5 ? "— someday" : ""}</option>
          ))}
        </select>
      </div>
      <input value={draft.next_step} onChange={(e) => setDraft({ ...draft, next_step: e.target.value })} placeholder="Next step — the very next concrete action" style={smallInputStyle} />
      <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes / where things stand" rows={3} style={{ ...smallInputStyle, resize: "vertical" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button type="submit" disabled={busy} className="btn-small" style={smallBtnStyle}>Save</button>
        <button type="button" onClick={() => setEditingId(null)} className="btn-small" style={smallBtnStyle}>Cancel</button>
      </div>
    </form>
  );

  return (
    <div style={{ maxWidth: 940, margin: "0 auto", padding: "24px 16px 60px" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: "1.55rem", margin: 0, letterSpacing: "-0.02em" }}>My Work Hub</h1>
        <button onClick={() => setShowPaste(!showPaste)} className="btn-small" style={smallBtnStyle}>
          📥 Paste handoff
        </button>
      </div>
      <div style={{ color: "var(--muted)", fontSize: "0.92rem", margin: "4px 0 16px" }}>
        {loading
          ? "Loading..."
          : `${tasks.length} tasks · ${ideas.length} ideas${queued.length ? ` · 🤖 ${queued.length} queued for Claude` : ""}`}
      </div>

      {/* PROJECT TABS */}
      {!loading && (
        <div className="tabs">
          {["All", ...projects].map((p) => {
            const n =
              p === "All"
                ? tasks.filter((t) => t.stage === "in_dev" || t.stage === "review").length
                : tasks.filter((t) => t.project === p && (t.stage === "in_dev" || t.stage === "review")).length;
            return (
              <button key={p} className={`tab ${tab === p ? "active" : ""}`} onClick={() => setTab(p)}>
                {p}
                {n > 0 && <span className="count">{n}</span>}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div style={bannerStyle("#fdecea", "#f3b4ab", "#8a2e22")}>
          Something went wrong: {error}
          <button onClick={loadAll} style={{ marginLeft: 10, background: "none", border: "none", color: "#8a2e22", textDecoration: "underline", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}
      {notice && <div style={bannerStyle("#eef6ef", "#cfe3d3", "#2c5e3a")}>{notice}</div>}

      {showPaste && (
        <form onSubmit={applyPaste} className="card fade-in" style={{ padding: 14, marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Paste the HANDOFF block a Claude session gave you — it updates the task and the log in one go.
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"HANDOFF\ntask: …\ndid: …\nnext: …\nstage: in_dev"}
            rows={5}
            style={{ ...smallInputStyle, resize: "vertical", fontFamily: "monospace" }}
            autoFocus
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button type="submit" disabled={busy} className="btn-small" style={smallBtnStyle}>Apply</button>
            <button type="button" onClick={() => setShowPaste(false)} className="btn-small" style={smallBtnStyle}>Cancel</button>
          </div>
        </form>
      )}

      {/* FOCUS — top attention scores, always visible */}
      {!loading && (
        <div style={{ marginBottom: 30 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>🎯 Focus</div>
          {focus.length === 0 && (
            <div style={{ color: "var(--muted)", fontStyle: "italic" }}>
              Nothing in flight{tab !== "All" ? ` for ${tab}` : ""}. Pull something from the pipeline below.
            </div>
          )}
          {focus.map((t, rank) => {
            const score = attentionScore(t);
            return (
              <div
                key={t.id}
                className="card card-hover fade-in"
                style={{
                  padding: "14px 16px",
                  marginBottom: 10,
                  borderLeft: `4px solid var(--p${t.priority || 3})`,
                  opacity: rank === 0 ? 1 : 0.96,
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div className="score-ring" style={scoreColors(score)} title="Attention score">
                    {score}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700, fontSize: rank === 0 ? "1.05rem" : "0.98rem" }}>
                        {t.title}
                        {t.project && <span style={chipStyle}>{t.project}</span>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {prioPill(t)}
                        <span style={{ color: ageColor(lastTouched(t)), fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                          {timeAgo(lastTouched(t))}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 3, fontSize: "0.9rem" }}>
                      {t.next_step ? (
                        <span>→ {t.next_step}</span>
                      ) : (
                        <span style={{ color: "var(--p2)", fontStyle: "italic" }}>No next step written down.</span>
                      )}
                    </div>
                    <div style={{ marginTop: 3, fontSize: "0.75rem", color: "var(--muted)" }}>{scoreReasons(t)}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{claudeButtons(t)}</div>
                    {logForm(t)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REST OF IN-FLIGHT */}
      {!loading && restActive.length > 0 && (
        <Section id="active" title="📍 Also in flight" count={restActive.length} defaultOpen={true} open={open} setOpen={setOpen}>
          {restActive.map((t) => (
            <div key={t.id} className="card card-hover" style={{ padding: "10px 14px", marginBottom: 8, borderLeft: `4px solid var(--p${t.priority || 3})` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 600, fontSize: "0.93rem" }}>
                  {t.title}
                  {t.project && <span style={chipStyle}>{t.project}</span>}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {prioPill(t)}
                  <span style={{ color: ageColor(lastTouched(t)), fontSize: "0.75rem" }}>{timeAgo(lastTouched(t))}</span>
                </div>
              </div>
              {t.next_step && <div style={{ marginTop: 2, fontSize: "0.85rem", color: "var(--muted)" }}>→ {t.next_step}</div>}
              <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>{claudeButtons(t)}</div>
              {logForm(t)}
            </div>
          ))}
        </Section>
      )}

      {/* PIPELINE BOARD */}
      {!loading && (
        <Section id="pipeline" title="✅ Pipeline" count={visibleTasks.length} defaultOpen={true} open={open} setOpen={setOpen}>
          <form onSubmit={addTask} style={{ display: "flex", gap: 8, margin: "10px 0 16px", flexWrap: "wrap" }}>
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder={tab !== "All" ? `Add a task to ${tab}...` : "Add a task..."}
              style={{ ...inputStyle, flex: "2 1 200px" }}
            />
            {tab === "All" && (
              <input
                value={taskProject}
                onChange={(e) => setTaskProject(e.target.value)}
                placeholder="Project (optional)"
                style={{ ...inputStyle, flex: "1 1 120px" }}
              />
            )}
            <button type="submit" disabled={busy} className="btn" style={busy ? disabledBtnStyle : buttonStyle}>Add</button>
          </form>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
            {STAGES.map((stage) => (
              <div key={stage.key} className="card" style={{ padding: 13, borderTop: `4px solid var(--${stage.cls})` }}>
                <div style={{ fontWeight: 700, fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", marginBottom: 10 }}>
                  {stage.label}
                </div>
                {visibleTasks.filter((t) => t.stage === stage.key).length === 0 && (
                  <div style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.88rem" }}>Nothing here.</div>
                )}
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {visibleTasks
                    .filter((t) => t.stage === stage.key)
                    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
                    .map((t) => (
                      <li key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "0.92rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 6, alignItems: "baseline" }}>
                          <div>
                            {t.autopilot && <span title="Queued for Claude autopilot">🤖 </span>}
                            {t.title}
                            {tab === "All" && t.project && <span style={chipStyle}>{t.project}</span>}
                          </div>
                          {prioPill(t)}
                        </div>
                        {t.next_step && editingId !== t.id && (
                          <div style={{ marginTop: 2, fontSize: "0.83rem", color: "var(--muted)" }}>→ {t.next_step}</div>
                        )}
                        {editingId === t.id ? (
                          editForm(t)
                        ) : (
                          <>
                            {t.notes && (
                              <details style={{ marginTop: 3 }}>
                                <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.8rem" }}>notes</summary>
                                <div style={{ marginTop: 3, fontSize: "0.84rem", color: "var(--muted)", whiteSpace: "pre-wrap" }}>{t.notes}</div>
                              </details>
                            )}
                            <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                              {STAGES.filter((s) => s.key !== stage.key).map((s) => (
                                <button key={s.key} onClick={() => moveTask(t.id, s.key)} disabled={busy} className="btn-small" style={smallBtnStyle}>
                                  → {s.label}
                                </button>
                              ))}
                              <button onClick={() => startEdit(t)} disabled={busy} className="btn-small" style={smallBtnStyle}>Edit</button>
                              <button onClick={() => deleteTask(t.id)} disabled={busy} className="btn-small" style={{ ...smallBtnStyle, color: "#c0392b" }}>Delete</button>
                            </div>
                            <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>{claudeButtons(t)}</div>
                            {logForm(t)}
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* SESSION LOG */}
      {!loading && (
        <Section id="log" title="📓 Session log" count={visibleLog.length} defaultOpen={false} open={open} setOpen={setOpen}>
          <div className="card" style={{ padding: 16, marginTop: 8 }}>
            {visibleLog.length === 0 && (
              <div style={{ color: "var(--muted)", fontStyle: "italic" }}>
                No sessions logged{tab !== "All" ? ` for ${tab}` : ""} yet.
              </div>
            )}
            {groupByDay(visibleLog).map((group) => (
              <div key={group.day} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--muted)", margin: "6px 0" }}>
                  {group.day}
                </div>
                {group.items.map((e) => (
                  <div key={e.id} style={{ padding: "6px 0", borderBottom: "1px dashed var(--border)", fontSize: "0.88rem" }}>
                    <div>
                      {e.tasks?.title && <strong>{e.tasks.title}: </strong>}
                      {e.summary}
                      {e.source && <span style={{ ...chipStyle, marginLeft: 6 }}>{e.source}</span>}
                    </div>
                    {e.next_step && <div style={{ color: "var(--muted)", fontSize: "0.83rem", marginTop: 2 }}>→ next: {e.next_step}</div>}
                    {e.details && (
                      <details style={{ marginTop: 2 }}>
                        <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.83rem" }}>details</summary>
                        <div style={{ whiteSpace: "pre-wrap", fontSize: "0.86rem", marginTop: 4 }}>{e.details}</div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* IDEAS */}
      {!loading && (
        <Section id="ideas" title="💡 Ideas Box" count={ideas.length} defaultOpen={false} open={open} setOpen={setOpen}>
          <div style={{ margin: "10px 0" }}>
            {!showIdeaForm ? (
              <button onClick={() => setShowIdeaForm(true)} className="btn" style={buttonStyle}>+ Add an idea</button>
            ) : (
              <form onSubmit={addIdea} className="card" style={{ padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="Idea title" style={inputStyle} autoFocus />
                <textarea value={ideaNotes} onChange={(e) => setIdeaNotes(e.target.value)} placeholder="Details / notes" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
                <input value={ideaSource} onChange={(e) => setIdeaSource(e.target.value)} placeholder="Source (optional)" style={inputStyle} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={busy} className="btn" style={busy ? disabledBtnStyle : buttonStyle}>Save idea</button>
                  <button type="button" onClick={() => setShowIdeaForm(false)} className="btn" style={{ ...buttonStyle, background: "#fff", color: "var(--text)", border: "1px solid var(--border)" }}>Cancel</button>
                </div>
              </form>
            )}
          </div>
          <div className="card" style={{ padding: 16, borderLeft: "4px solid var(--idea)" }}>
            {ideas.length === 0 && <div style={{ color: "var(--muted)", fontStyle: "italic" }}>No ideas saved yet.</div>}
            {ideas.map((idea) => (
              <div key={idea.id} style={{ padding: "10px 0", borderBottom: "1px dashed var(--border)" }}>
                <div style={{ fontWeight: 600 }}>{idea.title}</div>
                {idea.notes && (
                  <details style={{ marginTop: 3 }}>
                    <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem" }}>notes</summary>
                    <div style={{ marginTop: 4, fontSize: "0.9rem", whiteSpace: "pre-wrap" }}>{idea.notes}</div>
                  </details>
                )}
                <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.78rem" }}>
                    {idea.source || "No source noted"} · {new Date(idea.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => promoteIdea(idea)} disabled={busy} className="btn-small" style={smallBtnStyle} title="Turn this idea into a task">
                      ↗ Make it a task
                    </button>
                    <button onClick={() => deleteIdea(idea.id)} disabled={busy} className="btn-small" style={{ ...smallBtnStyle, color: "#c0392b" }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

const bannerStyle = (bg, border, color) => ({
  background: bg,
  border: `1px solid ${border}`,
  color,
  borderRadius: 8,
  padding: "10px 14px",
  marginBottom: 20,
  fontSize: "0.9rem",
});

const inputStyle = {
  flex: 1,
  padding: "10px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: "0.95rem",
  fontFamily: "inherit",
  background: "#fff",
};

const smallInputStyle = {
  ...inputStyle,
  padding: "6px 8px",
  fontSize: "0.85rem",
};

const buttonStyle = {
  padding: "10px 16px",
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: "0.95rem",
};

const disabledBtnStyle = {
  ...buttonStyle,
  opacity: 0.6,
};

const smallBtnStyle = {
  padding: "4px 9px",
  background: "#f2f0ea",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.75rem",
};

const chipStyle = {
  display: "inline-block",
  marginLeft: 8,
  padding: "1px 8px",
  borderRadius: 999,
  fontSize: "0.7rem",
  fontWeight: 600,
  background: "var(--accent-soft)",
  color: "var(--accent)",
  border: "1px solid #d5e0d9",
  verticalAlign: "middle",
};
