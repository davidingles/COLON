import { defineConfig } from 'vite';

// Configuración del servidor de desarrollo de Vite.
//
// El proxy redirige las peticiones a /api hacia el backend, de modo que el
// navegador siempre llama al mismo origen y no aparecen problemas de CORS.
// El puerto del backend es una suposición: todavía no existe backend en el
// proyecto, así que habrá que ajustar PUERTO_BACKEND cuando se implemente.
const PUERTO_DESARROLLO = 5173;
const PUERTO_BACKEND = 3000;

export default defineConfig({
  server: {
    port: PUERTO_DESARROLLO,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${PUERTO_BACKEND}`,
        changeOrigin: true
      }
    }
  }
});
