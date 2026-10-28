# Noticias Globales

PWA personal (web + pantalla de inicio del iPhone) con las noticias **económicas** y **políticas** del día, separadas en **Argentina**, **Región** y **Mundo**. Se actualiza sola: un Worker de Cloudflare lee ~30 medios por RSS cada pocos minutos y guarda las notas en Supabase.

- `src/` Worker: cron de ingesta + API (`/api/news`, `/api/status`)
- `public/` PWA sin frameworks (HTML/CSS/JS, service worker, íconos)
- `supabase/migrations/` esquema de base de datos
- `vault/` bóveda de Obsidian con la documentación del proyecto

## Despliegue

### 1. Supabase
1. Abrí tu proyecto → **SQL Editor** → pegá y ejecutá `supabase/migrations/0001_init.sql`.
2. **Project Settings → API Keys**: copiá la **Project URL** y una **secret key** (`sb_secret_…`; sirve también la `service_role` legacy). Esa clave nunca va al navegador ni a GitHub.

### 2. Cloudflare Worker
1. **Workers & Pages → Create → Import a repository** → elegí `noticias`. Build command: vacío. Deploy command: `npx wrangler deploy`. Cada push a `main` despliega solo.
2. En el Worker → **Settings → Variables and Secrets**, agregá como *Secret*:
   - `SUPABASE_URL`
   - `SUPABASE_SECRET_KEY`
3. Los *Cron Triggers* (`*/5 * * * *`) se crean desde `wrangler.jsonc`.

### 3. Login (Cloudflare Access) — obligatorio
Hasta completar este paso la API responde `503` a todos: la app no muestra noticias sin login configurado.

1. **Zero Trust → Access → Applications → Add → Self-hosted**: dominio del Worker (`noticias-globales.<tu-subdominio>.workers.dev` o tu dominio). Política: *Allow* → *Emails* → tu email.
2. Copiá el **Application Audience (AUD) Tag** y tu *team domain* (`<equipo>.cloudflareaccess.com`).
3. Cargalos como variables del Worker: `ACCESS_TEAM_DOMAIN` y `ACCESS_AUD`. Desde ahí la API rechaza cualquier pedido sin login, incluso si alguien saltea Access.
4. (Solo desarrollo local) `PUBLIC_API=true` en `.dev.vars` desactiva el chequeo. No lo uses en producción.

### 4. Comprobar
- `https://<tu-url>/api/status` muestra cada fuente con su último error y cantidad de notas (las primeras ~25 minutos se van llenando).
- En el iPhone: Safari → la URL → Compartir → **Agregar a pantalla de inicio**.

## Desarrollo
```bash
npm install
cp .dev.vars.example .dev.vars   # completar
npm run dev                       # http://localhost:8787 ; cron manual: curl "localhost:8787/__scheduled"
npm test && npm run typecheck
```
`wrangler dev --test-scheduled` habilita el endpoint `/__scheduled` para probar la ingesta.

## Seguridad
Resumen en `vault/03 Seguridad/Seguridad.md`: Cloudflare Access + verificación de JWT en la API, RLS sin políticas en Supabase, CSP estricta sin scripts externos, secretos solo en Cloudflare.
