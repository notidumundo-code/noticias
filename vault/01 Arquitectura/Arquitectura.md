# Arquitectura

```
 Medios (RSS)  ──►  Worker de Cloudflare (cron cada 5 min)  ──►  Supabase (Postgres)
                                                                     │
 iPhone / navegador  ◄──  PWA (assets en Cloudflare) ◄── /api/news ◄─┘
```

- **Worker de Cloudflare** (`src/worker.ts`): hace dos cosas.
  - *Cron* cada 5 minutos: lee las 6 fuentes que hace más tiempo no se leen, clasifica cada nota y la guarda. Con ~30 fuentes, cada medio se relee cada ~25 min. Ir de a pocas mantiene el uso de CPU bajo el límite del plan gratis.
  - *API*: `/api/news?hours=24` devuelve las historias agrupadas y ordenadas; `/api/status` muestra el estado de cada fuente.
- **Supabase**: tablas `articles` y `feed_status`. Solo el Worker accede, con la clave secreta. Se guardan 14 días.
- **PWA** (`public/`): HTML + CSS + JS sin frameworks. Service worker para abrir rápido y funcionar sin conexión con lo último descargado.

Ver también [[Relevancia]], [[Seguridad]].
