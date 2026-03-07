# Segurança e Funcionamento do WhatsApp (LexHub)

Este guia documenta o comportamento da conexão UAZAPI V2 / NotificaMe Hub e as blindagens criadas pelos desenvolvedores Sênior para o LexHub.

## 1. Tratamento do QR Code (Loop Infinito)
No desenvolvimento da UAZAPI V2, ocorria um "loop infinito" no frontend ao tentar visualizar o QR code de conexão. Os fatores que causam isso incluem:
1. **Obrigação do AdminToken:** A UAZAPI não aceita o `token` de instância para os endpoints vitais (como `/instance/connect`), requerendo OBRIGATORIAMENTE o `AdminToken` nos headers da requisição POST.
2. **Webhook "disconnected" fantasma:** A API da UAZAPI dispara um webhook com status de `disconnected` simultaneamente na tentativa de gerar o QR.
   - *Solução aplicada no motor:* A função `handleConnectionEvent()` do LexHub ignora propositalmente eventos de `disconnected` caso o Socket.IO registre que o processo se encontra no status `QR_READY` ou `Connecting`.

## 2. Roteamento de Mídias
- Arquivos de mídia (documentos, áudios) trocados no chat não ficam salvos no Supabase. O backend utiliza URLs autogeradas que apontam direto (ou farão buffer) em Object Storages (R2).

## 3. Gestão e Rate Limits do Gemini (AI_Crash Guard)
A API do LexHub recebe e responde imediatamente qualquer payload da Meta ou UAZAPI via Webhooks.
O servidor processa a mensagem. Caso seja recebida por cliente, ela dispara a função do **Gemini AI SDK** de forma assíncrona.
- *Blindagem:* Se a API da Google estourar os limites gratuitos de tokens (Erro 429 - RESOURCE_EXHAUSTED), ocorriam falhas de tipo *Unhandled Promise Rejection*, o que crachava a porta 3005 e derrubava os WebSockets de todo o SaaS.
- *Solução:* Foi adicionado um bloco `try / catch` robusto retornando uma constatação estática (IA Indisponível) sempre que as métricas stoorarem (em vez de quebrar a API Principal).

## 4. JWT e Proteção de Salas Socket
Tokens assinados (HS256) com segredos Supabase devem ser enviados unicamente nos headers `Authorization` das requisições REST, e decodificados com fallback ou validando via tabela `tenant_users`. Os sockets não assinam payload individual, mas escutam unicamente em sua hash-sala, sendo impossível a interferência ou roubo de conversa cruzada.
