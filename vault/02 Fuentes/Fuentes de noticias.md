# Fuentes de noticias

La lista vive en `src/feeds.ts`. Agregar un medio = agregar una línea con su RSS, categoría (`economia`, `politica` o `mixto`) y región.

| Bucket | Verificadas (oct 2026) | Sin verificar |
|---|---|---|
| Argentina · Economía | Ámbito, Ámbito Finanzas, Infobae, La Nación, iProfesional | El Cronista, Clarín |
| Argentina · Política | Ámbito, Infobae, La Nación, Perfil | Clarín, Página/12 |
| Región | El País América, Bloomberg Línea, Infobae América | BBC Mundo AL, MercoPress, DW, France 24 |
| Mundo | La Nación El Mundo, Al Jazeera | BBC, The Guardian, El País, CNBC |

"Sin verificar" = no se pudo probar desde el entorno de desarrollo. Una vez desplegado, `/api/status` muestra cuáles responden. Una fuente caída no rompe nada.
