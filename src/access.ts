import type { Env } from "./types";

// Verifies the Cloudflare Access JWT (Cf-Access-Jwt-Assertion). Access already blocks
// unauthenticated visitors at the edge; this check also covers any route that bypasses
// Access (for example the *.workers.dev URL) so the API never answers without a login.

interface Jwk extends JsonWebKey { kid: string }
let cachedKeys: { at: number; keys: Jwk[] } | null = null;

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function keys(team: string): Promise<Jwk[]> {
  if (cachedKeys && Date.now() - cachedKeys.at < 3_600_000) return cachedKeys.keys;
  const res = await fetch(`https://${team}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error("certs unavailable");
  const body = (await res.json()) as { keys: Jwk[] };
  cachedKeys = { at: Date.now(), keys: body.keys };
  return body.keys;
}

export function accessEnabled(env: Env): boolean {
  return Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD);
}

export async function verifyAccess(req: Request, env: Env): Promise<boolean> {
  const token = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    if (header.alg !== "RS256") return false;
    const jwk = (await keys(env.ACCESS_TEAM_DOMAIN!)).find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64urlToBytes(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return false;
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const now = Date.now() / 1000;
    return aud.includes(env.ACCESS_AUD) && payload.exp > now && payload.iss === `https://${env.ACCESS_TEAM_DOMAIN}`;
  } catch {
    return false;
  }
}
