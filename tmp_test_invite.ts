
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './api/.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInvite() {
    const tenant_id = '4e085b3c-f98d-4986-8860-99eadce403b5'; // Bandeira advogados
    const email = 'teste_antigravity@example.com';
    
    console.log('Tentando inserir convite...');
    const { data, error } = await supabase
        .from('workspace_invites')
        .insert({
            email,
            tenant_id,
            role: 'lawyer'
        })
        .select();

    if (error) {
        console.error('Erro:', error);
    } else {
        console.log('Sucesso:', data);
    }
}

testInvite();
