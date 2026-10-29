# Bitácora

## 2026-10-28
- Arranque del proyecto. Stack: Cloudflare Worker + assets, Supabase, PWA sin frameworks.
- Lectura escalonada de fuentes (6 por corrida, cron cada 5 min) para entrar en el plan gratis de Workers.
- Codex no está disponible en el entorno en la nube; se evaluará usarlo desde la compu del usuario.
- Vault copiada a `C:\NoticiasGlobales\vault` (clon del repo) en la PC Ultron.
- Revisión de seguridad con Codex: 4 hallazgos corregidos (ver [[Seguridad]]).
- La app se creó primero como Cloudflare Pages: no corre cron ni API. Hay que crearla como Worker.
- Login: Cloudflare Access (pedía tarjeta) → código por mail (Supabase no deja editar el mail sin SMTP) → email + contraseña.
- Tres rondas de revisión con Codex sobre el login. Límite aceptado: los contadores de intentos de Cloudflare son por ubicación (ok para una app de un usuario con contraseña fuerte).

## 2026-10-29
- No entraban noticias: (1) cada corrida superaba el límite de CPU y repetía las mismas fuentes; (2) la clave cargada era la pública de Supabase. Ambas cosas corregidas.
- Frecuencia elegida: cada medio se relee cada ~20 minutos (cron cada 2 min, 3 fuentes por corrida).
