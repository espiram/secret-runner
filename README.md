# Secret Runner v0.3 — Actualización de diseño y organizador

Esta versión incorpora paleta azul `#2D4569` y rojo `#E14549`, eslogan «Corre en equipo. Regala en secreto.», nombre configurable del organizador, opción para participar o solo organizar y wishlist sin precios.

## Instalación en proyecto EXISTENTE

1. **Supabase SQL Editor:** ejecuta `supabase/migrations/002_organizer_participation.sql` **solo si todavía no lo ejecutaste**. Esta migración agrega `participants.participates` y reemplaza `publish_draw`. Si la ejecutaste antes, no necesitas repetirla. **No ejecutes `001_init.sql` nuevamente.**
2. **Edge Functions > api:** reemplaza `index.ts` por `supabase/functions/api/index.ts` y despliega. Conserva los Secrets actuales y `Verify JWT` desactivado, de acuerdo con la autenticación por tokens implementada.
3. **GitHub Desktop:** copia el contenido del directorio `secret-runner/` sobre tu clon local del repositorio (sin borrar `.git`), realiza un commit y pulsa `Push origin`. GitHub Actions publicará la nueva interfaz.
4. Recarga GitHub Pages. En el panel de organizador utiliza **Tu nombre visible > Guardar nombre** para cambiar el registro existente «Organizador». Cambia **¿También participas?** según corresponda.

Los participantes y deseos existentes se conservan. Los precios previos dejan de mostrarse; el campo SQL `wishes.price` permanece por compatibilidad. Los nuevos deseos se guardan sin precio.

**Importante:** el bootstrap con nombre personalizado solo aplica a bases de datos nuevas. Para tu intercambio ya creado, cambia tu nombre desde el panel, sin volver a ejecutar bootstrap. El sorteo es irreversible en el MVP.

---

# Secret Runner

Intercambio secreto para runners, en español y sin cuentas tradicionales. Frontend en **React + Vite**, alojado en **GitHub Pages**; backend privado en **Supabase Edge Functions**.

## Qué incluye esta versión

- Inscripción por enlace compartido por WhatsApp, con nombre de participante.
- Acceso persistente por token personal en el navegador (sin contraseña).
- Wishlist editable con producto, enlace, precio aproximado y notas.
- Panel del organizador: participantes, número de deseos y exclusiones bidireccionales.
- Sorteo privado, de una sola ejecución, con exclusiones y validación transaccional en PostgreSQL.
- Pantalla privada con la persona asignada y su wishlist.
- Diseño responsive en español.

**Límites deliberados del MVP:** un intercambio por proyecto Supabase; el organizador se crea como “Organizador”; WhatsApp comparte enlaces manualmente; no hay correos, recuperación de acceso automatizada, cierre manual ni controles antiabuso avanzados. No apto aún para publicarse en grupos abiertos sin protección adicional.

## Requisitos

Node.js 22, npm, cuenta GitHub y proyecto Supabase nuevo, dedicado.

## 1. Ejecutar la interfaz localmente

```sh
npm install
cp .env.example .env
# Editar .env con la URL y la clave publicable de Supabase
npm run dev
```

Si todavía no configuras Supabase, la interfaz se muestra en modo informativo y las acciones conectadas se deshabilitan.

## 2. Crear las tablas en Supabase

1. Crea un **proyecto nuevo** en Supabase.
2. Abre **SQL Editor** y ejecuta `supabase/migrations/001_init.sql`.
3. Confirma que Row Level Security está habilitado y que las tablas **no tienen políticas públicas**.
4. En **Project Settings → API**, copia la `Project URL` y la clave publicable/anon, nunca la `service_role`.

## 3. Desplegar la función segura

Instala e inicia sesión en Supabase CLI; enlaza tu proyecto:

```sh
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
```

Configura los secretos (sustituye los ejemplos; la clave de instalación debe ser larga y aleatoria):

```sh
npx supabase secrets set ADMIN_SETUP_SECRET=CLAVE_LARGA_ALEATORIA
npx supabase secrets set ALLOWED_ORIGIN=https://TU-USUARIO.github.io,http://localhost:5173
```

En `supabase/config.toml` esta función tiene `verify_jwt = false` para aceptar tokens de sesión **propios**; la función verifica todos los tokens y no expone tablas a clientes. No pongas nunca la clave `service_role` en GitHub Pages ni en el repositorio. Supabase inyecta `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` a las funciones alojadas.

```sh
npx supabase functions deploy api
```

**Nota:** `ADMIN_SETUP_SECRET` permite crear el primer intercambio y debe mantenerse en secreto. Después del alta, elimina o rota el secreto. En este MVP la interfaz de administración no permite crear otros intercambios y el servidor rechaza un segundo bootstrap.

## 4. Desplegar en GitHub Pages

1. Sube este proyecto a un repositorio llamado `secret-runner` con rama `main`.
2. En GitHub → **Settings → Secrets and variables → Actions → Variables**, agrega:
   - `VITE_SUPABASE_URL`: URL de tu proyecto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: clave publicable/anon. No es una clave secreta.
3. En **Settings → Pages**, configura **Source: GitHub Actions**.
4. Haz push a `main`: `.github/workflows/deploy.yml` construirá y desplegará la web.
5. Abre `https://TU-USUARIO.github.io/secret-runner/`.

Si renombraras el repo, el workflow calcula automáticamente la ruta `/NOMBRE-DEL-REPOSITORIO/`.

## 5. Crear y probar el intercambio

1. Abre la web y elige **Configurar intercambio**.
2. Introduce título, presupuesto, fechas y `ADMIN_SETUP_SECRET`.
3. Al crear el intercambio, guarda de inmediato el acceso del organizador en ese navegador; **no hay recuperación automática del token**.
4. Desde el panel, copia el enlace de invitación y compártelo por WhatsApp.
5. Cada participante se inscribe con su propio nombre; el navegador guarda su token individual en `localStorage`.
6. Cada persona agrega deseos. El organizador agrega exclusiones y realiza el sorteo.
7. Cada participante abre **Mi amigo secreto** para descubrir su asignación.

## Seguridad y limitaciones importantes

- El enlace grupal `#/?invite=...` **no** es una credencial privada; permite que cualquier persona que lo reciba se inscriba. No publicarlo en redes abiertas. Tras inscribirse, cada navegador recibe un token personal.
- Si alguien borra los datos del navegador o cambia de dispositivo, pierde el acceso. Añadir recuperación por correo o emisión de enlaces personales es una mejora prioritaria antes de uso amplio.
- Los tokens personales se almacenan solo como hash SHA-256 en la base de datos. La función corre del lado de Supabase con permisos `service_role`; los clientes no tienen lectura directa de las tablas.
- La URL y la clave publicable de Supabase son públicas por naturaleza; **jamás** expongas `SUPABASE_SERVICE_ROLE_KEY` ni `ADMIN_SETUP_SECRET` en archivos frontend o variables `VITE_*`.
- GitHub Pages es hosting estático. Las operaciones del sorteo se ejecutan en Supabase.
- Antes de usar con muchos participantes, considera añadir rate limiting y CAPTCHA a `join`, políticas de revocación de sesiones, recuperación segura y un flujo para invitados duplicados. La validación de origen CORS no sustituye estas medidas.
- No se incluye una interfaz para eliminar participantes ni para rectificar sorteos ya publicados.

## Desarrollo

```sh
npm run build
npm run preview
```

## Archivos clave

- `src/App.jsx`: frontend.
- `src/api.js`: cliente de la Edge Function.
- `src/style.css`: estilos.
- `supabase/functions/api/index.ts`: API privada y emparejamiento aleatorio.
- `supabase/migrations/001_init.sql`: esquema y función SQL de publicación atómica.
- `.github/workflows/deploy.yml`: despliegue automático.


## Organizer participation (migration 002)
For an existing database, run `supabase/migrations/002_organizer_participation.sql` once in Supabase SQL Editor. Then redeploy `supabase/functions/api/index.ts` in Edge Functions and push updated frontend to GitHub Pages. The organizer can toggle **Sí, participo / Solo organizo** from their dashboard before the draw. Nonparticipating organizers remain administrators but are excluded from the draw and participant count.
