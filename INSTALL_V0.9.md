# A Mí Me Tocó... v0.9 — varios intercambios privados

## Alcance
- Eliminar la restricción que limitaba la creación al primer intercambio.
- Mantener la ruta `#/admin` y la clave `ADMIN_SETUP_SECRET` validada en la Edge Function.
- Cada nuevo intercambio conserva su propio token administrativo, invitaciones, participantes, deseos y sorteos.
- Desde la sesión del organizador: botón **Crear otro intercambio** y selector **Mis intercambios en este dispositivo**.
- Los accesos administrativos guardados son **locales al navegador**, no un sistema de cuentas o sincronización. Cerrar sesión los elimina.

## Actualización desde v0.8
1. En Supabase > Edge Functions > api reemplaza `supabase/functions/api/index.ts` y despliega. Mantén `ADMIN_SETUP_SECRET`, `ALLOWED_ORIGIN` y el resto de los secretos actuales.
2. Copia los archivos del ZIP sobre el repositorio GitHub, sin borrar `.git`.
3. Commit `feat: multiple private exchanges v0.9`, push, revisa GitHub Actions.
4. **No hay SQL nuevo** para esta actualización.

## Pruebas
1. Inicia sesión como organizador de tu intercambio actual. Confirma que sigue presente y sus participantes no cambiaron.
2. Pulsa **Crear otro intercambio**; usa la clave de instalación correcta. Debe abrirse el panel del nuevo intercambio, vacío salvo el organizador.
3. Copia su enlace de invitación, ingresa desde incógnito y verifica que la inscripción nueva no aparece en el intercambio viejo.
4. Usa **Mis intercambios en este dispositivo** para volver al anterior y regresar al nuevo.
5. Prueba una clave incorrecta: no debe crear otro intercambio.
6. Cierra sesión: el dispositivo olvida los accesos guardados. Conserva tus enlaces/tokens de sesión administrativa en un lugar privado si vas a cambiar de equipo o borrar el navegador.

## Seguridad y limitaciones
- `#/admin` no es una barrera de seguridad; la Edge Function valida la clave.
- La clave debe ser larga y aleatoria. No la coloques en las variables `VITE_*` ni en GitHub público.
- Los tokens administrativos en localStorage son accesibles desde el navegador. Usa un equipo de confianza.
- Esta entrega **no añade recuperación de acceso ni cuentas de usuario**.
- El backend crea intercambio y organizador en dos operaciones. Si falla la segunda, intenta borrar el intercambio recién creado. Para mayores requisitos de robustez, migrar a una transacción SQL.
- No se ha probado contra tu Supabase real; valida antes de usarlo con participantes reales.
