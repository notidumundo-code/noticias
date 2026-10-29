import type { Feed } from "./types";

// Fuentes de noticias, revisadas en producción el 2026-10-29. El estado de cada una
// se ve en el botón "Fuentes" de la app (/api/status). Una fuente caída no rompe nada.
// Descartadas: Infobae (bloquea a Cloudflare con 403), Perfil Política (sin notas
// nuevas desde junio de 2026), BBC Mundo América Latina (redirige al feed general).
export const FEEDS: Feed[] = [
  // ── Argentina · Economía
  { id: "ambito-economia", name: "Ámbito", url: "https://www.ambito.com/rss/pages/economia.xml", category: "economia", region: "argentina", lang: "es" },
  { id: "ambito-finanzas", name: "Ámbito Finanzas", url: "https://www.ambito.com/rss/pages/finanzas.xml", category: "economia", region: "argentina", lang: "es" },
  { id: "lanacion-economia", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/", category: "economia", region: "argentina", lang: "es" },
  { id: "iprofesional-economia", name: "iProfesional", url: "https://www.iprofesional.com/rss/economia", category: "economia", region: "argentina", lang: "es" },
  { id: "cronista-economia", name: "El Cronista", url: "https://www.cronista.com/arc/outboundfeeds/rss/category/economia-politica/", category: "mixto", region: "argentina", lang: "es" },
  { id: "clarin-economia", name: "Clarín", url: "https://www.clarin.com/rss/economia/", category: "economia", region: "argentina", lang: "es" },

  // ── Argentina · Política
  { id: "ambito-politica", name: "Ámbito", url: "https://www.ambito.com/rss/pages/politica.xml", category: "politica", region: "argentina", lang: "es" },
  { id: "lanacion-politica", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/", category: "politica", region: "argentina", lang: "es" },
  { id: "clarin-politica", name: "Clarín", url: "https://www.clarin.com/rss/politica/", category: "politica", region: "argentina", lang: "es" },
  { id: "pagina12-pais", name: "Página/12", url: "https://www.pagina12.com.ar/arc/outboundfeeds/rss/?outputType=xml", category: "mixto", region: "argentina", lang: "es" },

  // ── Región
  { id: "elpais-america", name: "El País América", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/america/portada", category: "mixto", region: "region", lang: "es" },
  { id: "bloomberglinea", name: "Bloomberg Línea", url: "https://www.bloomberglinea.com/arc/outboundfeeds/rss/?outputType=xml", category: "economia", region: "region", lang: "es" },
  { id: "mercopress", name: "MercoPress", url: "https://es.mercopress.com/rss", category: "mixto", region: "region", lang: "es" },
  { id: "france24-latam", name: "France 24", url: "https://www.france24.com/es/am%C3%A9rica-latina/rss", category: "mixto", region: "region", lang: "es" },

  // ── Mundo
  { id: "lanacion-mundo", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/el-mundo/", category: "mixto", region: "mundo", lang: "es" },
  { id: "dw-espanol", name: "DW", url: "https://rss.dw.com/rdf/rss-sp-all", category: "mixto", region: "mundo", lang: "es" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "mixto", region: "mundo", lang: "en" },
  { id: "bbc-mundo", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml", category: "mixto", region: "mundo", lang: "es" },
  { id: "bbc-business", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "economia", region: "mundo", lang: "en" },
  { id: "guardian-economics", name: "The Guardian", url: "https://www.theguardian.com/business/economics/rss", category: "economia", region: "mundo", lang: "en" },
  { id: "guardian-world", name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "mixto", region: "mundo", lang: "en" },
  { id: "elpais-internacional", name: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada", category: "mixto", region: "mundo", lang: "es" },
  { id: "elpais-economia", name: "El País Economía", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada", category: "economia", region: "mundo", lang: "es" },
  { id: "cnbc-economy", name: "CNBC", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", category: "economia", region: "mundo", lang: "en" },
];
