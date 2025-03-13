const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
      body: 'Method Not Allowed'
    };
  }

  try {
    const { plan, interval } = JSON.parse(event.body || "{}");
    const auth = event.headers.authorization;
    
    if (!auth) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
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
        body: JSON.stringify({ error: "Invalid authentication" })
      };
    }

    if (!plan || !interval) {
      return { 
        statusCode: 400, 
        headers,
        body: JSON.stringify({ error: "Missing plan or interval" })
      };
    }

    // Get the correct price ID based on the interval
    const priceId = interval === "monthly"
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_YEARLY_PRICE_ID;

    if (!priceId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Invalid price configuration" })
      };
    }

    // Create or get customer
    let customer;
    const { data: existingCustomers } = await stripe.customers.search({
      query: `metadata['user_id']:'${user.id}'`,
    });

    if (existingCustomers && existingCustomers.length > 0) {
      customer = existingCustomers[0];
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id
        }
      });

      // Save customer in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: customer.id,
          email: user.email
        });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_CLIENT_URL_MAIN}/success`,
      cancel_url: `${process.env.VITE_CLIENT_URL_MAIN}/pricing`,
      client_reference_id: user.id,
      subscription_data: {
        metadata: {
          user_id: user.id
        }
      },
      metadata: {
        user_id: user.id
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        url: session.url,
        sessionId: session.id
      })
    };
  } catch (error) {
    console.error("Stripe Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || "Failed to create checkout session" 
      })
    };
  }
};