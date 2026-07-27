"use client";

import { useEffect, useState } from "react";

const STAGES = [
  { key: "idea", label: "Idea", cls: "" },
  { key: "in_dev", label: "In Dev", cls: "stage2" },
  { key: "review", label: "Review", cls: "stage3" },
  { key: "live", label: "Live", cls: "stage4" },
];

async function api(path, opts) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Request failed");
  return res.json();
}

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [ideaSource, setIdeaSource] = useState("");
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [t, i] = await Promise.all([api("/api/tasks"), api("/api/ideas")]);
      setTasks(t.tasks);
      setIdeas(i.ideas);
    } catch (err) {
      setError(err.message || "Something went wrong loading your hub.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function addTask(e) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await api("/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title: taskTitle, stage: "idea" }),
    });
    setTaskTitle("");
    loadAll();
  }

  async function moveTask(id, stage) {
    await api(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
    loadAll();
  }

  async function deleteTask(id) {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    loadAll();
  }

  async function addIdea(e) {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    await api("/api/ideas", {
      method: "POST",
      body: JSON.stringify({ title: ideaTitle, notes: ideaNotes, source: ideaSource }),
    });
    setIdeaTitle("");
    setIdeaNotes("");
    setIdeaSource("");
    setShowIdeaForm(false);
    loadAll();
  }

  async function deleteIdea(id) {
    await api(`/api/ideas/${id}`, { method: "DELETE" });
    loadAll();
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 60px" }}>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 4px" }}>My Work Hub</h1>
      <div style={{ color: "var(--muted)", fontSize: "0.95rem", marginBottom: 28 }}>
        {loading ? "Loading..." : `${tasks.length} tasks Â· ${ideas.length} ideas`}
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

      {/* TASKS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>â To-Do Pipeline</div>

        <form onSubmit={addTask} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="Add a task..."
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>Add</button>
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
                borderTop: `4px solid var(--${stage.cls || "stage1"})`,
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
                    <div>{t.title}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {STAGES.filter((s) => s.key !== stage.key).map((s) => (
                        <button
                          key={s.key}
                          onClick={() => moveTask(t.id, s.key)}
                          style={smallBtnStyle}
                        >
                          â {s.label}
                        </button>
                      ))}
                      <button onClick={() => deleteTask(t.id)} style={{ ...smallBtnStyle, color: "#c0392b" }}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* IDEAS */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>ð¡ Ideas Box</div>

        {!showIdeaForm ? (
          <button onClick={() => setShowIdeaForm(true)} style={buttonStyle}>+ Add an idea</button>
        ) : (
          <form onSubmit={addIdea} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <input value={ideaTitle} onChange={(e) => setIdeaTitle(e.target.value)} placeholder="Idea title" style={inputStyle} autoFocus />
            <textarea value={ideaNotes} onChange={(e) => setIdeaNotes(e.target.value)} placeholder="Details / notes" rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            <input value={ideaSource} onChange={(e) => setIdeaSource(e.target.value)} placeholder="Source (optional)" style={inputStyle} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={buttonStyle}>Save idea</button>
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
                  {idea.source || "No source noted"} Â· {new Date(idea.created_at).toLocaleDateString()}
                </div>
                <button onClick={() => deleteIdea(idea.id)} style={{ ...smallBtnStyle, color: "#c0392b" }}>Delete</button>
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

const buttonStyle = {
  padding: "10px 16px",
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: "0.95rem",
  cursor: "pointer",
};

const smallBtnStyle = {
  padding: "4px 8px",
  background: "#f2f0ea",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.75rem",
  cursor: "pointer",
};
