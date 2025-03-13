const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers,
      body: 'Method Not Allowed'
    };
  }

  let event_data;
  try {
    // Get the signature from the headers
    const signature = event.headers['stripe-signature'];
    
    // Verify webhook signature
    event_data = stripe.webhooks.constructEvent(
      event.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: `Webhook Error: ${err.message}`
    };
  }

  try {
    const { type, data: { object } } = event_data;

    switch (type) {
      case 'checkout.session.completed': {
        const session = object;
        
        // Get customer details
        const customer = await stripe.customers.retrieve(session.customer);
        if (!customer) throw new Error('No customer found');

        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        if (!subscription) throw new Error('No subscription found');

        const userId = session.metadata.user_id || customer.metadata.user_id;
        if (!userId) throw new Error('No user_id found in metadata');

        // Update user's subscription status in Supabase
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            subscription_tier: 'SUPPORTER',
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
          })
          .eq('id', userId);

        if (updateError) throw updateError;
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = object;
        let userId = subscription.metadata.user_id;
        
        if (!userId) {
          // Try to get user_id from customer metadata
          const customer = await stripe.customers.retrieve(subscription.customer);
          if (!customer?.metadata?.user_id) {
            throw new Error('No user_id found in metadata');
          }
          userId = customer.metadata.user_id;
        }

        // Handle subscription cancellation at period end
        const willCancelAtPeriodEnd = subscription.cancel_at_period_end;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
        const now = new Date();

        // Update subscription status based on the event
        const updates = {
          subscription_tier: subscription.status === 'active' && !willCancelAtPeriodEnd ? 'SUPPORTER' : 'FREE',
          subscription_expires_at: currentPeriodEnd > now ? currentPeriodEnd.toISOString() : null
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (updateError) throw updateError;

        // Update stripe_customers table
        const { error: customerUpdateError } = await supabase
          .from('stripe_customers')
          .update({
            subscription_status: subscription.status,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (customerUpdateError) throw customerUpdateError;
        break;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };
  } catch (err) {
    console.error('Error processing webhook:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};