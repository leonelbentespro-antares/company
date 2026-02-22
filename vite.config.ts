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

  // Content Security Policy - restringe origens de conteúdo
  const cspDirectives = [
    `default-src 'self'`,
    // Vite/React + Tailwind CDN + esm.sh (importmap nativo do projeto)
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://esm.sh`,
    // Estilos do Tailwind, Google Fonts, esm.sh
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.tailwindcss.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' data: blob: https:`,
    // Supabase, esm.sh (dependências via importmap), APIs de IA
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost} https://esm.sh https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.x.ai`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ].join('; ');

  const securityHeaders = {
    'Content-Security-Policy': cspDirectives,
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()',
    'X-XSS-Protection': '1; mode=block',
    ...(isProd ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    } : {}),
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
