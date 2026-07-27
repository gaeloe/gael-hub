#!/usr/bin/env python3
"""Digest local Claude Code session transcripts into a compact summary."""
import json, glob, os, sys, time
from datetime import datetime

WINDOW_H = float(sys.argv[1]) if len(sys.argv) > 1 else 36.0
CUTOFF = time.time() - WINDOW_H * 3600

ROOT = os.path.expanduser("~/.claude/projects")
SKIP_DIRS = set()  # My Hub is a tracked project; housekeeping is filtered by the scan prompt

def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text"]
        return "\n".join(p for p in parts if p)
    return ""

def clean(s, limit):
    s = " ".join(s.split())
    return s[:limit] + ("…" if len(s) > limit else "")

for d in sorted(glob.glob(ROOT + "/*/")):
    proj = os.path.basename(d.rstrip("/"))
    if proj in SKIP_DIRS:
        continue
    files = sorted((f for f in glob.glob(d + "*.jsonl") if os.path.getmtime(f) >= CUTOFF), key=os.path.getmtime)
    if not files:
        continue
    print(f"\n##### PROJECT {proj}")
    for f in files:
        mtime = datetime.fromtimestamp(os.path.getmtime(f)).strftime("%b %d %H:%M")
        summaries, first_user, last_asst, n_user = [], "", "", 0
        first_ts = ""
        try:
            with open(f, encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    try:
                        rec = json.loads(line)
                    except Exception:
                        continue
                    t = rec.get("type")
                    if t == "summary" and rec.get("summary"):
                        summaries.append(rec["summary"])
                    elif t == "user":
                        msg = rec.get("message", {})
                        txt = text_of(msg.get("content"))
                        if not txt or txt.startswith("<") or "tool_result" in str(msg.get("content"))[:60]:
                            continue
                        if "Caveat:" in txt[:40] or "command-name" in txt[:60]:
                            continue
                        n_user += 1
                        if not first_user:
                            first_user = txt
                            first_ts = rec.get("timestamp", "")[:10]
                    elif t == "assistant":
                        txt = text_of(rec.get("message", {}).get("content"))
                        if txt:
                            last_asst = txt
        except Exception as e:
            print(f"  [unreadable: {os.path.basename(f)}: {e}]")
            continue
        sid = os.path.basename(f)[:8]
        print(f"\n--- session {sid} | last activity {mtime} | started {first_ts} | {n_user} user msgs")
        if summaries:
            print(f"  TITLES: {'; '.join(clean(s, 90) for s in summaries[-3:])}")
        if first_user:
            print(f"  FIRST ASK: {clean(first_user, 320)}")
        if last_asst:
            print(f"  ENDED WITH: {clean(last_asst, 380)}")
