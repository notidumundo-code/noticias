import { describe, expect, it } from "vitest";
import worker from "../src/worker";
import type { Env } from "../src/types";

const env = (extra: Partial<Env> = {}) =>
  ({ ASSETS: { fetch: async () => new Response("asset") }, SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k", ...extra }) as unknown as Env;
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;
const get = (path: string, e: Env, headers: Record<string, string> = {}) =>
  worker.fetch(new Request(`https://app.test${path}`, { headers }), e, ctx);

describe("API access control", () => {
  it("fails closed when Cloudflare Access is not configured", async () => {
    expect((await get("/api/news", env())).status).toBe(503);
    expect((await get("/api/status", env({ ACCESS_AUD: "aud" }))).status).toBe(503);
  });
  it("rejects requests without a valid Access token", async () => {
    const e = env({ ACCESS_TEAM_DOMAIN: "team.cloudflareaccess.com", ACCESS_AUD: "aud" });
    expect((await get("/api/news", e)).status).toBe(401);
    expect((await get("/api/news", e, { "Cf-Access-Jwt-Assertion": "a.b.c" })).status).toBe(401);
  });
  it("only allows GET", async () => {
    const res = await worker.fetch(new Request("https://app.test/api/news", { method: "POST" }), env(), ctx);
    expect(res.status).toBe(405);
  });
  it("serves static assets without the API checks", async () => {
    expect(await (await get("/", env())).text()).toBe("asset");
  });
});
