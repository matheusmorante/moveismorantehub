import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import legacy from '@vitejs/plugin-legacy';
// import basicSsl from '@vitejs/plugin-basic-ssl'; // Removido para usar HTTP no desenvolvimento

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
    /*, basicSsl() */
  ],
  server: {
    port: 5173,
    host: true, // Permite acesso via rede local (mobile)
  },
  build: {
    outDir: 'dist',
  },
});
