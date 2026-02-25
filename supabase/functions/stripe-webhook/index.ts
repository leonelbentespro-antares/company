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
        
        // Mapeamento Price ID → Nome do Plano (sincronizado com constants.ts)
        const PRICE_TO_PLAN: Record<string, string> = {
          'price_1T3jHtJ9ZEZzMZTmJ5KkKRJ0': 'Starter',
          'price_1T3jHvJ9ZEZzMZTmLmeSeRpP': 'Professional',
          'price_1T3jHwJ9ZEZzMZTmoobBAcbc': 'Enterprise',
        };
        const priceId = subscription.items.data[0]?.price.id ?? '';
        const planName = PRICE_TO_PLAN[priceId] ?? 'Starter';

        await supabaseAdmin.from('tenant_subscriptions').upsert({
          tenant_id: tenantId,
          plan: planName,
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

      // Mapeamento Price ID → Nome do Plano
      const PRICE_TO_PLAN: Record<string, string> = {
        'price_1T3jHtJ9ZEZzMZTmJ5KkKRJ0': 'Starter',
        'price_1T3jHvJ9ZEZzMZTmLmeSeRpP': 'Professional',
        'price_1T3jHwJ9ZEZzMZTmoobBAcbc': 'Enterprise',
      };
      const priceId = subscription.items.data[0]?.price.id ?? '';
      const planName = PRICE_TO_PLAN[priceId] ?? 'Starter';
      
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();
        
      if (tenant) {
          await supabaseAdmin.from('tenant_subscriptions').update({
              plan: planName,
              status: subscription.status,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
          }).eq('tenant_id', tenant.id);
      }
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
