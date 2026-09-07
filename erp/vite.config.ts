import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  // O ERP reutiliza validadores financeiros determinísticos do workspace mobile.
  // No build serverless apenas as dependências do ERP são instaladas; portanto,
  // arquivos importados de `mobile/` também precisam ser transformados com as
  // opções TypeScript do ERP, sem tentar resolver `expo/tsconfig.base`.
  esbuild: {
    // Nesta versão do Vite, somente a forma serializada evita que o transformador
    // procure o tsconfig mais próximo de cada arquivo importado.
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        useDefineForClassFields: true,
      },
    }),
  },
  plugins: [
    react(), 
    tsconfigPaths(),
    legacy({
      targets: ['defaults', 'not IE 11']
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Permite acesso via rede local (mobile)
    proxy: {
      '/r2-proxy': {
        target: 'https://pub-389127027ea5421fa2feff7d0840b3b4.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/r2-proxy/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
