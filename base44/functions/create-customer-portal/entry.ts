import Stripe from "npm:stripe";
import { createClientFromRequest } from "npm:@base44/sdk";
import { secrets } from "base44:runtime";

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
      return Response.json({ error: "Sign in to manage billing." }, { status: 401 });
    }

    const stripeSecret = await secrets.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) {
      return Response.json(
        { code: "STRIPE_NOT_CONFIGURED", error: "Billing is not configured yet." },
        { status: 503 },
      );
    }

    const subscriptions = await base44.entities.Subscription.filter(
      { user_email: user.email },
      "-updated_date",
      1,
    );
    const customerId = subscriptions[0]?.stripe_customer_id;
    if (!customerId) {
      return Response.json({ error: "No paid subscription was found." }, { status: 404 });
    }

    const { return_origin } = await req.json();
    const origin = safeOrigin(return_origin) || safeOrigin(req.headers.get("origin"));
    if (!origin) {
      return Response.json({ error: "A valid return URL is required." }, { status: 400 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: "2026-02-25.clover" });
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/plans`,
    });

    return Response.json({ url: portal.url });
  } catch (error) {
    console.error("create-customer-portal", error);
    return Response.json({ error: "Billing portal could not be opened." }, { status: 500 });
  }
}
