# A Mí Me Tocó... v0.8 — Entregas privadas

Esta versión incorpora **direcciones libres opcionales** y **solicitudes anónimas de dirección**. Es una actualización acumulativa sobre **v0.7.1** y no modifica las asignaciones del sorteo, las listas, ni el contenido de El Muro.

## Instalación en tu proyecto actual

1. En **Supabase → SQL Editor**, ejecuta únicamente `supabase/migrations/005_private_delivery.sql` (si 001–004 ya están aplicadas). Crea las tablas `delivery_addresses` y `delivery_requests`, sus índices, validadores de pertenencia al intercambio y RLS sin políticas públicas.
2. En **Supabase → Edge Functions → api**, sustituye el `index.ts` por `supabase/functions/api/index.ts` de este paquete. Despliega sin modificar los secretos y manteniendo la configuración de autenticación existente de la función. Nunca pegues la `service_role` key en el frontend.
3. Copia los archivos del paquete sobre el repositorio GitHub **sin borrar `.git`**. Haz commit `feat: private delivery addresses v0.8` y **Push origin**.
4. Comprueba que GitHub Actions ejecuta correctamente `build` y `deploy`; luego prueba en incógnito con las sesiones de cada participante.

**Orden obligatorio:** SQL → Edge Function → frontend. Una actualización incompleta puede causar errores en `delivery_status` al cargar la aplicación. Los datos actuales se conservan; no es necesario volver a registrar participantes.

## Comportamiento

- «Mi dirección» permite guardar, editar y borrar nombre del destinatario, tipo de dirección, dirección de formato libre y referencias opcionales.
- Solo el participante propietario puede editar la dirección. Es independiente del plazo de edición de deseos.
- Antes del sorteo, **nadie más** puede consultarla desde la aplicación.
- Después del sorteo, «¿A quién me tocó?» muestra al participante que regala la dirección **solo de su destinatario asignado**, si fue registrada. Un organizador sin esa asignación no puede consultarla por ser administrador.
- Si el destinatario no registra dirección, su amigo secreto puede pedirla con el botón «Solicitar dirección anónimamente». El destinatario ve una notificación interna cuando abre/recarga la web, y puede abrir la sección para registrarla. Solo se permite una solicitud pendiente por destinatario; el sistema impide la solicitud cuando la dirección existe.
- Entrega presencial: no necesita domicilio. No incluye chat, correo, WhatsApp ni notificaciones push.

## Pruebas mínimas con usuarios ficticios

1. **Antes del sorteo:** usuario A guarda una dirección; usuario B, El Muro y el panel de administrador no pueden verla. A puede editarla y borrarla.
2. **Después del sorteo (solo en intercambio de prueba):** el dador A ve exclusivamente la dirección de la persona que le tocó; B no ve datos de otros destinatarios. La tarjeta de entrega aparece en «¿A quién me tocó?».
3. **Sin dirección:** el dador envía una solicitud anónima. El destinatario ve «Tu amigo secreto necesita tu dirección» sin identidad del remitente. Un segundo intento no crea otra solicitud. Al registrar una dirección, desaparece el aviso y el dador puede verla al recargar.
4. **Cambio y eliminación:** el destinatario modifica su dirección; el dador ve la última versión al recargar. Si la borra, el dador deja de verla y puede volver a solicitarla.
5. **Seguridad:** intenta usar tokens de otro intercambio o editar una dirección ajena mediante peticiones manuales a la API; deben rechazarse o devolver únicamente datos propios. Verifica que ninguna respuesta de `dashboard` ni `wall` trae campos de domicilio.
6. **Wishlist cerrada:** aun con el cierre vencido, se puede modificar la dirección.

**Aviso:** los participantes en tu intercambio actual todavía no recibirán tarjetas de dirección de terceros hasta que **se haga el sorteo definitivo**. No lo publiques para probar direcciones: usa un intercambio de prueba o conserva las comprobaciones del sorteo para más adelante.

## Seguridad y límites

- Se utiliza una conexión HTTPS con token personal, autorizado en la Edge Function. Las tablas nuevas tienen RLS activada y ninguna política pública. La información **no** se envía en respuestas de El Muro, dashboard general ni vista de administración.
- Quien gestione la base de datos de Supabase con privilegios técnicos (`service_role` o propietario del proyecto) puede leer las direcciones. La privacidad es **entre usuarios de la aplicación**, no cifrado de extremo a extremo.
- La notificación es **interna**: no llega si la persona no vuelve a abrir la app.
- Los domicilios se eliminan al eliminar al participante o el intercambio (claves foráneas con `ON DELETE CASCADE`). **No se implementa borrado automático a los 30 días**: ese plazo se había propuesto, pero no se aprobó como regla final. Antes de usar domicilios reales debe definirse una política de retención, aviso de privacidad y borrado al finalizar el intercambio.
- Una invitación o sesión personal compartida también da acceso a la dirección del destinatario una vez sorteado; por eso los enlaces personales deben tratarse como privados.

## Limitaciones de verificación

Se verificó la sintaxis JSX y TypeScript con el parser local y la integridad del ZIP. La instalación de paquetes no estuvo disponible en el entorno de preparación: **no se pudo ejecutar `npm run build`** ni verificar el despliegue real en Supabase. GitHub Actions comprobará la compilación.
