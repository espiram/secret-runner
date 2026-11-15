# A Mí Me Tocó... v1.2 — Mensajes secretos y seguimiento de regalos

Esta actualización **parte del ZIP v1.1.1** y añade las tres tareas acordadas: mensaje personal obligatorio, marcar el regalo como enviado y confirmar la recepción en dos pasos para revelar el mensaje.

## Antes de actualizar

- Requiere las migraciones `001` a `006` y la Edge Function de v1.1.
- No elimines tablas ni ejecutes nuevamente `001_init.sql`.
- Si ya tienes usuarios reales, haz primero una copia de seguridad y, preferentemente, prueba en un proyecto Supabase separado.
- La confirmación de recepción es irreversible desde la aplicación; pruébala con un **intercambio ficticio ya sorteado**, no con el intercambio real.

## Instalación, en este orden

1. En Supabase > SQL Editor, ejecuta `supabase/migrations/007_gift_messages_and_status.sql`. Verifica que termine sin errores.
2. En Supabase > Edge Functions > `api`, reemplaza `index.ts` con `supabase/functions/api/index.ts` del ZIP y despliega. Conserva `ADMIN_SETUP_SECRET`, `ALLOWED_ORIGIN` y la configuración de JWT de tu proyecto.
3. Copia el contenido del ZIP al repositorio local, conservando el directorio `.git` y la configuración del proyecto.
4. Haz commit `feat: secret messages and gift tracking v1.2` y push a `main`.
5. En GitHub Actions comprueba que `build` y `deploy` terminen correctamente. Recarga la app sin caché.

**No hace falta configurar nuevos secretos ni reiniciar intercambios.**

## Qué hace

- Nueva pestaña **Mis tareas** para participantes del sorteo.
- El remitente escribe un mensaje personal entre 30 y 1000 caracteres, que puede editar mientras no se haya revelado.
- El remitente confirma el envío en dos pasos, también válido para entrega presencial.
- El receptor confirma en dos pasos la recepción, de forma irreversible.
- La recepción desbloquea únicamente el mensaje dirigido al receptor. Si todavía no existe un mensaje, aparece el estado *pendiente* y se revela automáticamente cuando se guarde.
- La recepción puede confirmarse aunque el remitente no marcara antes el envío.
- El administrador visualiza progreso agregado y nombres de remitentes pendientes de escribir, sin ver contenido, parejas asignadas ni identidades de remitentes en los mensajes recibidos.
- Los mensajes jamás se incluyen en `dashboard`, El Muro o vistas públicas.

## Casos mínimos a probar con tres participantes ficticios

1. Ejecuta un sorteo ficticio, abre tres enlaces personales distintos.
2. En la sesión A, intenta guardar mensajes de 29 y 1001 caracteres: deben rechazarse. Guarda uno válido y vuelve a cargar: debe mantenerse.
3. En B, consulta **Mis tareas**: todavía no debe aparecer el mensaje de quien le regala.
4. En A, marca regalo enviado: debe quedar registrado tras la segunda confirmación. En el destinatario debe aparecer solo el estado enviado, no la identidad de A.
5. En B, pulsa `Ya recibí mi regalo`; cancela la segunda confirmación: nada debe cambiar.
6. Vuelve a confirmar. Si el remitente guardó mensaje, debe mostrarse; si no, debe aparecer aviso de pendiente.
7. Comprueba que el remitente de un mensaje revelado no puede editarlo ni desde la UI ni mediante una petición directa.
8. Confirma que B puede marcar recibido aunque el remitente no haya marcado enviado.
9. Con sesión de administrador, revisa las estadísticas sin acceso al texto ni a las asignaciones.
10. Abre los enlaces desde otro dispositivo o incógnito; deben mantener los estados de sus participantes.
11. Intenta acceder con token inválido y verifica que la API lo rechace.
12. Verifica que El Muro y las direcciones privadas v0.8 sigan funcionando.

## Validación técnica

Los archivos JSX y TypeScript fueron inspeccionados mediante el parser de TypeScript sin errores de sintaxis. **No fue posible instalar las dependencias npm offline**, por lo que el build real de Vite y las pruebas de integración con Supabase quedan pendientes. No uses direcciones ni mensajes reales hasta completar estas pruebas.

## Notas de privacidad

La función de Supabase utiliza `service_role` para operar con `gift_fulfillment`, sin políticas RLS de lectura desde clientes anon/authenticated. La Edge Function comprueba el token personal y deriva la identidad de la asignación del servidor. Un administrador técnico de Supabase con privilegios de base de datos puede acceder a los mensajes almacenados en texto plano. La ruta administrativa de la web no concede permisos de lectura de mensajes.
