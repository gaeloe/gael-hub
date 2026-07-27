// Simple shared-password protection. Not enterprise-grade security —
// it's meant to keep casual visitors out of a private link, not to
// withstand a determined attacker.

export const AUTH_COOKIE = "hub_auth";

export function expectedToken() {
  const password = process.env.HUB_PASSWORD || "";
  return Buffer.from(`gael-hub:${password}`).toString("base64");
}

export function isAuthedRequest(request) {
  // Browser sessions authenticate with the login cookie.
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (cookie && cookie === expectedToken()) return true;

  // Claude sessions (or any script) authenticate with the hub key header.
  // Same secret as the login password — one key to remember, and rotating
  // HUB_PASSWORD rotates both doors at once.
  const key = request.headers.get("x-hub-key");
  const password = process.env.HUB_PASSWORD || "";
  return Boolean(password) && key === password;
}
