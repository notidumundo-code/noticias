# Bitácora

## 2026-10-28
- Arranque del proyecto. Stack: Cloudflare Worker + assets, Supabase, PWA sin frameworks.
- Lectura escalonada de fuentes (6 por corrida, cron cada 5 min) para entrar en el plan gratis de Workers.
- Codex no está disponible en el entorno en la nube; se evaluará usarlo desde la compu del usuario.
- Vault copiada a `C:\NoticiasGlobales\vault` (clon del repo) en la PC Ultron.
- Revisión de seguridad con Codex: 4 hallazgos corregidos (ver [[Seguridad]]).
- La app se creó primero como Cloudflare Pages: no corre cron ni API. Hay que crearla como Worker.
