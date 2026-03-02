
import axios from 'axios';

/**
 * Script de Verificação de API Key
 * Uso: npx ts-node scripts/test-api-token.ts [SUA_CHAVE_AQUI]
 */

const API_KEY = process.argv[2];
const API_URL = 'http://localhost:3005';

if (!API_KEY) {
    console.error('ERRO: Você deve fornecer a API Key como argumento.');
    process.exit(1);
}

async function testToken() {
    console.log(`\n🚀 Iniciando teste com a chave: ${API_KEY.substring(0, 12)}...`);
    
    try {
        const response = await axios.post(`${API_URL}/api/messages/send`, {
            to: '5511999999999',
            text: 'Teste de integração LexHub'
        }, {
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ SUCESSO! A API aceitou o token.');
        console.log('📦 Resposta:', JSON.stringify(response.data, null, 2));
    } catch (err: any) {
        if (err.response) {
            console.error('❌ FALHA: A API retornou um erro.');
            console.error(`Status: ${err.response.status}`);
            console.error('Data:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('❌ ERRO de conexão:', err.message);
        }
    }
}

testToken();
