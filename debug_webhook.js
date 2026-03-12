
const fetch = require('node-fetch');

async function testWebhook() {
    const payload = {
        type: 'INSERT',
        record: {
            email: 'leonelbentespro@gmail.com',
            tenant_id: '53a05573-5af8-444f-b684-f7ed6a3cb9bc',
            role: 'admin'
        }
    };

    try {
        console.log('Enviando requisição para o webhook...');
        const response = await fetch('http://localhost:3005/api/webhooks/supabase/invites', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const text = await response.text();
        console.log('Status:', response.status);
        console.log('Resposta:', text);
    } catch (err) {
        console.error('Erro ao conectar com a API:', err.message);
    }
}

testWebhook();
