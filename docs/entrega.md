# Lista de pasos — Entrega V

**Hora del enunciado:** martes, 8:00 a. m. (confirmar en Classroom que corresponda a la entrega actual).

## Entrega individual

1. [x] Dibujo a mano del módulo acoplable.
2. [x] Rediseño por IA (imagen conceptual).
3. [x] Pasar a un generador imagen-a-3D como Hyper3D o Hunyuan3D. **Recortar la vista isométrica del módulo, sin títulos y sin otras vistas**, antes de subirla para evitar geometría espuria. Descargar en .glb (preferible) o .obj.
4. [ ] Comprobar el modelo en https://3dviewer.net/.
5. [x] Crear juego interactivo en https://arena.ai/ con funciones simuladas del módulo y dron portador.
6. [ ] Añadir código del juego al repo, configurar GitHub Pages y probar la URL pública. *(Código y flujo de despliegue ya integrados; falta activar Pages y pegar la URL probada.)*
7. [ ] Pegar en Classroom el link del **repositorio personal**, no únicamente el link del juego.

## Actividad grupal posterior

Diseñar una caja tipo *dummy* para representar la masa del módulo usando https://www.makercase.com/. Según la explicación oral, se realizará durante las semanas siguientes; confirmar calendario con el docente.

## Nota de despliegue

En GitHub: Settings > Pages. Para un sitio estático con `index.html` raíz, elegir Deploy from a branch / main / root. Si Arena genera una app con proceso de compilación, usar un workflow de GitHub Actions adecuado. No activar Pages todavía si no existe un sitio funcional.

**Situación actual:** el juego ya está en el repositorio con Vite + React, por lo que necesita compilación. El flujo `.github/workflows/deploy.yml` compila y publica `dist/`, así que en **Settings > Pages > Build and deployment > Source** hay que elegir **GitHub Actions** (no "Deploy from a branch"). Tras el primer despliegue, la URL pública queda como `https://davidvillarreal2901.github.io/Dise-o-Electronico/`. Instrucciones ampliadas en [simulador.md](simulador.md).
