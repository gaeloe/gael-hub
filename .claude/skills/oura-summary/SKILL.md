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
