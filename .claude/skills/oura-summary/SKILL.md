---
name: oura-summary
description: Show Gaël's Oura ring summary (sleep, readiness, activity, heart rate). Use when asked "show my Oura summary", "how did I sleep", "my Oura data", "my readiness this week", or similar.
---

# Oura summary

1. Run `python3 scripts/oura.py summary` (add a number for more days, e.g. `summary 14`).
2. Reply in short, plain English for a non-technical reader: how sleep, readiness,
   activity and heart rate went, the best and toughest day, and one or two
   simple observations. No jargon, no raw tables unless asked.

## If it prints NEED_LOGIN

The cloud workspace was reset, so the saved Oura tokens are gone (the Client ID
and Secret are still saved securely on the environment for cloud.ouraring.com).

1. Run `python3 scripts/oura.py login` (it uses `$OURA_CLIENT_ID`; if that is
   empty, ask Gaël for the Oura Client ID - it is not secret - and pass it as an argument).
2. Give Gaël the printed link. Tell them: open it, click Accept, then copy the
   full address from the browser bar of the page that "won't load" and paste it here.
3. Run `python3 scripts/oura.py connect '<pasted address>'`, then run the summary.

Never print, log or commit token values. Tokens live only in `~/.config/oura/`.
If Oura returns a 401 on the token request, the Client ID/Secret saved on the
environment may be wrong - tell Gaël to re-save them in the environment's network secrets.

## Weekly dashboard

Charts for 7, 14 and 30 days live at https://claude.ai/artifact/Gtvkabnx2xhJkyLj5KLR4e
and refresh every Sunday evening (Bangkok time) from a scheduled task.
The Oura login used by that task is stored privately on that page
(`data/users/me`, doc `oura_auth`, readable only by Gaël's account).
`python3 scripts/oura.py export 30 <file>` makes the data file;
`python3 scripts/oura.py tokens-in <file>` loads a saved login.

## Weekly run (Sunday scheduled task)

Run from the gael-hub checkout on branch `claude/bold-galileo-9fbhhl`
(`git pull origin claude/bold-galileo-9fbhhl` first). D = https://claude.ai/artifact/Gtvkabnx2xhJkyLj5KLR4e,
S = your scratchpad directory. Never print, log or commit token values.

1. Restore the login: ArtifactData `get`, url D, collection `data/users/me`,
   doc `oura_auth`, `out_dir` S/auth (don't read it into the chat). Note its version.
   `python3 scripts/oura.py tokens-in <saved file>`, then delete S/auth.
   (Skip if `python3 scripts/oura.py status` already says Connected.)
2. `python3 scripts/oura.py export 30 S/oura-30d.json`
3. Save the login back right away (refresh tokens are single-use): ArtifactData
   `set`, url D, collection `data/users/me`, doc `oura_auth`,
   `file_path` = absolute path of ~/.config/oura/tokens.json, `if_version` from step 1
   (get the doc first if you skipped step 1).
4. Upload S/oura-30d.json: Artifact publish, url D, `asset: true`. ArtifactData
   `get` `datasets`/`oura`, then `update` it (if_version) with
   `source: {kind: "file", url: <new /_blob url as returned>, name: "oura-30d.json", format: "json"}`,
   `updated: {at: <now UTC ISO>, by: "Claude, Oura export"}`, `edit: {via: "claude", at: <now>}`.
   Then delete the old blob (Artifact `delete`, url D, path = old blob id). Don't touch the page.
5. `python3 scripts/oura.py summary 7` and `summary 30`. Write 4-6 plain-English
   bullets: last 7 days vs the 14/30-day picture (sleep score and hours,
   readiness, steps, resting heart rate/HRV), best and toughest day, days with
   no data, one or two practical tips, and the link D.
6. Send it to Gaël's phone with PushNotification (a 1-2 line version + "full summary in Claude").

If the login is missing or NEED_LOGIN appears: `python3 scripts/oura.py login 054090ab-bd2b-4246-bfcf-88d9d7768d97`,
push-notify Gaël that Oura needs a 30-second re-approval, and in the reply give the link
and ask them to paste back the address of the page that won't load. Then `connect` and continue from step 2
(create the `oura_auth` doc without if_version if it doesn't exist).
