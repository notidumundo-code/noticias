import { authConfigured, clearCookies, currentUser, logout, normalizeEmail, passwordLogin } from "./auth";
import { classify, rankStories } from "./classify";
import { FEEDS } from "./feeds";
import { normalizeDate, parseFeed } from "./rss";
import { getFeedStatus, insertArticles, pruneOld, recentArticles, upsertFeedStatus } from "./supabase";
import type { Article, Category, Env, Feed, Region } from "./types";

const CATEGORIES: Category[] = ["economia", "politica"];
const REGIONS: Region[] = ["argentina", "region", "mundo"];
const API_CACHE_SECONDS = 120;
const RETENTION_DAYS = 14;

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}, cookies: string[] = []): Response {
  const headers = new Headers({ ...SECURITY_HEADERS, "Cache-Control": "private, no-store", ...extra });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(JSON.stringify(body), { status, headers });
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  if (!(req.headers.get("Content-Type") ?? "").includes("application/json")) return {};
  const text = await req.text();
  if (text.length > 2000) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

async function handleAuth(req: Request, env: Env, ctx: ExecutionContext, path: string): Promise<Response> {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, { Allow: "POST" });
  // CSRF: only same-origin pages may call the auth endpoints (cookies are SameSite=Strict too).
  if (req.headers.get("Origin") !== new URL(req.url).origin) return json({ error: "forbidden" }, 403);
  if (path === "/api/auth/logout") {
    // Cookies are cleared only once Supabase confirms; otherwise a retry still has them.
    const revoked = await logout(req, env);
    return revoked ? json({ ok: true }, 200, {}, clearCookies()) : json({ error: "logout failed" }, 502);
  }
  // Without a rate limiter the code could be brute-forced: refuse to log anyone in.
  if (!env.AUTH_LIMITER) return json({ error: "login not configured" }, 503);
  const body = await readJson(req);
  const email = normalizeEmail(body.email);
  const ip = req.headers.get("CF-Connecting-IP") ?? "?";
  // Two budgets: per IP, and per account shared across all IPs.
  // shortcut: Cloudflare counters are per location, so a distributed attacker gets one budget
  // per location. Acceptable for a single-user app with a strong password.
  for (const key of [`${path}:ip:${ip}`, `${path}:acct:${email}`]) {
    if (!(await env.AUTH_LIMITER.limit({ key })).success) return json({ error: "too many attempts" }, 429);
  }
  if (path === "/api/auth/login") {
    const cookies = await passwordLogin(env, email, typeof body.password === "string" ? body.password : "");
    return cookies ? json({ ok: true }, 200, {}, cookies) : json({ error: "invalid credentials" }, 401);
  }
  return json({ error: "not found" }, 404);
}

async function fetchFeed(feed: Feed, now: Date): Promise<Article[]> {
  const res = await fetch(feed.url, {
    headers: { "User-Agent": "NoticiasGlobales/1.0 (+lector RSS personal)", Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5" },
    signal: AbortSignal.timeout(8000),
    cf: { cacheTtl: 60 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = (await res.text()).slice(0, 1_500_000);
  const out: Article[] = [];
  for (const item of parseFeed(xml)) {
    const c = classify(item, feed);
    if (!c) continue;
    out.push({
      url: item.link,
      title: item.title,
      summary: item.summary,
      source_id: feed.id,
      source_name: feed.name,
      category: c.category,
      region: c.region,
      lang: feed.lang,
      published_at: normalizeDate(item.published, now),
    });
  }
  return out;
}

/** Refreshes the feeds that were fetched longest ago; a few per run keeps CPU low. */
export async function ingest(env: Env, now = new Date()): Promise<{ feed: string; ok: boolean; items: number }[]> {
  const perRun = Math.max(1, Number(env.FEEDS_PER_RUN ?? 6) || 6);
  const status = new Map((await getFeedStatus(env)).map((s) => [s.feed_id, s]));
  const due = [...FEEDS]
    .sort((a, b) => (status.get(a.id)?.last_fetched_at ?? "").localeCompare(status.get(b.id)?.last_fetched_at ?? ""))
    .slice(0, perRun);

  const results = await Promise.allSettled(due.map((f) => fetchFeed(f, now)));
  const articles: Article[] = [];
  const statusRows = due.map((feed, i) => {
    const r = results[i];
    const prev = status.get(feed.id);
    if (r.status === "fulfilled") {
      articles.push(...r.value);
      return { feed_id: feed.id, last_fetched_at: now.toISOString(), last_ok_at: now.toISOString(), last_error: null, items_last: r.value.length };
    }
    return {
      feed_id: feed.id,
      last_fetched_at: now.toISOString(),
      last_ok_at: prev?.last_ok_at ?? null,
      last_error: String(r.reason?.message ?? r.reason).slice(0, 200),
      items_last: 0,
    };
  });

  // Same URL can appear in two feeds of one batch; PostgREST rejects duplicates in one insert.
  const unique = [...new Map(articles.map((a) => [a.url, a])).values()];
  await insertArticles(env, unique);
  await upsertFeedStatus(env, statusRows);
  if (now.getUTCMinutes() < 5 && now.getUTCHours() % 6 === 0) await pruneOld(env, RETENTION_DAYS);
  return statusRows.map((s) => ({ feed: s.feed_id, ok: s.last_error === null, items: s.items_last }));
}

async function newsPayload(env: Env, hours: number) {
  const now = Date.now();
  const rows = await recentArticles(env, new Date(now - hours * 3_600_000).toISOString());
  const buckets = {} as Record<Category, Record<Region, ReturnType<typeof rankStories>>>;
  for (const c of CATEGORIES) {
    buckets[c] = {} as Record<Region, ReturnType<typeof rankStories>>;
    for (const r of REGIONS) buckets[c][r] = rankStories(rows.filter((a) => a.category === c && a.region === r), now);
  }
  return { generated_at: new Date(now).toISOString(), hours, total: rows.length, buckets };
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);

    try {
      // Fail closed: with no allowed emails configured nobody can sign in or read the API.
      if (!authConfigured(env) && env.PUBLIC_API !== "true") return json({ error: "login not configured" }, 503);
      if (url.pathname.startsWith("/api/auth/")) return await handleAuth(req, env, ctx, url.pathname);
      if (req.method !== "GET") return json({ error: "method not allowed" }, 405, { Allow: "GET" });

      let setCookies: string[] = [];
      if (env.PUBLIC_API !== "true") {
        const user = await currentUser(req, env);
        if (!user) return json({ error: "unauthorized" }, 401);
        setCookies = user.setCookies;
      }
      if (url.pathname === "/api/me") return json({ ok: true }, 200, {}, setCookies);

      if (url.pathname === "/api/news") {
        const hours = [24, 48, 72, 168].includes(Number(url.searchParams.get("hours"))) ? Number(url.searchParams.get("hours")) : 24;
        // Cache key carries no credentials: the payload is identical for every authorized viewer.
        const cacheKey = new Request(`${url.origin}/api/news?hours=${hours}`);
        const cache = caches.default;
        const hit = await cache.match(cacheKey);
        if (hit) {
          // The edge copy carries s-maxage; browsers and intermediaries must never store it.
          const res = new Response(hit.body, hit);
          res.headers.set("Cache-Control", "private, no-store");
          res.headers.delete("Set-Cookie");
          for (const c of setCookies) res.headers.append("Set-Cookie", c);
          return res;
        }
        const payload = await newsPayload(env, hours);
        const toCache = json(payload, 200, { "Cache-Control": `s-maxage=${API_CACHE_SECONDS}` });
        const res = json(payload, 200, {}, setCookies);
        ctx.waitUntil(cache.put(cacheKey, toCache));
        return res;
      }
      if (url.pathname === "/api/status") {
        const status = new Map((await getFeedStatus(env)).map((s) => [s.feed_id, s]));
        return json({
          feeds: FEEDS.map((f) => ({ id: f.id, name: f.name, category: f.category, region: f.region, ...(status.get(f.id) ?? {}) })),
        }, 200, {}, setCookies);
      }
      return json({ error: "not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "upstream error" }, 502);
    }
  },

  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(ingest(env).then((r) => console.log(JSON.stringify(r))));
  },
} satisfies ExportedHandler<Env>;
