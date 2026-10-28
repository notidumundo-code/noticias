# Seguridad

- **Login con Supabase Auth** (gratis): email + código de un solo uso. Solo los emails de `ALLOWED_EMAILS` reciben código; registro de usuarios desactivado. La sesión vive en cookies `HttpOnly; Secure; SameSite=Strict` que el JavaScript no puede leer, y se renueva sola. Intentos limitados a 5/min. Si `ALLOWED_EMAILS` no está, la API no responde a nadie (falla cerrada).
- **Claves**: la clave secreta de Supabase vive solo como *secret* del Worker. Nunca llega al navegador ni a GitHub (`.dev.vars` está en `.gitignore`).
- **Supabase**: RLS activado sin políticas y permisos revocados a `anon`/`authenticated`. La clave pública no sirve para nada.
- **Navegador**: Content-Security-Policy estricta (sin scripts externos ni inline), HSTS, `X-Frame-Options`, `Referrer-Policy: no-referrer`.
- **Contenido externo**: los textos de los RSS se limpian de HTML y se muestran con `textContent`; solo se aceptan links `http(s)`.
- **API**: solo `GET`, parámetros con valores permitidos fijos, errores sin detalles internos.
- **Caché**: las respuestas de la API salen con `private, no-store`; la copia offline del iPhone se descarta a las 48 h o al cerrar sesión.

## Revisión con Codex (2026-10-28)
Codex encontró 4 puntos, todos corregidos: API abierta si faltaba la config de Access (alta), cabecera de caché en respuestas cacheadas (media), copia offline sin vencimiento (media), falta de chequeo `nbf` en el JWT (baja). Sin XSS, inyección ni secretos expuestos.

## Cambio de login (2026-10-28)
Cloudflare Access pedía tarjeta, así que se reemplazó por Supabase Auth con código por email.
