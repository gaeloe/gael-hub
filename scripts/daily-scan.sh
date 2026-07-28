#!/bin/bash
# Manual trigger for the daily hub scan. The real logic lives in
# ~/.gael-hub/runner.sh (installed by install-daily-scan.sh; kept outside
# ~/Downloads because macOS TCC blocks launchd agents from protected folders).
# This wrapper clears today's done-stamp so the scan runs even if it already
# succeeded today.
set -euo pipefail
if [ ! -x "$HOME/.gael-hub/runner.sh" ]; then
  echo "Scan agent not installed — run scripts/install-daily-scan.sh first." >&2
  exit 1
fi
rm -f "$HOME/.gael-hub/last-scan"
exec bash "$HOME/.gael-hub/runner.sh"
