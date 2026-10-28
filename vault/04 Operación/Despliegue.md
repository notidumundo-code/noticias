# Despliegue

Pasos detallados en el `README.md` del repo. Resumen:
1. Supabase → SQL Editor → correr `supabase/migrations/0001_init.sql`.
2. Cloudflare → Workers → *Import a repository* → `noticias`. Cada push a `main` despliega.
3. En el Worker → Settings → Variables: secrets `SUPABASE_URL` y `SUPABASE_SECRET_KEY`.
4. Login: crear tu usuario (email + contraseña) en Supabase, desactivar registros y cargar el secret `ALLOWED_EMAILS` en el Worker.
5. Abrir `/api/status` para ver las fuentes.
