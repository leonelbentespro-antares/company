import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// ATENÇÃO: SERVICE_ROLE_KEY ignora RLS e tem acesso total - usar apenas no Backend
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log(`[Supabase Init] URL: ${supabaseUrl ? 'OK' : 'MISSING'}, Key: ${supabaseServiceKey ? 'OK' : 'MISSING'}`);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ ERRO CRÍTICO: Credenciais do Supabase Admin ausentes!');
  process.exit(1); // Forçar crash visível se faltar config
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
