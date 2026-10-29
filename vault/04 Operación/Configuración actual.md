# Configuración actual

- **App**: https://noticias.conocimientosfinancieros5.workers.dev (Worker `noticias` en Cloudflare, se despliega solo con cada push a `main`).
- **Código**: https://github.com/notidumundo-code/noticias
- **Copia local**: `C:\NoticiasGlobales` (la vault es `C:\NoticiasGlobales\vault`; actualizar con `git pull`).
- **Base de datos**: Supabase, tablas `articles` y `feed_status` (`supabase/migrations/`).

## Variables del Worker (Cloudflare → Worker → Settings → Variables and secrets)
| Nombre | Tipo | Valor |
|---|---|---|
| `SUPABASE_URL` | Secret | `https://<proyecto>.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret | clave secreta de Supabase (`sb_secret_…`) |
| `ALLOWED_EMAILS` | Secret | tu email (varios separados por coma) |
| `FEEDS_PER_RUN` | Variable | `3` (viene de `wrangler.jsonc`) |

Las claves nunca se guardan en esta vault ni en GitHub.

## Frecuencia
Cron cada 2 minutos, 3 fuentes por corrida → cada medio se relee cada ~20 minutos. Entra holgado en el plan gratis (menos del 1 % de las ejecuciones diarias).

## Login
Usuario creado a mano en Supabase → Authentication → Users, con registros desactivados. La contraseña se pide una vez por dispositivo.
