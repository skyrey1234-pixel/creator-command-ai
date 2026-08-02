# Creator Command AI — Publishing Checklist

## Verified in the Base44 sandbox

- Production frontend build passes.
- ESLint passes.
- Creator data entities use owner-only row-level security with admin access.
- Guided onboarding creates a personalized Brand Profile and the first seven-day content plan.
- Content ideas can open directly in the Reel Studio.
- Reel Studio saves complete production briefs.
- Brand Deals tracks stages, values, follow-up dates, and AI outreach.
- Free, Pro, and Studio entitlements are represented in the app.
- Stripe checkout, webhook synchronization, and customer portal functions are present.

## Required before accepting card payments

Create recurring Stripe Prices for:

- Pro: $29 per month
- Studio: $79 per month

Add these secrets in the Base44 app settings:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_STUDIO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

In Stripe, add the published endpoint below as a webhook:

`https://YOUR-PUBLISHED-DOMAIN/functions/stripe-webhook`

Subscribe it to:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Until these values are configured, upgrade clicks safely create an `UpgradeRequest` record for manual follow-up instead of showing a fake checkout.

## Final acceptance test

1. Register a new test user.
2. Complete all three onboarding steps.
3. Confirm exactly seven content items are created.
4. Open a Reel item and generate a complete script.
5. Add a brand opportunity and generate outreach.
6. Confirm the Free limits point to the Plans page.
7. Run a Stripe test-mode Pro checkout.
8. Confirm the Stripe webhook creates or updates the user's `Subscription`.
9. Confirm the user can open the Stripe customer portal.
10. Confirm a second test user cannot see the first user's profiles, content, scripts, messages, or deals.

## Publish

After the acceptance test, publish the latest version from the Base44 dashboard.
