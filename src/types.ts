export type Category = "economia" | "politica";
export type Region = "argentina" | "region" | "mundo";

export interface Feed {
  id: string;
  name: string;
  url: string;
  /** "mixto" feeds mix topics; each item is classified by keywords. */
  category: Category | "mixto";
  region: Region;
  lang: "es" | "en";
}

export interface RawItem {
  title: string;
  link: string;
  summary: string;
  published: string | null;
}

export interface Article {
  url: string;
  title: string;
  summary: string;
  source_id: string;
  source_name: string;
  category: Category;
  region: Region;
  lang: string;
  published_at: string;
}

export interface Env {
  ASSETS: Fetcher;
  SUPABASE_URL: string;
  /** Supabase secret (or legacy service_role) key. Never sent to the browser. */
  SUPABASE_SECRET_KEY: string;
  /** Comma-separated emails allowed to sign in. /api/* refuses everything until it is set. */
  ALLOWED_EMAILS?: string;
  /** Explicit opt-out ("true") to serve the news API without login, for local dev only. */
  PUBLIC_API?: string;
  /** Workers rate limiting binding for login attempts (optional). */
  AUTH_LIMITER?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
  /** How many feeds each cron run refreshes (keeps CPU per run low). */
  FEEDS_PER_RUN?: string;
}
