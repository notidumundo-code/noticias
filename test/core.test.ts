import { describe, expect, it } from "vitest";
import { classify, rankStories } from "../src/classify";
import { normalizeDate, parseFeed, safeUrl } from "../src/rss";
import type { Feed } from "../src/types";

const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>X</title>
<item><title><![CDATA[El BCRA compró US$200 millones &amp; subió el Merval]]></title>
<link>https://www.ambito.com/nota-1?utm_source=rss#top</link>
<description>&lt;p&gt;El &lt;b&gt;dólar&lt;/b&gt; bajó&lt;/p&gt;</description>
<pubDate>Tue, 28 Oct 2026 12:00:00 GMT</pubDate></item>
<item><title>Malicioso</title><link>javascript:alert(1)</link></item>
</channel></rss>`;

const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom title</title>
<link rel="alternate" href="https://example.com/a"/><updated>2026-10-28T10:00:00Z</updated>
<summary>Resumen</summary></entry></feed>`;

const feed = (category: Feed["category"], region: Feed["region"]): Feed => ({ id: "t", name: "T", url: "https://x", category, region, lang: "es" });

describe("rss", () => {
  it("parses RSS, decodes entities, strips HTML and tracking params", () => {
    const items = parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("El BCRA compró US$200 millones & subió el Merval");
    expect(items[0].link).toBe("https://www.ambito.com/nota-1");
    expect(items[0].summary).toBe("El dólar bajó");
  });
  it("parses Atom links", () => {
    expect(parseFeed(atom)[0]).toMatchObject({ title: "Atom title", link: "https://example.com/a" });
  });
  it("rejects non-http URLs", () => {
    expect(safeUrl("javascript:alert(1)")).toBeNull();
    expect(safeUrl("data:text/html,x")).toBeNull();
  });
  it("falls back to now for missing or future dates", () => {
    const now = new Date("2026-10-28T12:00:00Z");
    expect(normalizeDate(null, now)).toBe(now.toISOString());
    expect(normalizeDate("2030-01-01T00:00:00Z", now)).toBe(now.toISOString());
    expect(normalizeDate("Tue, 28 Oct 2026 10:00:00 GMT", now)).toBe("2026-10-28T10:00:00.000Z");
  });
});

describe("classify", () => {
  const item = (title: string) => ({ title, link: "https://x/1", summary: "", published: null });
  it("keeps the feed category for single-topic feeds", () => {
    expect(classify(item("Lo que pasó hoy"), feed("economia", "argentina"))).toEqual({ category: "economia", region: "argentina" });
  });
  it("classifies mixed feeds by keywords and drops noise", () => {
    expect(classify(item("La Fed mantiene las tasas de interés"), feed("mixto", "mundo"))?.category).toBe("economia");
    expect(classify(item("Elecciones en Francia: el presidente pierde la mayoría"), feed("mixto", "mundo"))?.category).toBe("politica");
    expect(classify(item("Messi volvió a marcar"), feed("mixto", "mundo"))).toBeNull();
    expect(classify(item("Una receta fácil"), feed("mixto", "mundo"))).toBeNull();
  });
  it("moves stories to Argentina or the region by subject", () => {
    expect(classify(item("Milei viaja a Washington"), feed("mixto", "mundo"))?.region).toBe("argentina");
    expect(classify(item("Lula anuncia un plan económico en Brasil"), feed("mixto", "mundo"))?.region).toBe("region");
  });
});

describe("rankStories", () => {
  const now = Date.parse("2026-10-28T12:00:00Z");
  const row = (title: string, source: string, h: number) => ({
    url: `https://x/${source}/${title.length}`, title, summary: "", source_name: source,
    published_at: new Date(now - h * 3_600_000).toISOString(),
  });
  it("groups the same event across outlets and ranks it first", () => {
    const stories = rankStories([
      row("Gato encontrado en un árbol de Palermo", "A", 0.5),
      row("El Gobierno anunció un acuerdo con el FMI por 20.000 millones", "A", 3),
      row("Acuerdo con el FMI: el Gobierno anunció 20.000 millones", "B", 2),
      row("FMI y Gobierno cierran acuerdo por 20.000 millones", "C", 1),
    ], now);
    expect(stories[0].sources.map((s) => s.name).sort()).toEqual(["A", "B", "C"]);
    expect(stories).toHaveLength(2);
  });
});

import { supabaseOrigin } from "../src/supabase";
describe("supabaseOrigin", () => {
  it("keeps only the project origin", () => {
    for (const u of ["https://abc.supabase.co", "https://abc.supabase.co/", " https://abc.supabase.co/rest/v1/ ", "https://abc.supabase.co/auth/v1"])
      expect(supabaseOrigin({ SUPABASE_URL: u } as never)).toBe("https://abc.supabase.co");
  });
});
