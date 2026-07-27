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

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskProject, setTaskProject] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [ideaSource, setIdeaSource] = useState("");
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: "", project: "", next_step: "", notes: "" });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [t, i] = await Promise.all([api("/api/tasks"), api("/api/ideas")]);
      setTasks(t.tasks || []);
      setIdeas(i.ideas || []);
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

  // Everything currently in flight, freshest first — the five-second answer
  // to "where was I?".
  const inFlight = tasks
    .filter((t) => t.stage === "in_dev" || t.stage === "review")
    .sort((a, b) => new Date(lastTouched(b)) - new Date(lastTouched(a)));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 4px" }}>My Work Hub</h1>
      <div style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 28 }}>
        {loading ? "Loading..." : `${tasks.length} tasks · ${ideas.length} ideas`}
      </div>

      {error && (
        <div
          style={{
            background: "#fdecea",
            border: "1px solid #f3b4ab",
            color: "#8a2e22",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 20,
            fontSize: "0.9rem",
          }}
        >
          Something went wrong: {error}
          <button
            onClick={loadAll}
            style={{ marginLeft: 10, background: "none", border: "none", color: "#8a2e22", textDecoration: "underline", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* WHERE I LEFT OFF */}
      {!loading && inFlight.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>📍 Where I left off</div>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "4px 16px",
              borderLeft: "4px solid var(--accent)",
            }}
          >
            {inFlight.map((t) => (
              <div key={t.id} style={{ padding: "10px 0", borderBottom: "1px dashed var(--border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontWeight: 600 }}>
                    {t.title}
                    {t.project && <span style={chipStyle}>{t.project}</span>}
                  </div>
                  <div style={{ color: ageColor(lastTouched(t)), fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                    {timeAgo(lastTouched(t))}
                  </div>
                </div>
                <div style={{ marginTop: 2, fontSize: "0.9rem" }}>
                  {t.next_step ? (
                    <span>→ Next: {t.next_step}</span>
                  ) : (
                    <span style={{ color: "#b07d2a", fontStyle: "italic" }}>
                      No next step written down — leave one for future you.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TASKS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>✅ To-Do Pipeline</div>

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
                      {t.title}
                      {t.project && <span style={chipStyle}>{t.project}</span>}
                    </div>
                    {t.next_step && editingId !== t.id && (
                      <div style={{ marginTop: 2, fontSize: "0.85rem", color: "var(--muted)" }}>→ {t.next_step}</div>
                    )}
                    {editingId === t.id ? (
                      <form onSubmit={saveEdit} style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        <input
                          value={draft.title}
                          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                          placeholder="Title"
                          style={smallInputStyle}
                        />
                        <input
                          value={draft.project}
                          onChange={(e) => setDraft({ ...draft, project: e.target.value })}
                          placeholder="Project"
                          style={smallInputStyle}
                        />
                        <input
                          value={draft.next_step}
                          onChange={(e) => setDraft({ ...draft, next_step: e.target.value })}
                          placeholder="Next step — the very next concrete action"
                          style={smallInputStyle}
                        />
                        <textarea
                          value={draft.notes}
                          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                          placeholder="Notes / where things stand"
                          rows={3}
                          style={{ ...smallInputStyle, resize: "vertical" }}
                        />
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
                            <button
                              key={s.key}
                              onClick={() => moveTask(t.id, s.key)}
                              disabled={busy}
                              style={smallBtnStyle}
                            >
                              → {s.label}
                            </button>
                          ))}
                          <button onClick={() => startEdit(t)} disabled={busy} style={smallBtnStyle}>
                            Edit
                          </button>
                          <button onClick={() => deleteTask(t.id)} disabled={busy} style={{ ...smallBtnStyle, color: "#c0392b" }}>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
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
              <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {idea.source || "No source noted"} · {new Date(idea.created_at).toLocaleDateString()}
                </div>
                <button onClick={() => deleteIdea(idea.id)} disabled={busy} style={{ ...smallBtnStyle, color: "#c0392b" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
