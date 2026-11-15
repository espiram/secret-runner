# A Mí Me Tocó... v1.1 — Bloqueo de nombres duplicados

Actualiza sobre v1.0. **Se requiere una migración SQL y una actualización de la Edge Function**.

1. En Supabase SQL Editor ejecuta `supabase/migrations/006_unique_participant_names.sql`.
   - Antes de crear el índice, detecta nombres previamente duplicados por intercambio.
   - Si hay colisiones, la transacción se cancela sin borrar participantes: corrige los nombres duplicados y vuelve a ejecutarla.
2. En Supabase → Edge Functions → `api`, publica el contenido de `supabase/functions/api/index.ts`.
3. Copia el resto de archivos sobre tu repositorio (conserva `.git`) y haz push a `main`.
4. Confirma el build y deploy de GitHub Actions.

## Pruebas

- Inscríbete con un nombre nuevo: debe marcar «Nombre disponible» y permitir continuar.
- Abre otra sesión de incógnito con la misma invitación. Intenta el nombre anterior con otras mayúsculas, espacios y acentos: debe bloquear el botón.
- Intenta el registro con la API directamente: la base de datos lo debe rechazar (`23505`).
- Dos personas con el mismo nombre pueden registrarse en intercambios distintos.
- Dos personas distintas con nombre parecido pueden usar apellidos o iniciales diferentes.
- El enlace personal sigue recuperando la sesión original desde otro navegador.
- Comprueba que el organizador no pueda cambiar su nombre a uno ocupado.

## Seguridad y límites

El nombre no autentica a nadie: una coincidencia no permite recuperar tokens, sesiones ni asignaciones. La comprobación es orientativa y la restricción SQL es definitiva incluso si dos inscripciones ocurren a la vez. La consulta `check_name` únicamente confirma un booleano para una invitación válida. La migración se ejecuta en una transacción y no elimina datos.
