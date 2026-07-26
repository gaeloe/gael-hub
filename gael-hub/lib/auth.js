// Simple shared-password protection. Not enterprise-grade security —
// it's meant to keep casual visitors out of a private link, not to
// withstand a determined attacker.

export const AUTH_COOKIE = "hub_auth";

export function expectedToken() {
  const password = process.env.HUB_PASSWORD || "";
  return Buffer.from(`gael-hub:${password}`).toString("base64");
}

export function isAuthedRequest(request) {
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  return cookie && cookie === expectedToken();
}
