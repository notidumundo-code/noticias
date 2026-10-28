# Seguridad

- **Login con Cloudflare Access** (gratis hasta 50 usuarios): nadie ve la app sin entrar con tu email. Además el Worker verifica el token de Access en `/api/*`, así que ni la URL `*.workers.dev` responde sin login.
- **Claves**: la clave secreta de Supabase vive solo como *secret* del Worker. Nunca llega al navegador ni a GitHub (`.dev.vars` está en `.gitignore`).
- **Supabase**: RLS activado sin políticas y permisos revocados a `anon`/`authenticated`. La clave pública no sirve para nada.
- **Navegador**: Content-Security-Policy estricta (sin scripts externos ni inline), HSTS, `X-Frame-Options`, `Referrer-Policy: no-referrer`.
- **Contenido externo**: los textos de los RSS se limpian de HTML y se muestran con `textContent`; solo se aceptan links `http(s)`.
- **API**: solo `GET`, parámetros con valores permitidos fijos, errores sin detalles internos.
