import Stripe from "npm:stripe";
import { createClientFromRequest } from "npm:@base44/sdk";
import { secrets } from "base44:runtime";

const PRICE_SECRET_BY_PLAN = {
  pro: "STRIPE_PRO_PRICE_ID",
  studio: "STRIPE_STUDIO_PRICE_ID",
};

function safeOrigin(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.origin : null;
  } catch {
    return null;
  }
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: "Sign in to upgrade." }, { status: 401 });
    }

    const { plan, return_origin } = await req.json();
    if (!Object.hasOwn(PRICE_SECRET_BY_PLAN, plan)) {
      return Response.json({ error: "Choose Pro or Studio." }, { status: 400 });
    }

    const stripeSecret = await secrets.get("STRIPE_SECRET_KEY");
    const priceId = await secrets.get(PRICE_SECRET_BY_PLAN[plan as keyof typeof PRICE_SECRET_BY_PLAN]);
    if (!stripeSecret || !priceId) {
      return Response.json(
        { code: "STRIPE_NOT_CONFIGURED", error: "Secure checkout is not configured yet." },
        { status: 503 },
      );
    }

    const origin = safeOrigin(return_origin) || safeOrigin(req.headers.get("origin"));
    if (!origin) {
      return Response.json({ error: "A valid return URL is required." }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2026-02-25.clover" });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/plans?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/plans?checkout=canceled`,
      metadata: {
        plan_key: plan,
        user_id: user.id,
        user_email: user.email,
      },
      subscription_data: {
        metadata: {
          plan_key: plan,
          user_id: user.id,
          user_email: user.email,
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error("create-checkout-session", error);
    return Response.json({ error: "Checkout could not be started." }, { status: 500 });
  }
}
