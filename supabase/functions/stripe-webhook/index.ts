import Stripe from 'npm:stripe@^14.14.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.39.3';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  
  // This is your Stripe CLI webhook secret for testing your endpoint locally.
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  const body = await req.text();

  try {
    if (!signature || !webhookSecret) return new Response('Webhook secret not found.', { status: 400 });
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err: any) {
    console.log(`⚠️  Webhook signature verification failed.`, err.message);
    return new Response(err.message, { status: 400 });
  }

  // Handle the event
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.metadata?.tenant_id;
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      if (tenantId) {
        // Obter os detalhes da Subscription para atualizar a data de Trial/Pagamento
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Mapeia o preço do Stripe (plan ID) para o seu nome de plano no sistema local
        // Isso precisará ser sincronizado com os Product IDs que serão criados no Stripe
        let planName = 'Starter';
        // Aqui mapeia-se: subscription.items.data[0].price.id === 'price_1xyz' -> 'Professional'

        await supabaseAdmin.from('tenant_subscriptions').upsert({
          tenant_id: tenantId,
          plan: planName, // Atualizar de acordo com prod_id ou metadata do prod
          status: subscription.status,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId
        });
        
        await supabaseAdmin.from('tenants').update({
           stripe_customer_id: customerId
        }).eq('id', tenantId);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
        
      if (tenant) {
          await supabaseAdmin.from('tenant_subscriptions').update({
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          }).eq('tenant_id', tenant.id);
      }
      // Then define and call a function to handle the event customer.subscription.updated
      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
});
