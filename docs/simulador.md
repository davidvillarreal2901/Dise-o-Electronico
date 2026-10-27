# Misión Post-Sismo

Simulador educativo 3D de inspección estructural en una zona urbana afectada por un sismo. El proyecto representa un **módulo electrónico acoplable a un dron comercial genérico**: no propone fabricar el dron. La plataforma prevista para el módulo es **Sipeed LicheeRV Nano W con cámara GC4653**.

> **Todo es simulado.** La imagen es ilustrativa y se reutiliza entre inspecciones; el resaltado de grietas, las distancias, la batería, las alertas y la clasificación de daños no provienen de sensores ni de detección real. No son mediciones ni diagnósticos y no sustituyen una evaluación profesional.

## Requisitos e inicio local

- Node.js 20.19 o posterior (o 22.12 o posterior).
- Un navegador moderno con WebGL habilitado.

```bash
npm ci
npm run dev
```

Abre la dirección indicada por Vite. No se necesitan servidor de aplicación, servicios externos ni claves API.

## Cómo jugar

1. Pulsa **Iniciar misión**.
2. Vuela hasta los tres marcadores de inspección. La distancia indicada es simulada y se calcula hasta el marcador, no hasta la fachada.
3. Al estar dentro del radio de un punto pendiente, pulsa **E** o el botón **Iniciar escaneo**. Mantén la posición durante el escaneo.
4. Revisa el análisis ilustrativo y continúa hasta completar los tres puntos. Los registros terminados se pueden volver a abrir desde el panel lateral.
5. Regresa a la plataforma **H** de la base y desciende por debajo de 5,8 m para completar la misión.

| Control | Acción |
| --- | --- |
| W / A / S / D o flechas | Mover horizontalmente |
| R / F | Ascender / descender |
| E | Escanear un punto cercano |
| C | Cambiar entre vista exterior y cámara de inspección |
| Escape | Cerrar el análisis de inspección |

Los botones **Pausar misión**, **Reanudar misión** y **Reiniciar** controlan el estado. El botón de mando debajo de la vista abre controles en pantalla; en dispositivos estrechos aparecen inicialmente abiertos. Hay colisiones simplificadas con los tres edificios y límites del escenario. La proximidad es una estimación del simulador, no una función de seguridad real.

## Modelo del módulo

La aplicación toma el modelo de `assets/modelos-3d/modulo-inspeccion.glb` durante la compilación y lo monta visualmente bajo el cuadricóptero. Es el archivo del repositorio, por lo que no hay que añadir nada: basta con ejecutar `npm run dev` o compilar. Si el archivo no está disponible, no se puede cargar o está vacío, se muestra una geometría provisional y una advertencia no bloqueante; la misión sigue funcionando.

El GLB debe contener sus recursos embebidos para que sea autónomo. Se centra y escala automáticamente hasta ocupar 1,25 m en su lado mayor, se gira para que la ventana óptica mire hacia el frente del dron y se aloja bajo el fuselaje, entre los patines. El modelo conceptual no incluye texturas, así que el simulador le aplica el acabado oscuro del render; si en el futuro el GLB trae texturas, se respetan.

## Realidad virtual opcional

En un contexto seguro (HTTPS o localhost), si el navegador y el dispositivo admiten `immersive-vr`, se habilita **Entrar en VR**. Three.js utiliza WebXR y `setAnimationLoop`; el modo de escritorio sigue disponible sin soporte VR. En VR, el joystick mueve el dron, los botones A/B controlan la altura y el gatillo inicia o reanuda la misión y escanea un punto cercano. La asignación puede variar según el mando; el teclado también sigue disponible. Un panel dentro de la escena muestra el estado y el resultado simulado.

AR no es necesario para jugar y no se solicita ningún permiso de cámara real.

## GitHub Pages

El flujo `.github/workflows/deploy.yml` compila y despliega automáticamente al publicar cambios en `main`. En el repositorio, activa **Settings > Pages > Build and deployment > Source: GitHub Actions**. El flujo utiliza una base relativa para funcionar bajo `https://usuario.github.io/nombre-del-repositorio/`.

Para preparar el mismo despliegue manualmente:

```bash
npm ci
npm run build -- --base=./
```

Publica el contenido completo de `dist/`, incluida la carpeta `images/` y cualquier recurso generado. El modelo del módulo ya está versionado en `assets/modelos-3d/` y se incrusta en la compilación. La aplicación no utiliza rutas del servidor ni backend.

## Organización

- `src/App.tsx`: interfaz, controles y resultados de inspección.
- `src/simulator/Simulation.ts`: vuelo, colisiones, misión, carga GLB y WebXR.
- `src/simulator/world.ts`: escenario, edificios, marcadores y dron genérico.
- `src/index.css`: estilos y adaptación a distintos tamaños.
- `public/images/inspeccion-grietas.jpg`: imagen ilustrativa de inspección.