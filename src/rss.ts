import type { RawItem } from "./types";

// Lightweight RSS 2.0 / RDF / Atom parser. Regex-based on purpose: a full XML
// parser costs too much CPU for the Workers free plan (10 ms per invocation).

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú", Ntilde: "Ñ",
  uuml: "ü", iexcl: "¡", iquest: "¿", laquo: "«", raquo: "»", hellip: "…",
  ndash: "–", mdash: "—", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENTITIES[code] ?? m;
  });
}

/** Turns a fragment (possibly CDATA / HTML) into plain, single-spaced text. */
export function cleanText(s: string): string {
  let t = s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  t = decodeEntities(t); // HTML inside RSS is usually escaped once
  t = t.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  t = t.replace(/<[^>]+>/g, " ");
  t = decodeEntities(t);
  return t.replace(/\s+/g, " ").trim();
}

function tag(block: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
    const m = block.match(re);
    if (m) return m[1];
  }
  return null;
}

function atomLink(block: string): string | null {
  const links = block.match(/<link\b[^>]*>/gi) ?? [];
  let fallback: string | null = null;
  for (const l of links) {
    const href = l.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    const rel = l.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!rel || rel === "alternate") return href;
    fallback ??= href;
  }
  return fallback;
}

/** Only absolute http(s) URLs survive; everything else (javascript:, data:) is dropped. */
export function safeUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(decodeEntities(cleanText(raw)));
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    for (const p of [...u.searchParams.keys()]) {
      if (/^utm_|^fbclid$|^gclid$/i.test(p)) u.searchParams.delete(p);
    }
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function parseFeed(xml: string, maxItems = 40): RawItem[] {
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/gi) ?? [];
  const out: RawItem[] = [];
  for (const b of blocks.slice(0, maxItems)) {
    const title = cleanText(tag(b, ["title"]) ?? "");
    const rawLink = tag(b, ["link"]);
    const link = safeUrl(rawLink && rawLink.trim() ? rawLink : atomLink(b) ?? tag(b, ["guid", "id"]));
    if (!title || !link) continue;
    const summary = cleanText(tag(b, ["description", "summary", "content:encoded", "content"]) ?? "").slice(0, 400);
    const published = tag(b, ["pubDate", "published", "updated", "dc:date"]);
    out.push({ title: title.slice(0, 300), link, summary, published: published ? cleanText(published) : null });
  }
  return out;
}

/** Parses a feed date; missing, invalid or future dates fall back to `now`. */
export function normalizeDate(raw: string | null, now: Date): string {
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime()) && d.getTime() <= now.getTime() + 10 * 60_000) return d.toISOString();
  }
  return now.toISOString();
}
