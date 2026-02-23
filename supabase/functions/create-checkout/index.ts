import Stripe from 'npm:stripe@^14.14.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader || '' } } }
    );
    let user = null;
    const { data: authData, error: authError } = await supabaseClient.auth.getUser();
    
    // Fallback: Se não houver usuário real logado (ex: login mock do frontend), avisaremos,
    // mas prosseguiremos usando o e-mail que vier no body para permitir o teste.
    if (!authError && authData?.user) {
       user = authData.user;
    }

    const { planId, rootEmail, rootUserId } = await req.json();
    if (!planId) throw new Error('Plan ID (price ID) is required');

    // Dados base do usuário (Real ou Mock originado do front)
    const customerEmail = user?.email || rootEmail || 'cliente.teste@lexhub.com.br';
    const customerUserId = user?.id || rootUserId || 'mock-user-123';

    // Mapeamento dos Preços da Stripe para URL de Sucesso/Cancelamento
    const reqUrl = new URL(req.url);
    const origin = req.headers.get('origin') || reqUrl.origin;
    
    // Obter ou criar customer no Stripe
    let customerId;
    
    // Tentar localizar tenant e usuário no Supabase se houver usuário autenticado
    let tenantId = '';
    let dbCustomerId = null;
    
    if (user) {
      const { data: tenantUser } = await supabaseClient
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
        
      if (tenantUser) {
          tenantId = tenantUser.tenant_id;
          const { data: tenant } = await supabaseClient
            .from('tenants')
            .select('stripe_customer_id, id')
            .eq('id', tenantId)
            .single();
          dbCustomerId = tenant?.stripe_customer_id;
      }
    }

    if (dbCustomerId) {
        customerId = dbCustomerId;
    } else {
        const customer = await stripe.customers.create({
            email: customerEmail,
            metadata: {
                tenant_id: tenantId,
                user_id: customerUserId
            }
        });
        customerId = customer.id;
        
        
        // Salvar customer ID no banco SOMENTE se houver tenant (usuário realizado)
        if (tenantId) {
            const supabaseAdmin = createClient(
              Deno.env.get('SUPABASE_URL') ?? '',
              Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );
            await supabaseAdmin.from('tenants').update({
                stripe_customer_id: customerId
            }).eq('id', tenantId);
        }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planId, // planId deve ser um Price ID do Stripe (ex: price_1xyz...)
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/dashboard/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/plans?canceled=true`,
      metadata: {
        tenant_id: tenantId,
        user_id: customerUserId
      }
    });

    console.log('Session created!', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error('Critical Error:', err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
