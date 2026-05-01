import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
  const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2023-10-16" });
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error("Webhook signature verification failed:", e);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, credits } = session.metadata ?? {};

    if (!userId || !credits) {
      console.error("Missing metadata in session:", session.id);
      return new Response("Missing metadata", { status: 400 });
    }

    const creditsNum = parseInt(credits, 10);

    // Update payment record
    await supabase
      .from("payments")
      .update({ status: "completed", stripe_payment_id: session.payment_intent as string })
      .eq("stripe_session_id", session.id);

    // Add credits to user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    const currentCredits = (profile?.credits ?? 0) + creditsNum;

    await supabase
      .from("profiles")
      .update({ credits: currentCredits })
      .eq("id", userId);

    console.log(`Added ${creditsNum} credits to user ${userId}. New total: ${currentCredits}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
