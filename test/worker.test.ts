import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker";
import type { Env } from "../src/types";

const env = (extra: Partial<Env> = {}) =>
  ({ ASSETS: { fetch: async () => new Response("asset") }, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k", ...extra }) as unknown as Env;
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const call = (path: string, e: Env, init: RequestInit = {}) => worker.fetch(new Request(`https://app.test${path}`, init), e, ctx);
const post = (path: string, e: Env, body: unknown, origin = "https://app.test") =>
  call(path, e, { method: "POST", headers: { "Content-Type": "application/json", Origin: origin }, body: JSON.stringify(body) });
const configured = env({ ALLOWED_EMAILS: "yo@example.com" });

afterEach(() => vi.unstubAllGlobals());

describe("API access control", () => {
  it("fails closed when no allowed emails are configured", async () => {
    expect((await call("/api/news", env())).status).toBe(503);
    expect((await post("/api/auth/start", env(), { email: "a@b.co" })).status).toBe(503);
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
    expect((await post("/api/auth/start", configured, { email: "yo@example.com" }, "https://evil.test")).status).toBe(403);
  });
  it("never sends codes to emails outside the allow list, and answers the same", async () => {
    const f = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", f);
    const res = await post("/api/auth/start", configured, { email: "intruso@example.com" });
    expect(res.status).toBe(200);
    expect(f).not.toHaveBeenCalled();
    await post("/api/auth/start", configured, { email: "yo@example.com" });
    expect(f).toHaveBeenCalledOnce();
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual({ email: "yo@example.com", create_user: false });
  });
  it("sets HttpOnly cookies on a valid code", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ access_token: "a", refresh_token: "r", expires_in: 3600, user: { email: "yo@example.com" } })));
    const res = await post("/api/auth/verify", configured, { email: "yo@example.com", code: "123456" });
    expect(res.status).toBe(200);
    const cookies = res.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    for (const c of cookies) expect(c).toMatch(/HttpOnly; Secure; SameSite=Strict/);
  });
  it("rejects malformed codes without calling Supabase", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await post("/api/auth/verify", configured, { email: "yo@example.com", code: "abc" })).status).toBe(401);
    expect(f).not.toHaveBeenCalled();
  });
  it("rate limits login attempts when the limiter says so", async () => {
    const limited = env({ ALLOWED_EMAILS: "yo@example.com", AUTH_LIMITER: { limit: async () => ({ success: false }) } });
    expect((await post("/api/auth/verify", limited, { email: "yo@example.com", code: "123456" })).status).toBe(429);
  });
});
