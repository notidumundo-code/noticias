import type { Article, Env } from "./types";

// Minimal PostgREST client. The secret key travels only in the `apikey` header,
// which works for both new `sb_secret_…` keys and the legacy service_role JWT.

/**
 * Project origin only: tolerates a URL pasted with a path like /rest/v1 or a trailing slash.
 */
export function supabaseOrigin(env: Env): string {
  return new URL(env.SUPABASE_URL.trim()).origin;
}

async function rest(env: Env, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${supabaseOrigin(env)}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: env.SUPABASE_SECRET_KEY, "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export async function insertArticles(env: Env, articles: Article[]): Promise<void> {
  if (articles.length === 0) return;
  await rest(env, "articles?on_conflict=url", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(articles),
  });
}

export interface FeedStatus {
  feed_id: string;
  last_fetched_at: string | null;
  last_ok_at: string | null;
  last_error: string | null;
  items_last: number | null;
}

export async function getFeedStatus(env: Env): Promise<FeedStatus[]> {
  const res = await rest(env, "feed_status?select=*");
  return res.json();
}

export async function upsertFeedStatus(env: Env, rows: Partial<FeedStatus>[]): Promise<void> {
  if (rows.length === 0) return;
  await rest(env, "feed_status?on_conflict=feed_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
}

export async function recentArticles(env: Env, sinceIso: string) {
  const q = new URLSearchParams({
    select: "url,title,summary,source_name,category,region,published_at",
    published_at: `gte.${sinceIso}`,
    order: "published_at.desc",
    limit: "2000",
  });
  const res = await rest(env, `articles?${q}`);
  return (await res.json()) as (Article & { source_name: string })[];
}

export async function pruneOld(env: Env, days: number): Promise<void> {
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  await rest(env, `articles?published_at=lt.${cutoff}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
