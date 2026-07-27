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

// Untouched work slowly turns amber, then red.
function ageColor(iso) {
  const days = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (days >= 4) return "#c0392b";
  if (days >= 2) return "#b07d2a";
  return "var(--muted)";
}

const lastTouched = (t) => t.updated_at || t.created_at;

// Parses the HANDOFF block a Claude session prints at the end:
//   HANDOFF / task: … / did: … / next: … / stage: …
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
  const [draft, setDraft] = useState({ title: "", project: "", next_step: "", notes: "" });
  const [loggingId, setLoggingId] = useState(null);
  const [logDraft, setLogDraft] = useState({ summary: "", next_step: "", stage: "" });
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [t, i, l] = await Promise.all([
        api("/api/tasks"),
        api("/api/ideas"),
        api("/api/log"),
      ]);
      setTasks(t.tasks || []);
      setIdeas(i.ideas || []);
      setLog(l.log || []);
    } catch (err) {
      setError(err.message || "Something went wrong loading your hub.");
    } finally {
      setLoading(false);
    }
  }

  // Every write goes through here so a failed request always surfaces an
  // error instead of silently doing nothing, and so a slow request can't be
  // double-submitted. Any state reset (clearing an input) happens inside the
  // callback, i.e. only once the write actually succeeded.
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
        body: JSON.stringify({ title: taskTitle, stage: DEFAULT_STAGE, project: taskProject }),
      });
      setTaskTitle("");
      setTaskProject("");
    });
  }

  async function moveTask(id, stage) {
    await mutate(() =>
      api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) })
    );
  }

  async function deleteTask(id) {
    await mutate(() => api(`/api/tasks/${id}`, { method: "DELETE" }));
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
          : "Queued for Claude — the autopilot routine will pick this up on its next run."
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

  // Everything currently in flight, freshest first — the five-second answer
  // to "where was I?".
  const inFlight = tasks
    .filter((t) => t.stage === "in_dev" || t.stage === "review")
    .sort((a, b) => new Date(lastTouched(b)) - new Date(lastTouched(a)));

  const queued = tasks.filter((t) => t.autopilot);

  const claudeButtons = (t) => (
    <>
      <a href={`/api/continue/${t.id}`} target="_blank" rel="noreferrer" style={{ ...smallBtnStyle, background: "var(--accent)", color: "#fff", textDecoration: "none", display: "inline-block" }}>
        ▶ Continue in Claude
      </a>
      <button onClick={() => copyPrompt(t)} disabled={busy} style={smallBtnStyle} title="Copy the handoff prompt to paste into any Claude session">
        ⧉ Copy prompt
      </button>
      <button onClick={() => startLog(t)} disabled={busy} style={smallBtnStyle}>
        📝 Log
      </button>
      <button
        onClick={() => toggleAutopilot(t)}
        disabled={busy}
        style={{ ...smallBtnStyle, ...(t.autopilot ? { background: "#3b3a56", color: "#fff", borderColor: "#3b3a56" } : {}) }}
        title="Queue this task for the scheduled Claude autopilot routine"
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
          <button type="submit" disabled={busy} style={smallBtnStyle}>Save</button>
          <button type="button" onClick={() => setLoggingId(null)} style={smallBtnStyle}>Cancel</button>
        </div>
      </form>
    );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 4px" }}>My Work Hub</h1>
      <div style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 20 }}>
        {loading
          ? "Loading..."
          : `${tasks.length} tasks · ${ideas.length} ideas${queued.length ? ` · 🤖 ${queued.length} queued for Claude` : ""}`}
      </div>

      {error && (
        <div style={bannerStyle("#fdecea", "#f3b4ab", "#8a2e22")}>
          Something went wrong: {error}
          <button onClick={loadAll} style={{ marginLeft: 10, background: "none", border: "none", color: "#8a2e22", textDecoration: "underline", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      )}
      {notice && <div style={bannerStyle("#eef6ef", "#cfe3d3", "#2c5e3a")}>{notice}</div>}

      {/* NOW */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>📍 Now</div>
          <button onClick={() => setShowPaste(!showPaste)} style={{ ...smallBtnStyle }}>
            📥 Paste handoff
          </button>
        </div>

        {showPaste && (
          <form onSubmit={applyPaste} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
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
              <button type="submit" disabled={busy} style={smallBtnStyle}>Apply</button>
              <button type="button" onClick={() => setShowPaste(false)} style={smallBtnStyle}>Cancel</button>
            </div>
          </form>
        )}

        {!loading && inFlight.length === 0 && (
          <div style={{ color: "var(--muted)", fontStyle: "italic" }}>Nothing in flight. Pull something from the board below.</div>
        )}

        {inFlight.map((t) => (
          <div
            key={t.id}
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 10,
              borderLeft: "4px solid var(--accent)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontWeight: 600 }}>
                {t.title}
                {t.project && <span style={chipStyle}>{t.project}</span>}
                <span style={{ ...chipStyle, background: "transparent", border: "none", color: "var(--muted)", fontWeight: 400 }}>
                  {STAGES.find((s) => s.key === t.stage)?.label}
                </span>
              </div>
              <div style={{ color: ageColor(lastTouched(t)), fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                {timeAgo(lastTouched(t))}
              </div>
            </div>
            <div style={{ marginTop: 4, fontSize: "0.9rem" }}>
              {t.next_step ? (
                <span>→ Next: {t.next_step}</span>
              ) : (
                <span style={{ color: "#b07d2a", fontStyle: "italic" }}>No next step written down — log one for future you.</span>
              )}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{claudeButtons(t)}</div>
            {logForm(t)}
          </div>
        ))}
      </div>

      {/* TASKS BOARD */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>✅ Pipeline</div>

        <form onSubmit={addTask} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Add a task..."
            style={{ ...inputStyle, flex: "2 1 200px" }}
          />
          <input
            value={taskProject}
            onChange={(e) => setTaskProject(e.target.value)}
            placeholder="Project (optional)"
            style={{ ...inputStyle, flex: "1 1 120px" }}
          />
          <button type="submit" disabled={busy} style={busy ? disabledBtnStyle : buttonStyle}>Add</button>
        </form>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {STAGES.map((stage) => (
            <div
              key={stage.key}
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 14,
                borderTop: `4px solid var(--${stage.cls})`,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)", marginBottom: 10 }}>
                {stage.label}
              </div>
              {tasks.filter((t) => t.stage === stage.key).length === 0 && (
                <div style={{ color: "var(--muted)", fontStyle: "italic", fontSize: "0.9rem" }}>Nothing here.</div>
              )}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {tasks.filter((t) => t.stage === stage.key).map((t) => (
                  <li key={t.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "0.95rem" }}>
                    <div>
                      {t.autopilot && <span title="Queued for Claude autopilot">🤖 </span>}
                      {t.title}
                      {t.project && <span style={chipStyle}>{t.project}</span>}
                    </div>
                    {t.next_step && editingId !== t.id && (
                      <div style={{ marginTop: 2, fontSize: "0.85rem", color: "var(--muted)" }}>→ {t.next_step}</div>
                    )}
                    {editingId === t.id ? (
                      <form onSubmit={saveEdit} style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" style={smallInputStyle} />
                        <input value={draft.project} onChange={(e) => setDraft({ ...draft, project: e.target.value })} placeholder="Project" style={smallInputStyle} />
                        <input value={draft.next_step} onChange={(e) => setDraft({ ...draft, next_step: e.target.value })} placeholder="Next step — the very next concrete action" style={smallInputStyle} />
                        <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes / where things stand" rows={3} style={{ ...smallInputStyle, resize: "vertical" }} />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="submit" disabled={busy} style={smallBtnStyle}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} style={smallBtnStyle}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {t.notes && (
                          <div style={{ marginTop: 4, fontSize: "0.85rem", color: "var(--muted)", whiteSpace: "pre-wrap" }}>{t.notes}</div>
                        )}
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {STAGES.filter((s) => s.key !== stage.key).map((s) => (
                            <button key={s.key} onClick={() => moveTask(t.id, s.key)} disabled={busy} style={smallBtnStyle}>
                              → {s.label}
                            </button>
                          ))}
                          <button onClick={() => startEdit(t)} disabled={busy} style={smallBtnStyle}>Edit</button>
                          <button onClick={() => deleteTask(t.id)} disabled={busy} style={{ ...smallBtnStyle, color: "#c0392b" }}>Delete</button>
                        </div>
                        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>{claudeButtons(t)}</div>
                        {logForm(t)}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* SESSION LOG */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>📓 Session log</div>
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
          {log.length === 0 && (
            <div style={{ color: "var(--muted)", fontStyle: "italic" }}>
              No sessions logged yet. Every handoff — from you, from Claude, from autopilot — lands here.
            </div>
          )}
          {groupByDay(log).map((group) => (
            <div key={group.day} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--muted)", margin: "6px 0" }}>
                {group.day}
              </div>
              {group.items.map((e) => (
                <div key={e.id} style={{ padding: "6px 0", borderBottom: "1px dashed var(--border)", fontSize: "0.9rem" }}>
                  <div>
                    {e.tasks?.title && <strong>{e.tasks.title}: </strong>}
                    {e.summary}
                    {e.source && <span style={{ ...chipStyle, marginLeft: 6 }}>{e.source}</span>}
                  </div>
                  {e.next_step && (
                    <div style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 2 }}>→ next: {e.next_step}</div>
                  )}
                  {e.details && (
                    <details style={{ marginTop: 2 }}>
                      <summary style={{ cursor: "pointer", color: "var(--muted)", fontSize: "0.85rem" }}>details</summary>
                      <div style={{ whiteSpace: "pre-wrap", fontSize: "0.88rem", marginTop: 4 }}>{e.details}</div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* IDEAS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>💡 Ideas Box</div>

        {!showIdeaForm ? (
          <button onClick={() => setShowIdeaForm(true)} style={buttonStyle}>+ Add an idea</button>
        ) : (
          <form onSubmit={addIdea} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="Idea title" style={inputStyle} autoFocus />
            <textarea value={ideaNotes} onChange={(e) => setIdeaNotes(e.target.value)} placeholder="Details / notes" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <input value={ideaSource} onChange={(e) => setIdeaSource(e.target.value)} placeholder="Source (optional)" style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={busy} style={busy ? disabledBtnStyle : buttonStyle}>Save idea</button>
              <button type="button" onClick={() => setShowIdeaForm(false)} style={{ ...buttonStyle, background: "#fff", color: "var(--text)", border: "1px solid var(--border)" }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 16, borderLeft: "4px solid var(--idea)" }}>
          {ideas.length === 0 && <div style={{ color: "var(--muted)", fontStyle: "italic" }}>No ideas saved yet.</div>}
          {ideas.map((idea) => (
            <div key={idea.id} style={{ padding: "10px 0", borderBottom: "1px dashed var(--border)" }}>
              <div style={{ fontWeight: 600 }}>{idea.title}</div>
              {idea.notes && <div style={{ marginTop: 4, fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>{idea.notes}</div>}
              <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {idea.source || "No source noted"} · {new Date(idea.created_at).toLocaleDateString()}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => promoteIdea(idea)} disabled={busy} style={smallBtnStyle} title="Turn this idea into a task on the board">
                    ↗ Make it a task
                  </button>
                  <button onClick={() => deleteIdea(idea.id)} disabled={busy} style={{ ...smallBtnStyle, color: "#c0392b" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
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
  cursor: "pointer",
};

const disabledBtnStyle = {
  ...buttonStyle,
  opacity: 0.6,
  cursor: "default",
};

const smallBtnStyle = {
  padding: "4px 8px",
  background: "#f2f0ea",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.75rem",
  cursor: "pointer",
};

const chipStyle = {
  display: "inline-block",
  marginLeft: 8,
  padding: "1px 8px",
  borderRadius: 999,
  fontSize: "0.7rem",
  fontWeight: 600,
  background: "#eef2ef",
  color: "var(--accent)",
  border: "1px solid #d5e0d9",
  verticalAlign: "middle",
};
