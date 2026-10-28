import type { Feed } from "./types";

// Fuentes de noticias. Las marcadas "verificada" respondieron con items de 2026 al
// armar la app; el resto no se pudo probar desde el entorno de desarrollo y su
// estado real se ve en /api/status una vez desplegado. Una fuente caída no rompe nada.
export const FEEDS: Feed[] = [
  // ── Argentina · Economía (verificadas)
  { id: "ambito-economia", name: "Ámbito", url: "https://www.ambito.com/rss/pages/economia.xml", category: "economia", region: "argentina", lang: "es" },
  { id: "ambito-finanzas", name: "Ámbito Finanzas", url: "https://www.ambito.com/rss/pages/finanzas.xml", category: "economia", region: "argentina", lang: "es" },
  { id: "infobae-economia", name: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/economia/", category: "economia", region: "argentina", lang: "es" },
  { id: "lanacion-economia", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/economia/", category: "economia", region: "argentina", lang: "es" },
  { id: "iprofesional-economia", name: "iProfesional", url: "https://www.iprofesional.com/rss/economia", category: "economia", region: "argentina", lang: "es" },
  // Argentina · Economía (sin verificar)
  { id: "cronista-economia", name: "El Cronista", url: "https://www.cronista.com/files/rss/economia.xml", category: "economia", region: "argentina", lang: "es" },
  { id: "clarin-economia", name: "Clarín", url: "https://www.clarin.com/rss/economia/", category: "economia", region: "argentina", lang: "es" },

  // ── Argentina · Política (verificadas)
  { id: "ambito-politica", name: "Ámbito", url: "https://www.ambito.com/rss/pages/politica.xml", category: "politica", region: "argentina", lang: "es" },
  { id: "infobae-politica", name: "Infobae", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/politica/", category: "politica", region: "argentina", lang: "es" },
  { id: "lanacion-politica", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/politica/", category: "politica", region: "argentina", lang: "es" },
  { id: "perfil-politica", name: "Perfil", url: "https://www.perfil.com/feed/politica", category: "politica", region: "argentina", lang: "es" },
  // Argentina · Política (sin verificar)
  { id: "clarin-politica", name: "Clarín", url: "https://www.clarin.com/rss/politica/", category: "politica", region: "argentina", lang: "es" },
  { id: "pagina12-pais", name: "Página/12", url: "https://www.pagina12.com.ar/rss/secciones/el-pais/notas", category: "politica", region: "argentina", lang: "es" },

  // ── Región (verificadas)
  { id: "elpais-america", name: "El País América", url: "https://elpais.com/rss/elpais/america.xml", category: "mixto", region: "region", lang: "es" },
  { id: "bloomberglinea", name: "Bloomberg Línea", url: "https://www.bloomberglinea.com/arc/outboundfeeds/rss/?outputType=xml", category: "economia", region: "region", lang: "es" },
  { id: "infobae-america", name: "Infobae América", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/america/", category: "mixto", region: "region", lang: "es" },
  // Región (sin verificar)
  { id: "bbc-latam", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/temas/america_latina/rss.xml", category: "mixto", region: "region", lang: "es" },
  { id: "mercopress", name: "MercoPress", url: "https://es.mercopress.com/rss", category: "mixto", region: "region", lang: "es" },
  { id: "dw-latam", name: "DW", url: "https://rss.dw.com/rdf/rss-sp-al", category: "mixto", region: "region", lang: "es" },
  { id: "france24-latam", name: "France 24", url: "https://www.france24.com/es/am%C3%A9rica-latina/rss", category: "mixto", region: "region", lang: "es" },

  // ── Mundo (verificadas)
  { id: "lanacion-mundo", name: "La Nación", url: "https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/el-mundo/", category: "mixto", region: "mundo", lang: "es" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "mixto", region: "mundo", lang: "en" },
  // Mundo (sin verificar)
  { id: "bbc-mundo", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml", category: "mixto", region: "mundo", lang: "es" },
  { id: "bbc-business", name: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "economia", region: "mundo", lang: "en" },
  { id: "guardian-economics", name: "The Guardian", url: "https://www.theguardian.com/business/economics/rss", category: "economia", region: "mundo", lang: "en" },
  { id: "guardian-world", name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "mixto", region: "mundo", lang: "en" },
  { id: "elpais-internacional", name: "El País", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada", category: "mixto", region: "mundo", lang: "es" },
  { id: "elpais-economia", name: "El País Economía", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada", category: "economia", region: "mundo", lang: "es" },
  { id: "cnbc-economy", name: "CNBC", url: "https://www.cnbc.com/id/20910258/device/rss/rss.html", category: "economia", region: "mundo", lang: "en" },
];
