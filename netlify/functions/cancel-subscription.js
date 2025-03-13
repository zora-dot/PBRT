const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Get auth token from headers
    const auth = event.headers.authorization;
    if (!auth) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      auth.replace('Bearer ', '')
    );

    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authentication' })
      };
    }

    // Get the user's active subscription from Stripe
    const { data: customers } = await stripe.customers.search({
      query: `metadata['user_id']:'${user.id}'`,
    });

    if (!customers || customers.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No active subscription found' })
      };
    }

    // Get all active subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customers[0].id,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No active subscription found' })
      };
    }

    // Cancel the subscription at period end
    const subscription = await stripe.subscriptions.update(
      subscriptions.data[0].id,
      { cancel_at_period_end: true }
    );

    // Update the user's profile in Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'FREE',
        subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to update user profile' })
      };
    }

    // Return success response with expiration date
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Your subscription has been cancelled and will end at the end of the current billing period',
        expiresAt: new Date(subscription.current_period_end * 1000).toISOString()
      })
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      statusCode: error.statusCode || 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Failed to cancel subscription'
      })
    };
  }
};