import type { Env } from "./types";

// Login with Supabase Auth (email + password), proxied through the Worker.
// Tokens live only in HttpOnly cookies, so page scripts never see them, and the
// browser never needs any Supabase key.

const AT = "ng_at"; // access token, short-lived
const RT = "ng_rt"; // refresh token, long-lived
const REFRESH_MAX_AGE = 60 * 86_400;
const VERIFY_CACHE_MS = 5 * 60_000;

const verified = new Map<string, { email: string; until: number }>();

export function allowedEmails(env: Env): Set<string> {
  return new Set((env.ALLOWED_EMAILS ?? "").split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export function authConfigured(env: Env): boolean {
  return allowedEmails(env).size > 0;
}

function base(env: Env): string {
  return `${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1`;
}

async function gotrue(env: Env, path: string, body: unknown, token?: string): Promise<Response> {
  return fetch(`${base(env)}/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get("Cookie") ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function cookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/api; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

interface Session { access_token: string; refresh_token: string; expires_in: number; user?: { email?: string } }

function sessionCookies(s: Session): string[] {
  return [cookie(AT, s.access_token, Math.max(60, s.expires_in - 30)), cookie(RT, s.refresh_token, REFRESH_MAX_AGE)];
}

export function clearCookies(): string[] {
  return [cookie(AT, "", 0), cookie(RT, "", 0)];
}

/** Reads `exp` without verifying; only used to shorten the cache, never to trust a token. */
function tokenExpiryMs(token: string): number {
  try {
    const p = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const exp = JSON.parse(atob(p.padEnd(Math.ceil(p.length / 4) * 4, "="))).exp;
    return typeof exp === "number" ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

async function tokenKey(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return btoa(String.fromCharCode(...new Uint8Array(d)));
}

/** Asks Supabase who owns the access token; caches positive answers briefly. */
async function emailForToken(env: Env, token: string): Promise<string | null> {
  const key = await tokenKey(token);
  const hit = verified.get(key);
  if (hit && hit.until > Date.now()) return hit.email;
  const res = await gotrue(env, "user", undefined, token);
  if (!res.ok) return null;
  const email = ((await res.json()) as { email?: string }).email?.toLowerCase() ?? null;
  if (email) {
    if (verified.size > 500) verified.clear();
    const until = Math.min(Date.now() + VERIFY_CACHE_MS, tokenExpiryMs(token));
    if (until > Date.now()) verified.set(key, { email, until });
  }
  return email;
}

/**
 * Resolves the signed-in user. When the access token expired but the refresh token
 * is still valid, renews the session and returns the cookies to set.
 */
export async function currentUser(req: Request, env: Env): Promise<{ email: string; setCookies: string[] } | null> {
  const allowed = allowedEmails(env);
  const at = readCookie(req, AT);
  if (at) {
    const email = await emailForToken(env, at);
    if (email && allowed.has(email)) return { email, setCookies: [] };
  }
  const rt = readCookie(req, RT);
  if (!rt) return null;
  const res = await gotrue(env, "token?grant_type=refresh_token", { refresh_token: rt });
  if (!res.ok) return null;
  const s = (await res.json()) as Session;
  const email = s.user?.email?.toLowerCase();
  if (!email || !allowed.has(email)) return null;
  return { email, setCookies: sessionCookies(s) };
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Single normalization used by the limiter and by every auth step. */
export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export async function passwordLogin(env: Env, e: string, password: string): Promise<string[] | null> {
  if (!EMAIL_RE.test(e) || password.length < 1 || password.length > 200) return null;
  // Always ask Supabase (even for emails not on the list) so timing does not reveal the list.
  const res = await gotrue(env, "token?grant_type=password", { email: e, password });
  if (!res.ok || !allowedEmails(env).has(e)) return null;
  const s = (await res.json()) as Session;
  if (s.user?.email?.toLowerCase() !== e) return null;
  return sessionCookies(s);
}

/**
 * Revokes the session in Supabase (all of this user's refresh tokens). When only the
 * refresh token is left, it is exchanged first so it can be revoked too.
 * Returns false when revocation could not be confirmed.
 */
export async function logout(req: Request, env: Env): Promise<boolean> {
  let at = readCookie(req, AT);
  const rt = readCookie(req, RT);
  if (at) verified.delete(await tokenKey(at));
  if (!at && rt) {
    const r = await gotrue(env, "token?grant_type=refresh_token", { refresh_token: rt });
    if (r.ok) at = ((await r.json()) as Session).access_token;
    else return r.status >= 400 && r.status < 500; // token already invalid: nothing left to revoke
  }
  if (!at) return true;
  const res = await gotrue(env, "logout?scope=global", {}, at);
  return res.ok || res.status === 401 || res.status === 403;
}
