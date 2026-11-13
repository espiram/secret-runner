# A Mí Me Tocó... — v0.5

**Tú pon los regalos, nosotros el secreto.**

Plataforma de intercambios de regalos para grupos de amigos, familia y compañeros. Mantiene GitHub Pages, Supabase y el código del sorteo de la v0.4.

## Instalar sobre tu repositorio existente

1. Descarga y descomprime el ZIP. Abre la carpeta `secret-runner`.
2. Copia su contenido a la raíz del repositorio local, **sin borrar `.git`**.
3. En GitHub Desktop, comprueba los cambios, haz commit con `feat: rebrand a mi me toco v0.5` y pulsa Push origin.
4. En GitHub Actions comprueba que `build` y `deploy` terminen en verde. Recarga la URL actual de GitHub Pages.

**Si ya instalaste v0.4:** no ejecutes SQL ni vuelvas a desplegar la Edge Function; solo cambia los archivos web. Las tablas y datos actuales permanecen intactos.

**Si sigues en v0.3:** ejecuta primero `supabase/migrations/003_safe_draw_testing.sql` y despliega la versión incluida de `supabase/functions/api/index.ts` para activar la simulación y limpieza segura. Conserva los secretos y `verify_jwt=false`. Después haz el commit del frontend.

**No cambies todavía** el nombre del repositorio `secret-runner`, la URL de Pages ni la clave de sesión `secret_runner_token`. Eso evita romper enlaces de invitación y sesiones de los participantes existentes. Los títulos de intercambios creados no se renombran automáticamente.

## Pruebas rápidas

1. Verifica que la portada y el título de la pestaña digan A Mí Me Tocó...
2. Confirma que el organizador puede entrar con su sesión anterior y editar su nombre.
3. Revisa el enlace de invitación, las listas de deseos y el conteo de participantes.
4. En v0.4 o superior, utiliza **Simular sorteo sin guardar**; no pulses **Realizar sorteo secreto** durante las pruebas.

## Tecnologías

React + Vite + GitHub Pages; Supabase PostgreSQL + Edge Functions. Variables de compilación: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. El secreto `ADMIN_SETUP_SECRET` permanece solo en Supabase.

## Limitaciones

La versión actual trabaja con un intercambio por proyecto Supabase. El sorteo definitivo no se puede revertir desde la interfaz; los tokens de los participantes viven en el almacenamiento local del navegador. No hay recuperación automatizada de acceso.
