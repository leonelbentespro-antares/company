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
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('User not found');

    const { planId } = await req.json();
    if (!planId) throw new Error('Plan ID (price ID) is required');

    // Mapeamento dos Preços da Stripe para URL de Sucesso/Cancelamento
    // OBSERVAÇÃO: em produção o SUCCESS_URL e CANCEL_URL vêm do .env ou frontend
    const reqUrl = new URL(req.url);
    const origin = req.headers.get('origin') || reqUrl.origin;
    
    // Obter ou criar customer no Stripe
    let customerId;
    // Opcionalmente, armazenar o stripe_customer_id no perfil para não criar duplicado.
    const { data: tenantUser } = await supabaseClient
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();
      
    const { data: tenant } = await supabaseClient
      .from('tenants')
      .select('*')
      .eq('id', tenantUser?.tenant_id)
      .single();

    if (tenant?.stripe_customer_id) {
        customerId = tenant.stripe_customer_id;
    } else {
        const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
                tenant_id: tenant?.id || '',
                user_id: user.id
            }
        });
        customerId = customer.id;
        
        // Salvar customer ID no banco (Requer chave de SERVIÇO caso o RLS impeça)
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        if (tenant?.id) {
            await supabaseAdmin.from('tenants').update({
                stripe_customer_id: customerId
            }).eq('id', tenant.id);
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
        tenant_id: tenant?.id || '',
        user_id: user.id
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
