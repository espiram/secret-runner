## v0.6
- Vista previa con nombre y detalles de intercambio antes de registrarse.
- Nombre de intercambio visible tras el registro.
- Acción de lectura restringida `invite_preview`; sin nueva migración SQL.

# Changelog

## v0.5 — A Mí Me Tocó...
- Nueva marca y lema: «Tú pon los regalos, nosotros el secreto».
- Eliminación de referencias a running en la experiencia del usuario.
- Nueva microcopia genérica para grupos de amigos, familia y trabajo.
- Conserva la paleta azul #2D4569 y rojo #E14549.
- Conserva localStorage, base de datos, Edge Function y rutas de GitHub Pages.
- No requiere nueva migración SQL desde v0.4.

# Changelog

## v0.3
- Nueva identidad azul marino y rojo basada en el emblema adjunto.
- Eslogan «Corre en equipo. Regala en secreto.»
- Nombre configurable al crear nuevos intercambios.
- Cambio de nombre desde el panel para intercambios ya existentes.
- Organizador puede participar o solo administrar (migración 002).
- Wishlist sin precio en formulario, tarjetas ni vista de asignación.
- Se conserva la columna de precio en PostgreSQL para no perder datos históricos.

## v0.4 — Safe draw testing
- Read-only feasibility simulation on server (no assignments persisted or exposed).
- Admin-only deletion of non-admin participants, with exact-name confirmation.
- Transactional cleanup of exclusions and wishes; disabled after draw.
- New migration 003_safe_draw_testing.sql.
