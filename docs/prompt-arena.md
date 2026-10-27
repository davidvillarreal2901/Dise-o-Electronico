# Prompt propuesto para Arena AI (fase siguiente)

Crea una aplicación web interactiva titulada **INSPECT: Misión Post-Sismo** que represente un dron comercial equipado con un **módulo acoplable de inspección estructural**. El dispositivo no controla el dron; es una carga útil para capturar y analizar imágenes.

Usa los archivos de `assets/referencias/` como referencia del aspecto de la carga útil. Si hay un `assets/modelos-3d/modulo.glb`, úsalo como modelo del módulo; si no existe, usa geometría 3D simple. Construye un juego breve en 3D con edificios dañados, tres puntos de inspección, conducción del dron con WASD/flechas y controles de altura, detección de obstáculos y regreso a base. Al acercarse a un punto, pulsar E para simular la captura de una imagen del módulo y mostrar el contorno de una grieta, una distancia **simulada** y un reporte de inspección. Todos los datos y alertas deben estar marcados como simulados y no como un diagnóstico estructural. No incluir detección de gases.

Entrega un MVP funcional en navegador de escritorio, con interfaz en español, botón de inicio/reinicio e instrucciones de control. Añade VR con WebXR como mejora progresiva cuando sea viable; no sacrifiques la funcionalidad de escritorio. Organiza el proyecto para GitHub Pages, sin rutas absolutas rotas, sin backend ni claves privadas. Incluye instrucciones de despliegue y prueba.
