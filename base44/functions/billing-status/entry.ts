import { createClientFromRequest } from "npm:@base44/sdk";
import { secrets } from "base44:runtime";

const REQUIRED = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_STUDIO_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
];

export default async function (req: Request) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user?.email) {
    return Response.json({ error: "Sign in to view billing status." }, { status: 401 });
  }

  const values = await Promise.all(REQUIRED.map((name) => secrets.get(name)));
  return Response.json({
    configured: values.every(Boolean),
    checkout_ready: Boolean(values[0] && values[1] && values[2]),
    webhook_ready: Boolean(values[0] && values[3]),
  });
}
