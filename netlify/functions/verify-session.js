const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { sessionId } = JSON.parse(event.body);

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      throw new Error('Invalid session');
    }

    // Update user's subscription status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'SUPPORTER',
        subscription_expires_at: new Date(
          Date.now() + (session.subscription?.trial_end || 30 * 24 * 60 * 60 * 1000)
        ).toISOString()
      })
      .eq('id', session.client_reference_id);

    if (updateError) throw updateError;

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  } catch (error) {
    console.error('Error verifying session:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};