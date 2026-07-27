import { STAGE_KEYS } from "./stages";

// Builds the handoff prompt that "Continue in Claude" opens a session with.
// It carries the task's full context AND teaches the session how to report
// back: sessions that can run shell commands post straight to /api/handoff;
// chat-only sessions print a HANDOFF block Gaël pastes into the hub.
//
// Kept compact on purpose — this travels in a claude.ai/new?q= URL, and
// mobile browsers get unreliable past a few thousand characters.
export function buildHandoffPrompt(task, recentLog, baseUrl) {
  const key = process.env.HUB_PASSWORD || "";
  const lines = [];

  lines.push(
    `You're picking up Gaël's work from his hub. Read the context, then work with him on the next step.`
  );
  lines.push("");
  lines.push(`TASK: ${task.title}${task.project ? `  [${task.project}]` : ""}`);
  lines.push(`STAGE: ${task.stage}`);
  lines.push(`NEXT STEP: ${task.next_step || "(not recorded — infer it from the notes, then confirm with Gaël)"}`);
  if (task.notes) {
    lines.push(`NOTES: ${task.notes.slice(0, 700)}${task.notes.length > 700 ? "…" : ""}`);
  }
  const log = (recentLog || []).slice(0, 3);
  if (log.length) {
    lines.push("RECENT SESSIONS:");
    for (const l of log) {
      lines.push(`- ${String(l.created_at).slice(0, 10)}: ${l.summary.slice(0, 140)}`);
    }
  }
  lines.push("");
  lines.push(
    "IMPORTANT — before the session ends (or after real progress), update the hub so no work is lost between sessions:"
  );
  lines.push(
    `1. If you can run shell commands, run (fill in the two placeholders):`
  );
  lines.push(
    `curl -s -X POST ${baseUrl}/api/handoff -H 'Content-Type: application/json' -H 'x-hub-key: ${key}' -d '{"task_id":"${task.id}","summary":"<what got done>","next_step":"<the next concrete action>","source":"claude-session"}'`
  );
  lines.push(`2. Otherwise, end your final message with exactly this block for Gaël to paste into the hub's "Paste handoff" box:`);
  lines.push("HANDOFF");
  lines.push(`task: ${task.id}`);
  lines.push("did: <one line — what got done>");
  lines.push("next: <one line — the next concrete action>");
  lines.push(`stage: <one of ${STAGE_KEYS.join("|")}>`);

  return lines.join("\n");
}
