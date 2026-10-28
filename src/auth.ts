import type { Env } from "./types";

// Login with Supabase Auth (email + password), proxied through the Worker.
// Tokens live only in HttpOnly cookies, so page scripts never see them, and the
// browser never needs any Supabase key.

const AT = "ng_at"; // access token, short-lived
const RT = "ng_rt"; // refresh token, long-lived
const REFRESH_MAX_AGE = 60 * 86_400;

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

/** Asks Supabase who owns the access token. No local cache, so a revoked session stops working at once. */
async function emailForToken(env: Env, token: string): Promise<string | null> {
  const res = await gotrue(env, "user", undefined, token);
  if (!res.ok) return null;
  return ((await res.json()) as { email?: string }).email?.toLowerCase() ?? null;
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
  const allowed = allowedEmails(env).has(e);
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    // Logged server-side only (Workers logs); the client always gets the same answer.
    console.warn("login failed", JSON.stringify({ status: res.status, allowed, detail }));
    // 400 = bad credentials / unconfirmed email; anything else is a server-side problem
    // (wrong key, Supabase down) and must not look like a wrong password.
    if (res.status !== 400) throw new Error(`Supabase auth ${res.status}`);
    return null;
  }
  if (!allowed) {
    console.warn("login failed", JSON.stringify({ status: res.status, allowed }));
    return null;
  }
  const s = (await res.json()) as Session;
  if (s.user?.email?.toLowerCase() !== e) return null;
  return sessionCookies(s);
}

/**
 * Revokes the session in Supabase (all of this user's refresh tokens). When the access
 * token is missing or expired, the refresh token is exchanged first so it gets revoked too.
 * Returns false when revocation could not be confirmed; the caller then keeps the cookies
 * so a retry can still revoke.
 */
export async function logout(req: Request, env: Env): Promise<boolean> {
  const at = readCookie(req, AT);
  const rt = readCookie(req, RT);
  if (at) {
    const res = await gotrue(env, "logout?scope=global", {}, at);
    if (res.ok) return true;
    if (res.status !== 401 && res.status !== 403) return false; // 429, 5xx: unknown state
  }
  if (!rt) return true; // nothing left that could renew the session
  const r = await gotrue(env, "token?grant_type=refresh_token", { refresh_token: rt });
  // Supabase answers 400/401 for refresh tokens that are already revoked or invalid.
  if (r.status === 400 || r.status === 401) return true;
  if (!r.ok) return false;
  const fresh = ((await r.json()) as Session).access_token;
  const res = await gotrue(env, "logout?scope=global", {}, fresh);
  return res.ok;
}
