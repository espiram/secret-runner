## Versión v0.8 — direcciones privadas y solicitudes anónimas

**Empieza por [`INSTALL_V0.8.md`](INSTALL_V0.8.md).** Instala en orden: migración `005_private_delivery.sql`, Edge Function `api`, frontend de GitHub Pages. El resto de este README documenta la v0.7.1 y los pasos de migración anteriores.

## Actualización v0.7.1: formulario de creación separado

- Página pública: `https://espiram.github.io/secret-runner/` — muestra únicamente inscripción/invitación; no presenta configuración ni clave de instalación.
- Ruta de creación: `https://espiram.github.io/secret-runner/#/admin` — muestra formulario de creación únicamente en esa ruta.
- **Seguridad:** la ruta es accesible para cualquiera que conozca su URL. No es un sistema de autenticación; la protección efectiva sigue estando en la verificación de `ADMIN_SETUP_SECRET` en la Edge Function. No coloques ese secreto en el repositorio ni en variables `VITE_`.
- **Limitación existente:** el backend de v0.7 todavía **rechaza** `bootstrap` si ya existe un intercambio (`count !== 0`). Esta actualización NO habilita crear más intercambios. La ruta privada permite utilizar el formulario de instalación, pero para crear un segundo intercambio se requerirá un cambio de backend posterior.
- Instalación desde v0.7: reemplaza los archivos del proyecto con esta versión y despliega GitHub Pages. **Sin cambios de SQL ni Edge Function.** La v0.7 debe estar desplegada previamente.
- Pruebas: (1) ventana incógnita en `/` no muestra formulario ni campo de clave; (2) `/#/admin` muestra formulario; (3) abrir una invitación `#/?invite=...` mantiene la inscripción; (4) el panel de organizador existente conserva su sesión y datos; (5) clave inválida no permite crear intercambio.

# A Mí Me Tocó... — v0.7.1 «Ruta administrativa privada»

Aplicación de intercambio de regalos con React/Vite, GitHub Pages y Supabase. Esta versión añade **Actividad, Deseos y Participantes** para miembros autenticados del intercambio; no revela a quién le tocó regalar a quién.

## Actualizar desde v0.6 — orden obligatorio

**1. Respaldo.** En Supabase crea un respaldo/exportación de las tablas `exchanges`, `participants`, `wishes`, `exclusions`, `assignments` antes de aplicar SQL. Conserva una copia de tu proyecto local.

**2. Migración.** Supabase → SQL Editor → ejecuta solo `supabase/migrations/004_wall.sql` en el proyecto existente. **No vuelvas a ejecutar `001`, `002`, `003`.** Este script añade `wish_deadline`, `exchange_timezone`, `image_url` y `wall_events`, crea disparadores de actividad y migra el historial de participantes/deseos. A los intercambios existentes se les asigna inicialmente la fecha del evento como límite de edición; los que no tienen fecha permanecen abiertos. Las asignaciones del sorteo no se modifican.

**3. Edge Function.** Supabase → Edge Functions → `api` → reemplaza el contenido de `index.ts` con `supabase/functions/api/index.ts` y despliega. Mantén tus secretos existentes y la configuración `verify_jwt = false` utilizada por esta arquitectura. No copies secretos a GitHub ni al frontend.

**4. Web.** Copia los archivos del ZIP sobre la raíz del repositorio `secret-runner` **sin borrar `.git`**. Commit: `feat: wall wish catalog and deadlines v0.7`, luego Push origin. Confirma que GitHub Actions finaliza `build` y `deploy` correctamente antes de usar el sitio.

**5. Validación.** Abre la aplicación con tu sesión actual. Debe aparecer la pestaña «El Muro», con Actividad, Deseos y Participantes. Revisa que tus participantes antiguos aparecen. Añade un deseo de prueba; debe aparecer en el muro. Verifica que el organizador puede modificar la fecha límite y que la lista se vuelve de solo lectura cuando vence. Realiza pruebas con usuarios ficticios, sin publicar el sorteo definitivo.

## Funcionalidad

- Muro privado disponible desde el registro, incluso antes del sorteo.
- Actividad automática: nuevos participantes, nuevos deseos y deseos actualizados. Eventos paginados de 10 en 10; el frontend agrupa adiciones recientes de la misma persona.
- Catálogo de deseos: búsqueda por producto/participante, filtro por participante, tarjeta con fotografía opcional y enlace externo.
- Directorio: todas las personas, también quienes figuran «Sin deseos».
- Cada persona puede agregar, **editar** o eliminar solo sus deseos mientras la fecha límite siga abierta. El organizador puede extenderla o reabrirla hasta el día del intercambio. La fecha se interpreta en `America/Mexico_City` por defecto.
- Extracción limitada de `og:image`/`og:title` al pegar un enlace HTTPS en tiendas compatibles. Si falla, se guarda el deseo sin imagen. No hace falta cuenta de compras; los enlaces se abren en la tienda original.
- No hay comentarios, reacciones, compras ni favoritos, y ninguna respuesta del muro contiene asignaciones.

## Limitaciones que conviene conocer

- Extracción automática de imágenes: **mejor esfuerzo, no garantizada**. Por seguridad, solo intenta acceder a los dominios de tiendas incluidos en `safeProductHost` en la Edge Function; algunas tiendas bloquean automatizaciones. La imagen puede caducar o impedir su visualización. No se almacena físicamente en Supabase Storage: se guarda la URL externa. El título del deseo sigue siendo editable.
- Si el evento ya pasó, la migración deja su lista cerrada; el organizador no puede extenderla después del día del evento. Para probar el muro con datos históricos, hazlo en un entorno de pruebas con fecha futura.
- El catálogo recupera hasta 1,000 deseos del intercambio por solicitud. Si piensas permitir grupos mucho más grandes, añade paginación de catálogo del lado del servidor.
- El cierre de edición se valida en la Edge Function al ejecutar una operación. La versión actual usa `service_role` solo en la función y no concede acceso directo a las tablas desde el navegador.
- El organizador que no participa puede ver El Muro, pero no crear deseos para sí mismo.
- Crear múltiples intercambios públicos y recuperar tokens perdidos **no** están incluidos en esta versión.

## Configuración existente

Mantén las variables GitHub `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, y en Supabase `ADMIN_SETUP_SECRET`, `ALLOWED_ORIGIN`. Conserva el nombre `secret-runner` y la clave local `secret_runner_token` si deseas mantener los enlaces y las sesiones actuales.

## Verificación / rollback

Si falla el `build`, GitHub Actions no debería publicar esa compilación. Si el backend fallara, restaura la Edge Function anterior y el frontend anterior. **No elimines columnas ni la tabla `wall_events` automáticamente en producción**: la migración contiene nuevas estructuras y no modifica asignaciones, y eliminarlas destruiría eventos recientes. Resuelve problemas con una migración correctiva si fuese necesario.
