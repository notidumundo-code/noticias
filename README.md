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

### 3. Login (Supabase Auth con email y contraseña, gratis)
Hasta completar este paso la API responde `503` a todos: la app no muestra noticias sin login configurado.
1. Supabase → **Authentication → Users → Add user → Create new user**: tu email y una contraseña fuerte (es la que vas a usar en la app), marcá *Auto Confirm User*.
2. **Authentication → Sign In / Providers**: desactivá *Allow new users to sign up* (nadie más puede crearse cuenta).
3. Cloudflare → Worker → **Settings → Variables and Secrets**: Secret `ALLOWED_EMAILS` = tu email (varios separados por coma).
4. Si activaste Cloudflare Access en la pestaña *Access* del Worker, desactivalo.

La sesión queda guardada en cookies `HttpOnly` y se renueva sola: la contraseña se pide una vez por dispositivo. No hace falta configurar mails. Los intentos de login están limitados a 5 por minuto.
(Solo desarrollo local) `PUBLIC_API=true` en `.dev.vars` desactiva el login. No lo uses en producción.

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
Resumen en `vault/03 Seguridad/Seguridad.md`: login con Supabase Auth (email + contraseña) con cookies HttpOnly, RLS sin políticas en Supabase, CSP estricta sin scripts externos, secretos solo en Cloudflare.
