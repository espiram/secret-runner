# A Mí Me Tocó... v1.0 — Acceso personal en varios dispositivos

## Instalación
1. Sustituye los archivos del repositorio con este paquete sin borrar `.git`.
2. Haz commit (`feat: personal access links v1.0`) y Push origin.
3. Verifica GitHub Actions (build/deploy en verde).
4. No requiere migraciones SQL ni despliegue de Edge Function: usa `dashboard` y el token de sesión ya existentes en v0.9.

## Pruebas de aceptación
1. En el dispositivo A, entra con un participante ficticio. Copia **Mi acceso personal**.
2. Abre el enlace personal en una ventana de incógnito o dispositivo B. Debe abrir el **mismo participante** con su lista, sin crear un registro nuevo.
3. Comprueba que el token desaparece de la barra de direcciones tras cargar.
4. Repite para un organizador (solo con tus datos de prueba); deben conservarse sus permisos.
5. Usa un enlace truncado o inválido: debe mostrar error y no borrar una sesión válida que hubiera en B.
6. Revisa que la invitación general siga permitiendo registrar participantes nuevos y **no** contenga el token de alguien.
7. Comprueba que el enlace personal no aparece en El Muro, listados o mensajes públicos.

## Seguridad
- El enlace privado es una **credencial de acceso**; quien lo tenga actúa como ese participante. No lo compartas en grupos, capturas o servicios públicos.
- El token se coloca en el fragmento `#` (no viaja en la petición inicial) y se elimina de la URL con `history.replaceState` al cargarse. Aun así puede quedar en el historial del chat donde se compartió.
- Los tokens permanecen en `localStorage` del navegador; no hay verificación por correo ni revocación de accesos individuales.
- Evita el uso con datos o direcciones reales hasta validar el flujo de recuperación y la seguridad de la plataforma.
