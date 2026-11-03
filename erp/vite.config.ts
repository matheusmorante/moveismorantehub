import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import legacy from '@vitejs/plugin-legacy';
import path from 'path';

const rewriteMobileLabelsEntry = (url?: string) => {
  if (!url) return url;
  const queryIndex = url.indexOf('?');
  const pathname = queryIndex < 0 ? url : url.slice(0, queryIndex);
  return pathname === '/mobile/etiquetas'
    ? `/mobile-labels.html${queryIndex < 0 ? '' : url.slice(queryIndex)}`
    : url;
};

const mobileLabelsEntryPlugin: Plugin = {
  name: 'mobile-labels-entry',
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      request.url = rewriteMobileLabelsEntry(request.url);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, _response, next) => {
      request.url = rewriteMobileLabelsEntry(request.url);
      next();
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  // The official dev launcher injects Vercel Development. Do not fill missing
  // remote values from stale ERP .env files; build/test keep their normal envDir.
  envDir: process.env.MORANTE_ENV_SOURCE === 'vercel-development'
    ? path.resolve(__dirname, '../.vercel')
    : undefined,
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
    mobileLabelsEntryPlugin,
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
    strictPort: true,
    host: true, // Permite acesso via rede local (mobile)
    proxy: {
      // O backend local da Vercel mantém GEMINI_API_KEY fora do navegador.
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      '/r2-proxy': {
        target: 'https://pub-389127027ea5421fa2feff7d0840b3b4.r2.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/r2-proxy/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'index.html'),
        mobileLabels: path.resolve(__dirname, 'mobile-labels.html'),
      },
    },
  },
});
