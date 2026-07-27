#!/bin/bash
# Daily hub scan: digest the last 36h of local Claude Code sessions and let a
# headless Claude session reconcile the hub (gael-hub.vercel.app) with reality.
# Installed as a launchd agent (com.gaelhub.dailyscan) — runs at 07:00 daily.
set -euo pipefail

cd /Users/Gaeloe/Downloads/gael-hub
export PATH="/Users/Gaeloe/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# The hub key lives in .env.local (never committed). Exported so the headless
# session's shell can use it without the key appearing in this file or the prompt.
HUB_KEY="$(grep '^HUB_PASSWORD=' gael-hub/.env.local | cut -d= -f2)"
export HUB_KEY

DIGEST_FILE="$(mktemp /tmp/hub-scan-digest.XXXXXX.txt)"
python3 scripts/scan_sessions.py 36 > "$DIGEST_FILE"
trap 'rm -f "$DIGEST_FILE"' EXIT

echo "=== hub scan $(date '+%Y-%m-%d %H:%M') ==="

claude -p "Daily hub scan (headless, no user present). Reconcile Gaël's work hub with what actually happened in his Claude Code sessions over the last 36 hours.

1. Read the session digest at $DIGEST_FILE (project dirs, per-session first ask + how it ended).
2. Fetch the hub's current state: curl -s -H \"x-hub-key: \$HUB_KEY\" https://gael-hub.vercel.app/api/brief   (the shell has HUB_KEY set).
3. For each work thread in the digest with meaningful new activity NOT already reflected in the hub's tasks/recent_log:
   - If it matches an existing task: POST https://gael-hub.vercel.app/api/handoff with JSON {\"task_id\": ..., \"summary\": one line of what happened, \"next_step\": the next concrete action if the session made it clear, \"stage\": only if it clearly changed, \"source\": \"scan\"} and header x-hub-key.
   - If it's a genuinely new work thread: create a task first via POST https://gael-hub.vercel.app/api/tasks (title, project, notes, next_step, stage one of idea|in_dev|review|live, priority 1-5), then log the handoff.
   - project MUST be exactly one of: Ocean, North Site, North Voice, North Leads, Be North, Moveandstay, My Hub — or empty if none fits. Map folder names to these (OceanWakeClaude -> Ocean, north-site -> North Site, Northvoice and GrowthPilot -> North Voice, north-leads -> North Leads, Code-BeNorth -> Be North, Moveandstay -> Moveandstay, Downloads-gael-hub -> My Hub). NEVER invent a new project; the API rejects unknown ones.
4. Deduplicate hard: skip anything whose substance already appears in recent_log or the task's notes. An empty scan is a fine outcome — do not invent updates.
5. Ignore pure housekeeping sessions (claude doctor, version cleanup) and the daily scan's own runs.
6. Finish by printing a 3-6 line plain-English report of what you updated (or 'nothing new').

Rules: only curl calls to gael-hub.vercel.app; never delete anything; keep summaries factual with dates." \
  --model sonnet \
  --allowedTools "Read" "Bash(curl:*)" \
  --max-turns 40

echo "=== scan done ==="
