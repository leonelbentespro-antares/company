import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// ============================================================
// LEXHUB SAAS - Vite Config com Security Headers
// ============================================================
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';

  const supabaseHost = env.VITE_SUPABASE_URL
    ? new URL(env.VITE_SUPABASE_URL).host
    : '*.supabase.co';

  const cspDirectives = [
    `default-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: data: blob:`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https: http: blob:`,
    `style-src 'self' 'unsafe-inline' https: http:`,
    `font-src 'self' data: https:`,
    `img-src 'self' data: blob: https: http:`,
    `connect-src 'self' ws: wss: https: http:`,
    `frame-src 'self' https:`,
  ].join('; ');

  const securityHeaders = {
    'Content-Security-Policy': cspDirectives,
    // Removendo restrições que podem quebrar o React na Vercel temporariamente
  };

  return {
    server: {
      port: 3000,
      host: 'localhost', // Apenas localhost em dev (era 0.0.0.0 — exposição na rede)
      headers: securityHeaders,
    },
    preview: {
      port: 4173,
      headers: securityHeaders,
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL || (isProd ? 'https://api-lexhub.onrender.com' : 'http://localhost:3001')),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      // Remover source maps em produção para não expor código-fonte
      sourcemap: !isProd,
      // Minificar em produção
      minify: isProd ? 'terser' : false,
      // Aumentar limite de aviso de chunk (projeto grande)
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // Nomes de chunk sem informação de estrutura interna
          chunkFileNames: isProd ? 'assets/[hash].js' : 'assets/[name]-[hash].js',
          entryFileNames: isProd ? 'assets/[hash].js' : 'assets/[name]-[hash].js',
          assetFileNames: isProd ? 'assets/[hash].[ext]' : 'assets/[name]-[hash].[ext]',
          // Separar dependências em chunks para melhor cache
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
              return 'vendor-charts';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/@hello-pangea') || id.includes('node_modules/@google')) {
              return 'vendor-misc';
            }
          },
        },
      },
    },
  };
});
