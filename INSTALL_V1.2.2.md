# A Mí Me Tocó... v1.2.2 — Fechas visibles

## Cambios
- La invitación muestra la fecha de sorteo / cierre de inscripciones.
- La cabecera del participante muestra esa fecha y el estado real de inscripciones.
- La sección Mi lista de deseos muestra explícitamente el último día para editar.
- La creación del intercambio identifica `join_deadline` como fecha de sorteo / cierre de inscripción.
- La API de vista previa entrega `join_deadline` y el estado de inscripciones.
- El cierre se valida conforme al día local `exchange_timezone` (por defecto `America/Mexico_City`), de forma inclusiva.

**Importante:** el sorteo continúa siendo manual. La fecha anunciada NO programa ni ejecuta automáticamente el sorteo. Para un intercambio existente se respeta la fecha `join_deadline` ya almacenada. No se modifica la fecha desde la interfaz en esta versión.

## Instalación
1. Actualiza la Edge Function `api` con `supabase/functions/api/index.ts`. Conserva los secretos.
2. Copia al repositorio `src/App.jsx` y `src/style.css`, haz commit y push.
3. Comprueba el build y despliegue en GitHub Actions.
4. Prueba la invitación en incógnito, el panel de un usuario y el plazo de deseos.

No requiere migraciones SQL. Mantiene el resto de funcionalidades de la v1.2.1.

## Pruebas esenciales
- Invitación: muestra fecha de entrega y fecha de sorteo/cierre distintas.
- Usuario registrado: ve la fecha del sorteo y el cierre de edición de deseos.
- El día del cierre: se permite registrar hasta el final del día local.
- El día siguiente: el servidor rechaza nuevos registros y la invitación indica cierre.
- El sorteo solo ocurre al pulsar su acción administrativa.
- El cierre de deseos sigue siendo independiente de las inscripciones.
