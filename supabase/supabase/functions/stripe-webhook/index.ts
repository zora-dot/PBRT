import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@12.5.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-02-08",
});

serve(async (req) => {
  try {
    const { plan } = await req.json();

    const priceId = plan === "supporter_monthly"
      ? Deno.env.get("STRIPE_MONTHLY_PRICE_ID")
      : Deno.env.get("STRIPE_YEARLY_PRICE_ID");

    if (!priceId) {
      return new Response("Invalid plan", { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${Deno.env.get("CLIENT_URL")}/settings#subscription`,
      cancel_url: `${Deno.env.get("CLIENT_URL")}/pricing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
