# Arquitectura

```
 Medios (RSS)  ──►  Worker de Cloudflare (cron cada 2 min)  ──►  Supabase (Postgres)
                                                                     │
 iPhone / navegador  ◄──  PWA (assets en Cloudflare) ◄── /api/news ◄─┘
```

- **Worker de Cloudflare** (`src/worker.ts`): hace dos cosas.
  - *Cron* cada 2 minutos: lee las 3 fuentes que hace más tiempo no se leen, clasifica cada nota y la guarda. Con 24 fuentes, cada medio se relee cada ~20 min (elegido por el usuario). Ir de a pocas mantiene el uso de CPU bajo el límite de 10 ms del plan gratis; las fuentes se marcan antes de leerlas para que una corrida cortada no trabe la rotación.
  - *API* (requiere login): `/api/news?hours=1|24|48|72|168` devuelve las historias agrupadas y ordenadas; `/api/status` muestra el estado de cada fuente (botón **Fuentes** de la app).
  - *Login*: `/api/auth/login` y `/api/auth/logout` (proxy a Supabase Auth, ver [[Seguridad]]).
  - *Salud* (pública, solo conteos): `/api/health` muestra la última corrida, fuentes OK/fallando y notas de las últimas 24 h.
- **Supabase**: tablas `articles` y `feed_status`. Solo el Worker accede, con la clave secreta. Se guardan 14 días.
- **PWA** (`public/`): HTML + CSS + JS sin frameworks. Service worker que guarda solo la interfaz (no las noticias) para abrir rápido.

Ver también [[Relevancia]], [[Seguridad]].
