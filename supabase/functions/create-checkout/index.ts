import Stripe from 'npm:stripe@^14.14.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.39.3';

// Inicialização externa para reutilização em "warm starts"
const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const stripe = new Stripe(STRIPE_KEY, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    // Inicialização rápida do cliente
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON, {
      global: { headers: { Authorization: authHeader } }
    });

    // Início paralelo: Pegar dados do body e do usuário simultaneamente
    const [body, authRes] = await Promise.all([
      req.json(),
      supabaseClient.auth.getUser()
    ]);

    const { planId, rootEmail, rootUserId } = body;
    if (!planId) throw new Error('Plan ID (price ID) is required');

    const user = authRes.data?.user;
    const customerEmail = user?.email || rootEmail || 'cliente.teste@lexhub.com.br';
    const customerUserId = user?.id || rootUserId || 'mock-user-123';

    const reqUrl = new URL(req.url);
    const origin = req.headers.get('origin') || reqUrl.origin;
    
    let customerId = null;
    let tenantId = '';

    // Busca simplificada em query única (Join)
    if (user) {
      const { data: userData } = await supabaseClient
        .from('tenant_users')
        .select('tenant_id, tenants(stripe_customer_id)')
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (userData) {
          tenantId = userData.tenant_id;
          customerId = (userData.tenants as any)?.stripe_customer_id;
      }
    }

    // Função interna para criar sessão (usada para retry se o customerId for inválido/antigo)
    const createSession = async (cid: string | null) => {
      return await stripe.checkout.sessions.create({
        customer: cid || undefined,
        customer_email: cid ? undefined : customerEmail, // Só passa email se não tiver CID
        payment_method_types: ['card'],
        line_items: [{ price: planId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${origin}/dashboard/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/plans?canceled=true`,
        metadata: { tenant_id: tenantId, user_id: customerUserId }
      });
    };

    let session;
    try {
      // Tentativa otimista: usa o customerId que temos
      session = await createSession(customerId);
    } catch (err: any) {
      // Se o erro for "cliente não encontrado" (ex: mudou de Teste p/ Produção), limpamos e tentamos de novo
      if (err.message?.includes('No such customer')) {
        console.log('Customer not found, creating a new one...');
        
        const customer = await stripe.customers.create({
          email: customerEmail,
          metadata: { tenant_id: tenantId, user_id: customerUserId }
        });
        customerId = customer.id;
        
        // Atualização em background (não bloqueia o redirecionamento)
        if (tenantId) {
          const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
          supabaseAdmin.from('tenants').update({ stripe_customer_id: customerId }).eq('id', tenantId)
            .then(({ error }) => error && console.error('Error updating tenant customer:', error));
        }
        
        // Segunda tentativa com o novo customerId
        session = await createSession(customerId);
      } else {
        throw err;
      }
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error('Checkout Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
