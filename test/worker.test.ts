import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker";
import type { Env } from "../src/types";

const env = (extra: Partial<Env> = {}) =>
  ({ ASSETS: { fetch: async () => new Response("asset") }, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k", ...extra }) as unknown as Env;
const pending: Promise<unknown>[] = [];
const ctx = { waitUntil(p: Promise<unknown>) { pending.push(p); }, passThroughOnException() {} } as unknown as ExecutionContext;
const settle = () => Promise.all(pending.splice(0));
const okLimiter = { limit: async () => ({ success: true }) };
const call = (path: string, e: Env, init: RequestInit = {}) => worker.fetch(new Request(`https://app.test${path}`, init), e, ctx);
const post = (path: string, e: Env, body: unknown, origin = "https://app.test") =>
  call(path, e, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
const configured = env({ ALLOWED_EMAILS: "yo@example.com", AUTH_LIMITER: okLimiter });

afterEach(() => vi.unstubAllGlobals());

describe("API access control", () => {
  it("fails closed when no allowed emails are configured", async () => {
    expect((await call("/api/news", env())).status).toBe(503);
    expect((await post("/api/auth/login", env(), { email: "a@b.co", password: "x" })).status).toBe(503);
  });
  it("rejects API calls without a session", async () => {
    expect((await call("/api/news", configured)).status).toBe(401);
    expect((await call("/api/status", configured)).status).toBe(401);
  });
  it("rejects a session whose email is not allowed", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ email: "otro@example.com" })));
    const res = await call("/api/me", configured, { headers: { Cookie: "ng_at=tok" } });
    expect(res.status).toBe(401);
  });
  it("accepts a valid session for an allowed email", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ email: "YO@example.com" })));
    expect((await call("/api/me", configured, { headers: { Cookie: "ng_at=tok-ok" } })).status).toBe(200);
  });
  it("serves static assets without the API checks", async () => {
    expect(await (await call("/", env())).text()).toBe("asset");
  });
});

describe("login endpoints", () => {
  it("blocks cross-origin auth requests", async () => {
    expect((await post("/api/auth/login", configured, { email: "yo@example.com", password: "x" }, "https://evil.test")).status).toBe(403);
  });
  it("sets HttpOnly cookies on valid credentials", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ access_token: "a", refresh_token: "r", expires_in: 3600, user: { email: "yo@example.com" } })));
    const res = await post("/api/auth/login", configured, { email: "yo@example.com", password: "pw" });
    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const c of cookies) expect(c).toMatch(/HttpOnly; Secure; SameSite=Strict/);
  });
  it("rejects malformed input without calling Supabase", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await post("/api/auth/login", configured, { email: "no-es-email", password: "pw" })).status).toBe(401);
    expect((await post("/api/auth/login", configured, { email: "yo@example.com" })).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
  it("rejects a wrong password", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 400 })));
    expect((await post("/api/auth/login", configured, { email: "yo@example.com", password: "mal" })).status).toBe(401);
  });
  it("refuses logins when no rate limiter is bound", async () => {
    const e = env({ ALLOWED_EMAILS: "yo@example.com" });
    expect((await post("/api/auth/login", e, { email: "yo@example.com", password: "pw" })).status).toBe(503);
  });
  it("counts spacing/case variants of an email against one account budget", async () => {
    const keys: string[] = [];
    const e = env({ ALLOWED_EMAILS: "yo@example.com", AUTH_LIMITER: { limit: async ({ key }) => (keys.push(key), { success: true }) } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 400 })));
    for (const email of ["yo@example.com", " yo@example.com", "YO@example.com "]) await post("/api/auth/login", e, { email, password: "pw" });
    expect(new Set(keys.filter((k) => k.includes(":acct:")))).toEqual(new Set(["/api/auth/login:acct:yo@example.com"]));
  });
  it("asks Supabase even for emails outside the list, but never logs them in", async () => {
    const f = vi.fn(async () => Response.json({ access_token: "a", refresh_token: "r", expires_in: 3600, user: { email: "intruso@example.com" } }));
    vi.stubGlobal("fetch", f);
    expect((await post("/api/auth/login", configured, { email: "intruso@example.com", password: "pw" })).status).toBe(401);
    expect(f).toHaveBeenCalledOnce();
  });
  it("revokes the session on logout even when only the refresh token is left", async () => {
    const f = vi.fn(async (url: string) =>
      url.includes("grant_type=refresh_token") ? Response.json({ access_token: "fresh", refresh_token: "r2", expires_in: 3600 }) : new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", f);
    const res = await call("/api/auth/logout", configured, { method: "POST", headers: { Origin: "https://app.test", Cookie: "ng_rt=old" } });
    expect(res.status).toBe(200);
    const urls = f.mock.calls.map((c) => String(c[0]));
    expect(urls.some((u) => u.includes("/logout"))).toBe(true);
    expect(res.headers.getSetCookie().every((c) => c.includes("Max-Age=0"))).toBe(true);
  });
  const logoutWith = (cookie: string) => call("/api/auth/logout", configured, { method: "POST", headers: { Origin: "https://app.test", Cookie: cookie } });
  it("reports a failed revocation and keeps the cookies for a retry", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    const res = await logoutWith("ng_at=tok; ng_rt=r");
    expect(res.status).toBe(502);
    expect(res.headers.getSetCookie()).toHaveLength(0);
  });
  it("does not treat a rate-limited refresh as revoked", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 429 })));
    expect((await logoutWith("ng_rt=r")).status).toBe(502);
  });
  it("renews an expired access token to revoke a still-valid refresh token", async () => {
    const f = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes("grant_type=refresh_token")) return Response.json({ access_token: "fresh", refresh_token: "r2", expires_in: 3600 });
      const auth = (init.headers as Record<string, string>).Authorization;
      return new Response(null, { status: auth === "Bearer fresh" ? 204 : 401 });
    });
    vi.stubGlobal("fetch", f);
    const res = await logoutWith("ng_at=expired; ng_rt=r");
    expect(res.status).toBe(200);
    expect(f).toHaveBeenCalledTimes(3);
  });
  it("rate limits login attempts when the limiter says so", async () => {
    const limited = env({ ALLOWED_EMAILS: "yo@example.com", AUTH_LIMITER: { limit: async () => ({ success: false }) } });
    expect((await post("/api/auth/login", limited, { email: "yo@example.com", password: "pw" })).status).toBe(429);
  });
});
