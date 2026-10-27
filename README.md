# Módulo de inspección estructural post-sismo

**Proyecto individual de Diseño Electrónico — entrega de diseño CAD + juego AR/VR.**

Propuesta conceptual de un **módulo electrónico acoplable a un dron comercial existente** para apoyar la inspección visual de estructuras después de un sismo. **Este proyecto no consiste en diseñar ni fabricar el dron**: el dron es la plataforma portadora.

## Evidencias de diseño

| Boceto original | Rediseño conceptual |
|:---:|:---:|
| ![Boceto original](assets/referencias/01-boceto-original.png) | ![Render profesional](assets/referencias/02-render-profesional.png) |

## Funciones propuestas

- Captura de imágenes de elementos estructurales mediante la cámara **GC4653**.
- Análisis visual exploratorio de posibles grietas, sujeto a desarrollo y validación.
- Estimación de distancia/dimensiones **solo si se añade y calibra un método de medición adecuado**.
- Registro o transmisión de evidencias para revisión por el operador.

Las alertas de riesgo que eventualmente muestre la simulación son **datos demostrativos, no diagnósticos estructurales**. No se incluye sensor de gases.

## Plataforma propuesta

- Procesamiento: **Sipeed LicheeRV Nano W** (kit adquirido).
- Cámara: **Sipeed GC4653** (kit adquirido).
- Carcasa desmontable con ventana óptica, ventilación y sistema de acople al dron.
- LiDAR/ToF y elementos de sujeción dibujados: **propuestas conceptuales pendientes de selección y validación**.
- Dimensiones de carcasa en el render: **orientativas; no son medidas fabricables ni definitivas**.

## Simulador interactivo — Misión Post-Sismo

La aplicación web del proyecto vive en la **raíz del repositorio** (`index.html` + `src/`) y se despliega con GitHub Pages. Es un juego 3D de escritorio en el que se pilota un dron comercial genérico con el módulo acoplado, se inspeccionan tres edificios dañados y se regresa a la base.

- **Modelo real del módulo:** el simulador monta `assets/modelos-3d/modulo-inspeccion.glb` bajo el dron, centrado y escalado automáticamente. Si el archivo no se puede cargar, aparece una geometría provisional y un aviso no bloqueante.
- **Todo es simulado:** la imagen de inspección es ilustrativa, el resaltado de fisuras, las distancias, la batería y la clasificación de daños no provienen de sensores ni de detección real. No sustituyen una evaluación profesional.
- **Controles:** `W A S D` o flechas para desplazarse, `R`/`F` para altura, `E` para escanear un punto cercano y `C` para alternar entre vista exterior y cámara de inspección.
- **Realidad virtual opcional:** WebXR como mejora progresiva; el modo de escritorio funciona sin visor. No se solicita permiso de cámara real.

### Ejecutar en local

Requiere Node.js 20.19 o posterior (o 22.12 o posterior) y un navegador con WebGL.

```bash
npm ci
npm run dev
```

Vite mostrará la dirección local. También se puede generar la versión estática con `npm run build`; el resultado queda en `dist/` (un único `index.html` con los recursos incrustados más la carpeta `images/`).

Instrucciones completas de juego, VR y despliegue: [docs/simulador.md](docs/simulador.md).

## Organización

```text
assets/
  referencias/
    01-boceto-original.png
    02-render-profesional.png
  modelos-3d/
    modulo-inspeccion.glb
docs/
  alcance.md
  entrega.md
  prompt-arena.md
  simulador.md
public/
  images/
    inspeccion-grietas.jpg
src/
  App.tsx                 interfaz, controles y resultados de inspección
  index.css               estilos y adaptación a distintos tamaños
  main.tsx                punto de entrada de React
  cn.ts                   utilidad de clases CSS
  simulator/
    Simulation.ts         vuelo, colisiones, misión, carga del GLB y WebXR
    world.ts              escenario, edificios, marcadores y dron genérico
index.html
vite.config.ts
tsconfig.json
package.json
.github/workflows/deploy.yml
README.md
.gitignore
```

La aplicación interactiva está en la **raíz del repositorio** (`index.html` + proyecto Vite), lo que permite desplegarla con GitHub Pages usando el flujo incluido en `.github/workflows/deploy.yml`.

## Estado actual

- [x] Boceto original.
- [x] Rediseño conceptual asistido por IA.
- [x] Modelo 3D generado (.glb / .obj).
- [ ] Modelo verificado en 3D Viewer.
- [x] Juego web interactivo de inspección post-sismo.
- [ ] Despliegue público y prueba en GitHub Pages.

Consulta [docs/entrega.md](docs/entrega.md) para completar y entregar el trabajo.
