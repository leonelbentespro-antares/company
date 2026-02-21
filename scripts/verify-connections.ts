
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente manualmente
const envPath = path.resolve(__dirname, '../.env.local');
let env: Record<string, string> = {};

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
            let value = match[2].trim();
            // Remover aspas simples ou duplas se existirem
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            env[match[1].trim()] = value;
        }
    });
} catch (e) {
    console.error('Erro ao ler .env.local:', e);
    process.exit(1);
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const GEMINI_KEY = env.GEMINI_API_KEY;

console.log('--- Iniciando Teste de Conexões ---\n');

async function testSupabase() {
    console.log('🔄 Testando conexão com Supabase...');
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Configuração do Supabase ausente.');
        return;
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        // Tenta pegar a sessão ou uma tabela pública.
        // A tabela 'profiles' provavelmente requer autenticação, então o erro "PGRST116" ou "Auth" é esperado se não logado.
        // Mas se der erro de conexão (ENOTFOUND), aí falhou.

        const { count, error } = await supabase.from('tenants').select('*', { count: 'exact', head: true });

        if (error) {
            console.log(`⚠️ Supabase respondeu (Conexão OK), mas houve erro na query: ${error.message} (Código: ${error.code})`);
            console.log('   Isso geralmente significa que a conexão funciona, mas faltam permissões (RLS) para o cliente anônimo.');
        } else {
            console.log(`✅ Conexão com Supabase estabelecida! (Encontrados ${count} registros acessíveis em 'tenants')`);
        }
    } catch (err: any) {
        console.error(`❌ Falha CRÍTICA na conexão com Supabase: ${err.message}`);
    }
}

async function testGemini() {
    console.log('\n🔄 Testando conexão com Google Gemini...');
    if (!GEMINI_KEY) {
        console.error('❌ Chave do Gemini ausente.');
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });
        // Tenta usar um modelo genérico primeiro
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-1.5-flash',
                contents: 'Responda apenas "OK".',
            });
            console.log('✅ Conexão com Gemini (gemini-1.5-flash) estabelecida com sucesso!');
            // console.log('Resposta:', response.response.text());
        } catch (e: any) {
            console.log(`⚠️ Falha com gemini-1.5-flash: ${e.message}. Tentando gemini-2.0-flash-exp...`);
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash-exp',
                contents: 'Responda apenas "OK".',
            });
            console.log('✅ Conexão com Gemini (gemini-2.0-flash-exp) estabelecida!');
        }

    } catch (err: any) {
        console.error(`❌ Falha na conexão com Gemini: ${err.message}`);
    }
}

async function run() {
    await testSupabase();
    await testGemini();
    console.log('\n--- Fim dos Testes ---');
}

run();
