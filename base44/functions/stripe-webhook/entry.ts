import Stripe from "npm:stripe";
import { createClientFromRequest } from "npm:@base44/sdk";
import { secrets } from "base44:runtime";

export default async function (req: Request) {
  const stripeSecret = await secrets.get("STRIPE_SECRET_KEY");
  const webhookSecret = await secrets.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeSecret || !webhookSecret) {
    return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2026-02-25.clover" });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const userEmail = subscription.metadata.user_email;
      const userId = subscription.metadata.user_id;
      const planKey = subscription.metadata.plan_key || "free";

      if (userEmail) {
        const base44 = createClientFromRequest(req);
        const priceId = subscription.items.data[0]?.price?.id || "";
        const periodEnd = subscription.items.data[0]?.current_period_end;
        const data: Record<string, unknown> = {
          user_email: userEmail,
          user_id: userId || "",
          plan_key: event.type === "customer.subscription.deleted" ? "free" : planKey,
          status: event.type === "customer.subscription.deleted" ? "canceled" : subscription.status,
          stripe_customer_id:
            typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
        };
        if (periodEnd) data.current_period_end = new Date(periodEnd * 1000).toISOString();

        const existing = await base44.asServiceRole.entities.Subscription.filter(
          { user_email: userEmail },
          "-updated_date",
          1,
        );
        if (existing[0]?.id) {
          await base44.asServiceRole.entities.Subscription.update(existing[0].id, data);
        } else {
          await base44.asServiceRole.entities.Subscription.create(data);
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("stripe-webhook", error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
