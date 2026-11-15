# A Mí Me Tocó... v1.2.1 — Mi acceso personal

## Cambios
- Se corrige el botón «Compartir», que aparecía como un rectángulo vacío por heredar texto blanco y margen del estilo global `.outline`.
- Dos botones claramente visibles, alineados y con etiquetas «Copiar enlace» y «Compartir».
- Después de copiar, el botón cambia a «¡Copiado!» y se muestra una confirmación.
- «Compartir» utiliza el diálogo nativo del dispositivo; si no está disponible, copia el enlace.
- Si el navegador no permite acceso al portapapeles, muestra el enlace en un diálogo de copia iniciado expresamente por el usuario.
- No muestra el token privado en la página ni lo envía a terceros.

## Instalación desde v1.2
Actualizar exclusivamente estos dos archivos:
- `src/App.jsx`
- `src/style.css`

Subir a GitHub con commit y push; verificar el build de GitHub Actions. No requiere SQL ni actualizar la Edge Function.

## Pruebas
1. Verificar que aparezcan ambos botones con texto en celular y escritorio.
2. «Copiar enlace» copia el enlace completo, indica «¡Copiado!» y permite abrir la misma cuenta en incógnito.
3. «Compartir» abre menú nativo en un navegador compatible, o copia el enlace en uno sin `navigator.share`.
4. Verificar que no aparece una caja vacía ni se ve el token en la pantalla.
5. Confirmar que El Muro, wishlist y Mis tareas siguen funcionando.
