#!/bin/bash
# Installs the daily hub scan as a self-contained launchd agent in ~/.gael-hub.
#
# Why not run scripts straight from the repo? The repo lives in ~/Downloads,
# which macOS privacy protection (TCC) blocks for launchd-spawned processes —
# the 07:00 run died with "Operation not permitted". ~/.gael-hub is outside
# the protected folders, and the agent copies everything it needs there,
# including the hub key (never committed; chmod 600).
#
# Scheduling: instead of a single 07:00 shot, the agent wakes every 30 minutes
# and runs the scan iff (a) it's past 07:00 and (b) today's scan hasn't
# succeeded yet. Closed laptop, failed network, whatever — it retries until
# one run succeeds, then stays quiet until tomorrow.
#
# Re-run this installer any time the scan logic changes; it refreshes the copies.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="$HOME/.gael-hub"
PLIST="$HOME/Library/LaunchAgents/com.gaelhub.dailyscan.plist"

mkdir -p "$HOME_DIR"

# 1. The transcript digester (reads ~/.claude — not TCC-protected).
cp "$REPO/scripts/scan_sessions.py" "$HOME_DIR/scan_sessions.py"

# 2. The hub key, extracted from the repo's .env.local while we still have
#    user-context access to ~/Downloads. Kept out of any repo, owner-read-only.
grep '^HUB_PASSWORD=' "$REPO/gael-hub/.env.local" | cut -d= -f2 > "$HOME_DIR/hub.key"
chmod 600 "$HOME_DIR/hub.key"

# 3. The self-contained runner.
cat > "$HOME_DIR/runner.sh" <<'RUNNER'
#!/bin/bash
set -euo pipefail
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
D="$HOME/.gael-hub"
STAMP="$D/last-scan"
TODAY="$(date +%F)"

# Once per day, first opportunity at/after 07:00. Only a SUCCESSFUL scan
# writes the stamp, so failures naturally retry on the next 30-min tick.
[ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$TODAY" ] && exit 0
[ "$(date +%H)" -lt 7 ] && exit 0

HUB_KEY="$(cat "$D/hub.key")"
export HUB_KEY

DIGEST_FILE="$(mktemp /tmp/hub-scan-digest.XXXXXX.txt)"
trap 'rm -f "$DIGEST_FILE"' EXIT
python3 "$D/scan_sessions.py" 36 > "$DIGEST_FILE"

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

echo "$TODAY" > "$STAMP"
echo "=== scan done ==="
RUNNER
chmod +x "$HOME_DIR/runner.sh"

# 4. The launchd agent: every 30 min + at login; the runner's guard makes it
#    effectively once daily at the first opportunity after 07:00.
cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.gaelhub.dailyscan</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>$HOME_DIR/runner.sh</string>
  </array>
  <key>StartInterval</key>
  <integer>1800</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$HOME/Library/Logs/gael-hub-scan.log</string>
  <key>StandardErrorPath</key>
  <string>$HOME/Library/Logs/gael-hub-scan.log</string>
</dict>
</plist>
PLIST

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "Installed. Agent state:"
launchctl list | grep gaelhub || true
echo "Files in $HOME_DIR:"
ls -l "$HOME_DIR"
