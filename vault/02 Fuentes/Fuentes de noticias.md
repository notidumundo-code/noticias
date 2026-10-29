# Fuentes de noticias

La lista vive en `src/feeds.ts`. Agregar un medio = agregar una línea con su RSS, categoría (`economia`, `politica` o `mixto`) y región. El estado de cada una se ve en el botón **Fuentes** de la app.

Revisadas en producción el 2026-10-29 (24 fuentes):

| Bucket | Fuentes |
|---|---|
| Argentina · Economía | Ámbito, Ámbito Finanzas, La Nación, iProfesional, El Cronista (mixto), Clarín |
| Argentina · Política | Ámbito, La Nación, Clarín, Página/12 (mixto) |
| Región | El País América, Bloomberg Línea, MercoPress, France 24 |
| Mundo | La Nación El Mundo, DW, Al Jazeera, BBC Mundo, BBC Business, The Guardian (x2), El País (x2), CNBC |

Descartadas: Infobae (bloquea a Cloudflare con 403), Perfil Política (sin notas desde junio 2026), BBC Mundo América Latina (duplicaba BBC Mundo), DW América Latina (vacío; reemplazado por DW general).
