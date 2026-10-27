import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el sitio funciona tanto en la raíz del dominio como en
  // https://usuario.github.io/nombre-del-repositorio/ (GitHub Pages).
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    // Permite abrir el simulador desde el host de previsualización del sandbox
    // y desde túneles locales. No afecta a la compilación de producción.
    allowedHosts: true,
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
});
