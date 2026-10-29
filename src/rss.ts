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

// indexOf-based lookup: much cheaper than building a RegExp per tag and item.
function tag(block: string, names: string[]): string | null {
  const lower = block.toLowerCase();
  for (const name of names) {
    const n = name.toLowerCase();
    let from = 0;
    while (true) {
      const start = lower.indexOf(`<${n}`, from);
      if (start < 0) break;
      const after = lower[start + n.length + 1];
      if (after !== ">" && after !== " " && after !== "\t" && after !== "\n" && after !== "\r") {
        from = start + 1; // e.g. <link> vs <linkage>, or <content> vs <content:encoded>
        continue;
      }
      const open = lower.indexOf(">", start);
      if (open < 0) break;
      if (lower[open - 1] === "/") { from = open; continue; } // self-closing, no text
      const close = lower.indexOf(`</${n}>`, open);
      if (close < 0) break;
      return block.slice(open + 1, close);
    }
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

/** Cuts the first `max` <item> (RSS) or <entry> (Atom) blocks out of the feed. */
function blocks(xml: string, max: number): string[] {
  const name = /<item[\s>]/i.test(xml) ? "item" : "entry";
  const re = new RegExp(`<${name}[\\s>][\\s\\S]*?</${name}>`, "gi");
  const out: string[] = [];
  for (let m = re.exec(xml); m && out.length < max; m = re.exec(xml)) out.push(m[0]);
  return out;
}

export function parseFeed(xml: string, maxItems = 30): RawItem[] {
  const out: RawItem[] = [];
  for (const raw of blocks(xml, maxItems)) {
    // Full article bodies are never used and are the bulk of large feeds.
    const b = raw.replace(/<content:encoded[\s\S]*?<\/content:encoded>/gi, "");
    const title = cleanText(tag(b, ["title"]) ?? "");
    const rawLink = tag(b, ["link"]);
    const link = safeUrl(rawLink && rawLink.trim() ? rawLink : atomLink(b) ?? tag(b, ["guid", "id"]));
    if (!title || !link) continue;
    // Only the first ~400 chars are kept, so cleaning more than this is wasted CPU.
    const summary = cleanText((tag(b, ["description", "summary", "content"]) ?? "").slice(0, 1500)).slice(0, 400);
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
