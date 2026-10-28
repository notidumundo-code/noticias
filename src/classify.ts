import type { Category, Feed, RawItem, Region } from "./types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const ECON = [
  "econom", "inflacion", "inflation", "dolar", "dollar", "peso", "pbi", "gdp", "mercado", "market", "bolsa", "stock",
  "acciones", "shares", "bono", "bond", "tasa", "interest rate", "rates", "banco central", "central bank", "bcra", "fed ",
  "fmi", "imf", "deuda", "debt", "export", "import", "arancel", "tariff", "comercio", "trade", "petroleo", "oil",
  "salario", "wage", "empleo", "desempleo", "jobs", "unemployment", "impuesto", "tax", "presupuesto", "budget",
  "riesgo pais", "reservas", "inversion", "invest", "recesion", "recession", "precio", "price", "crecimiento", "growth",
  "empresa", "compan", "industria", "industry", "litio", "soja", "cripto", "crypto", "bitcoin", "wall street", "merval",
];
const POL = [
  "politic", "eleccion", "election", "vot", "gobierno", "government", "president", "congreso", "congress", "senado",
  "senate", "diputad", "parlament", "ministr", "ley ", "law", "decreto", "decree", "oposicion", "opposition", "partido",
  "party", "gabinete", "cabinet", "guerra", "war", "conflict", "ataque", "attack", "acuerdo", "deal", "cumbre", "summit",
  "sancion", "sanction", "diplomat", "canciller", "otan", "nato", "onu", "united nations", "protesta", "protest",
  "corte suprema", "supreme court", "justicia", "milei", "trump", "golpe", "coup", "frontera", "border", "migra",
];
const NOISE = [
  "futbol", "football", "soccer", "boca", "river plate", "messi", "tenis", "tennis", "nba", "formula 1", "f1 ",
  "horoscopo", "receta", "recipe", "celebrity", "farandula", "serie de netflix", "pelicula", "movie", "quiniela",
  "loteria", "clima hoy", "pronostico del tiempo", "weather forecast",
];
const ARG = ["argentin", "milei", "caputo", "buenos aires", "bcra", "casa rosada", "kicillof", "merval", "indec"];
const LATAM = [
  "brasil", "brazil", "lula", "chile", "uruguay", "paraguay", "bolivia", "peru", "ecuador", "colombia", "venezuela",
  "maduro", "mexico", "sheinbaum", "cuba", "mercosur", "america latina", "latin america", "latinoamerica", "centroamerica",
];

function hits(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) if (text.includes(w)) n++;
  return n;
}

/** Decides category and region for an item, or null when it is off-topic noise. */
export function classify(item: RawItem, feed: Feed): { category: Category; region: Region } | null {
  const title = norm(item.title);
  const text = `${title} ${norm(item.summary)}`;
  if (hits(title, NOISE) > 0) return null;

  let category: Category;
  if (feed.category === "mixto") {
    const e = hits(text, ECON) + hits(title, ECON); // title counts double
    const p = hits(text, POL) + hits(title, POL);
    if (e === 0 && p === 0) return null;
    category = e > p ? "economia" : "politica";
  } else {
    category = feed.category;
  }

  // A regional or world outlet writing about Argentina belongs to the Argentina bucket;
  // a world outlet writing about Latin America belongs to the region bucket.
  let region = feed.region;
  if (region !== "argentina" && hits(title, ARG) > 0) region = "argentina";
  else if (region === "mundo" && hits(title, LATAM) > 0) region = "region";
  return { category, region };
}

const STOP = new Set(
  ("de la el en y a los las del que por con un una para se su al es lo como mas sus tras sobre ante entre " +
    "the of to in and a for on is with as at by from its after over new says").split(" "),
);

export function tokens(title: string): Set<string> {
  return new Set(norm(title).replace(/[^a-z0-9ñ ]+/g, " ").split(" ").filter((w) => w.length > 2 && !STOP.has(w)));
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / Math.min(a.size, b.size);
}

export interface Story {
  title: string;
  url: string;
  summary: string;
  source: string;
  published_at: string;
  sources: { name: string; url: string }[];
  score: number;
}

interface Row {
  url: string;
  title: string;
  summary: string;
  source_name: string;
  published_at: string;
}

/**
 * Groups articles about the same event and ranks the groups. Coverage by several
 * outlets is the main relevance signal; recency breaks ties and decays old stories.
 */
export function rankStories(rows: Row[], now: number, limit = 25): Story[] {
  const groups: { toks: Set<string>; rows: Row[] }[] = [];
  for (const r of rows) {
    const t = tokens(r.title);
    const g = groups.find((g) => similarity(g.toks, t) >= 0.5);
    if (g) g.rows.push(r);
    else groups.push({ toks: t, rows: [r] });
  }
  const stories = groups.map((g) => {
    const sorted = g.rows.sort((a, b) => b.published_at.localeCompare(a.published_at));
    const lead = sorted[sorted.length - 1]; // earliest report keeps the headline
    const outlets = new Map<string, string>();
    for (const r of sorted) if (!outlets.has(r.source_name)) outlets.set(r.source_name, r.url);
    const ageH = (now - Date.parse(sorted[0].published_at)) / 3_600_000;
    const score = outlets.size * 2 + Math.max(0, 6 - ageH / 4);
    return {
      title: lead.title,
      url: lead.url,
      summary: lead.summary,
      source: lead.source_name,
      published_at: sorted[0].published_at,
      sources: [...outlets].map(([name, url]) => ({ name, url })),
      score: Math.round(score * 10) / 10,
    };
  });
  return stories.sort((a, b) => b.score - a.score).slice(0, limit);
}
