#!/usr/bin/env python3
"""Oura ring -> plain-English summary of the last N days.

Usage:
  python3 scripts/oura.py login [CLIENT_ID]     # prints the Oura sign-in link
                                                # (Client ID from arg or $OURA_CLIENT_ID)
  python3 scripts/oura.py connect '<URL>'       # paste the localhost address you landed on
  python3 scripts/oura.py summary [days]        # default 7 days
  python3 scripts/oura.py status                # is Oura connected?

Where secrets live (never in this repo):
  * Oura Client ID + Client Secret: saved as a network secret on the cloud
    environment for host cloud.ouraring.com. The session proxy adds them to
    token requests, so this script only sends a placeholder login.
  * Access + refresh tokens: ~/.config/oura/tokens.json (owner-only file,
    outside the repo). Renewed automatically before they expire.
"""

import base64
import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta

AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize"
TOKEN_URL = "https://cloud.ouraring.com/oauth/token"
API = "https://api.ouraring.com/v2/usercollection"
REDIRECT_URI = "http://localhost:8080/callback"
SCOPES = "personal daily heartrate"

CONF_DIR = os.path.expanduser("~/.config/oura")
TOKENS = os.path.join(CONF_DIR, "tokens.json")
PENDING = os.path.join(CONF_DIR, "pending_login.json")

# The proxy swaps this placeholder for the real Client ID + Secret.
PLACEHOLDER_BASIC = "Basic " + base64.b64encode(b"proxy-injected:proxy-injected").decode()


class NeedLogin(Exception):
    pass


# ---------- small helpers ----------

def _write_private(path, data):
    os.makedirs(CONF_DIR, mode=0o700, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(data, f)


def _read(path):
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return None


def _http(req):
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            return e.code, json.loads(body)
        except ValueError:
            return e.code, {"raw": body.decode(errors="replace")[:300]}


def _token_request(fields):
    req = urllib.request.Request(
        TOKEN_URL,
        data=urllib.parse.urlencode(fields).encode(),
        headers={
            "Authorization": PLACEHOLDER_BASIC,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    status, body = _http(req)
    if status != 200 or "access_token" not in body:
        # Never print token values; error bodies hold none.
        raise RuntimeError(f"Oura refused the token request ({status}): "
                           f"{body.get('error_description') or body.get('error') or body}")
    body["expires_at"] = time.time() + int(body.get("expires_in", 0))
    _write_private(TOKENS, body)
    return body


# ---------- sign-in ----------

def cmd_login(client_id):
    state = secrets.token_urlsafe(16)
    _write_private(PENDING, {"state": state})
    url = AUTHORIZE_URL + "?" + urllib.parse.urlencode({
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
    })
    print(url)


def cmd_connect(pasted_url):
    q = urllib.parse.parse_qs(urllib.parse.urlparse(pasted_url.strip()).query)
    if "error" in q:
        sys.exit(f"Oura said: {q['error'][0]} (you may have clicked Deny). Run login again.")
    code = (q.get("code") or [None])[0]
    if not code:
        sys.exit("No 'code=' found in that address. Copy the full address from the browser bar.")
    pending = _read(PENDING) or {}
    if pending.get("state") and (q.get("state") or [None])[0] != pending["state"]:
        sys.exit("That address belongs to an older sign-in link. Run login again and use the new link.")
    _token_request({
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    })
    try:
        os.remove(PENDING)
    except FileNotFoundError:
        pass
    print("Connected to Oura. Tokens saved privately outside the repo.")


def _access_token(force_refresh=False):
    tok = _read(TOKENS)
    if not tok:
        raise NeedLogin()
    # Renew a day early, or when the API just said the token is no good.
    if force_refresh or time.time() > tok.get("expires_at", 0) - 86400:
        if not tok.get("refresh_token"):
            raise NeedLogin()
        try:
            tok = _token_request({"grant_type": "refresh_token",
                                  "refresh_token": tok["refresh_token"]})
        except RuntimeError:
            raise NeedLogin()
    return tok["access_token"]


def _get(path, params):
    url = f"{API}/{path}?" + urllib.parse.urlencode(params)
    for attempt in (0, 1):
        req = urllib.request.Request(
            url, headers={"Authorization": f"Bearer {_access_token(force_refresh=attempt == 1)}"})
        status, body = _http(req)
        if status == 401 and attempt == 0:
            continue
        if status == 403:
            raise RuntimeError(f"Oura blocked '{path}' (403). Usually this means the Oura "
                               "Membership is inactive or that data type wasn't allowed at sign-in.")
        if status != 200:
            raise RuntimeError(f"Oura error on '{path}' ({status}): {body}")
        return body.get("data", [])
    raise NeedLogin()


# ---------- summary ----------

def _hm(seconds):
    if not seconds:
        return "-"
    h, m = divmod(int(seconds) // 60, 60)
    return f"{h}h{m:02d}"


def _word(score):
    if score is None:
        return "no data"
    if score >= 85:
        return "great"
    if score >= 70:
        return "good"
    if score >= 60:
        return "fair"
    return "low"


def _avg(vals):
    vals = [v for v in vals if v is not None]
    return round(sum(vals) / len(vals)) if vals else None


def cmd_summary(days=7):
    end = date.today()
    start = end - timedelta(days=days - 1)
    rng = {"start_date": start.isoformat(), "end_date": (end + timedelta(days=1)).isoformat()}

    sleep_score = {d["day"]: d.get("score") for d in _get("daily_sleep", rng)}
    readiness = {d["day"]: d for d in _get("daily_readiness", rng)}
    activity = {d["day"]: d for d in _get("daily_activity", rng)}

    # Main sleep of each night (longest "long_sleep" period).
    nights = {}
    for s in _get("sleep", rng):
        if s.get("type") not in ("long_sleep", None):
            continue
        cur = nights.get(s["day"])
        if not cur or (s.get("total_sleep_duration") or 0) > (cur.get("total_sleep_duration") or 0):
            nights[s["day"]] = s

    hr = _get("heartrate", {
        "start_datetime": datetime.combine(start, datetime.min.time()).isoformat() + "Z",
        "end_datetime": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
    })
    bpm = [h["bpm"] for h in hr if h.get("bpm")]

    rows = []
    for i in range(days):
        d = (start + timedelta(days=i)).isoformat()
        n, r, a = nights.get(d, {}), readiness.get(d, {}), activity.get(d, {})
        rows.append({
            "day": d,
            "sleep_score": sleep_score.get(d),
            "sleep_time": n.get("total_sleep_duration"),
            "lowest_hr": n.get("lowest_heart_rate"),
            "hrv": n.get("average_hrv"),
            "readiness": r.get("score"),
            "temp": r.get("temperature_deviation"),
            "activity": a.get("score"),
            "steps": a.get("steps"),
        })

    print(f"OURA - last {days} days ({start:%a %d %b} to {end:%a %d %b})\n")
    print(f"{'Day':<11}{'Sleep':>7}{'Slept':>8}{'Ready':>7}{'Active':>8}{'Steps':>8}{'Low HR':>8}{'HRV':>6}")
    for x in rows:
        dd = datetime.fromisoformat(x["day"]).strftime("%a %d %b")
        f = lambda v: "-" if v is None else str(v)
        print(f"{dd:<11}{f(x['sleep_score']):>7}{_hm(x['sleep_time']):>8}{f(x['readiness']):>7}"
              f"{f(x['activity']):>8}{f(x['steps']):>8}{f(x['lowest_hr']):>8}{f(x['hrv']):>6}")

    s, rd, ac = (_avg([x[k] for x in rows]) for k in ("sleep_score", "readiness", "activity"))
    st = _avg([x["sleep_time"] for x in rows])
    steps = _avg([x["steps"] for x in rows])
    print("\nIn plain words:")
    print(f"- Sleep: average score {s if s is not None else '-'} ({_word(s)}), about {_hm(st)} of sleep a night.")
    print(f"- Readiness: average {rd if rd is not None else '-'} ({_word(rd)}).")
    print(f"- Activity: average {ac if ac is not None else '-'} ({_word(ac)}), about {steps or '-'} steps a day.")
    if bpm:
        print(f"- Heart rate: {min(bpm)}-{max(bpm)} bpm over the week, average {round(sum(bpm)/len(bpm))} bpm.")
    best = max((x for x in rows if x["readiness"] is not None), key=lambda x: x["readiness"], default=None)
    worst = min((x for x in rows if x["readiness"] is not None), key=lambda x: x["readiness"], default=None)
    if best and worst and best is not worst:
        print(f"- Best day: {datetime.fromisoformat(best['day']):%A} (readiness {best['readiness']}). "
              f"Toughest: {datetime.fromisoformat(worst['day']):%A} (readiness {worst['readiness']}).")
    hot = [x for x in rows if x["temp"] is not None and x["temp"] >= 0.5]
    if hot:
        print(f"- Body temperature ran higher than usual on {len(hot)} day(s) - worth watching.")


def main():
    args = sys.argv[1:]
    cmd = args[0] if args else "summary"
    try:
        if cmd == "login":
            cid = args[1] if len(args) > 1 else os.environ.get("OURA_CLIENT_ID")
            if not cid:
                sys.exit("Need the Oura Client ID: login <CLIENT_ID> or set OURA_CLIENT_ID.")
            cmd_login(cid)
        elif cmd == "connect" and len(args) == 2:
            cmd_connect(args[1])
        elif cmd == "status":
            print("Connected." if _read(TOKENS) else "Not connected.")
        elif cmd == "summary":
            cmd_summary(int(args[1]) if len(args) > 1 else 7)
        else:
            sys.exit(__doc__)
    except NeedLogin:
        sys.exit("NEED_LOGIN: Oura isn't connected in this workspace (or access was removed). "
                 "Run: python3 scripts/oura.py login")


if __name__ == "__main__":
    main()
