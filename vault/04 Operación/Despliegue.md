# Despliegue

Pasos detallados en el `README.md` del repo. Resumen:
1. Supabase → SQL Editor → correr `supabase/migrations/0001_init.sql`.
2. Cloudflare → Workers → *Import a repository* → `noticias`. Cada push a `main` despliega.
3. En el Worker → Settings → Variables: secrets `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. Ojo: tiene que ser la clave **secreta** (`sb_secret_…` o `service_role`), no la publishable/anon; con la pública el login anda pero no se guardan noticias.
4. Login: crear tu usuario (email + contraseña) en Supabase, desactivar registros y cargar el secret `ALLOWED_EMAILS` en el Worker.
5. Verificar: `/api/health` (sin login) o el botón **Fuentes** en la app.
