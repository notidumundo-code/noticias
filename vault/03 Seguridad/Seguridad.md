# Seguridad

- **Login con Supabase Auth** (gratis): email + contraseña. Solo los emails de `ALLOWED_EMAILS` pueden entrar; registro de usuarios desactivado. El Worker siempre consulta a Supabase para no revelar por tiempo qué emails están permitidos. La sesión vive en cookies `HttpOnly; Secure; SameSite=Strict` que el JavaScript no puede leer, y se renueva sola. Intentos limitados a 5/min por IP y 5/min por cuenta; sin limitador, el login se rechaza. Si `ALLOWED_EMAILS` no está, la API no responde a nadie (falla cerrada).
- **Claves**: la clave secreta de Supabase vive solo como *secret* del Worker. Nunca llega al navegador ni a GitHub (`.dev.vars` está en `.gitignore`).
- **Supabase**: RLS activado sin políticas y permisos revocados a `anon`/`authenticated`. La clave pública no sirve para nada.
- **Navegador**: Content-Security-Policy estricta (sin scripts externos ni inline), HSTS, `X-Frame-Options`, `Referrer-Policy: no-referrer`.
- **Contenido externo**: los textos de los RSS se limpian de HTML y se muestran con `textContent`; solo se aceptan links `http(s)`.
- **API**: `GET` para datos y `POST` solo para login/logout (con chequeo de `Origin`), parámetros con valores permitidos fijos, errores sin detalles internos. `/api/health` es pública pero solo devuelve conteos y errores de fuentes.
- **Caché**: las respuestas de la API salen con `private, no-store` y las noticias no se guardan en el teléfono.

## Revisión con Codex (2026-10-28)
Codex encontró 4 puntos, todos corregidos: API abierta si faltaba la config de Access (alta), cabecera de caché en respuestas cacheadas (media), copia offline sin vencimiento (media), falta de chequeo `nbf` en el JWT (baja). Sin XSS, inyección ni secretos expuestos.

## Cambio de login (2026-10-28)
Cloudflare Access pedía tarjeta, así que se reemplazó por Supabase Auth con código por email.
Después se pasó de código por mail a contraseña: Supabase no deja editar el mail sin SMTP propio. Codex revisó el login y se corrigieron 6 puntos (límite de intentos eludible, caché de tokens vencidos, enumeración por tiempo, logout sin revocar, logout que fallaba en silencio, noticias offline sin sesión: ya no se guardan noticias en el teléfono).
