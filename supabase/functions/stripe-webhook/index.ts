import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-02-08",
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const { priceId, user_id, email } = await req.json();

    if (!priceId || !user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }), 
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user_id)
      .single();

    let customerId;

    if (existingCustomer) {
      customerId = existingCustomer.customer_id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email,
        metadata: {
          user_id
        }
      });

      // Save customer in database
      await supabase
        .from('stripe_customers')
        .insert({
          user_id,
          customer_id: customer.id,
          email
        });

      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${Deno.env.get("CLIENT_URL")}/settings#subscription`,
      cancel_url: `${Deno.env.get("CLIENT_URL")}/pricing`,
      client_reference_id: user_id,
      metadata: {
        user_id
      }
    });

    return new Response(
      JSON.stringify({ url: session.url }), 
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stripe error:", error);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});