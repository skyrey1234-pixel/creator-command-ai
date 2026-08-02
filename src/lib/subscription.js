import { base44 } from '@/api/base44Client';

export const PLAN_CATALOG = {
  free: {
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    description: 'Prove the workflow before you pay.',
    limits: { contentWeeks: 1, reels: 3, deals: 3, performanceAnalyses: 3, repurposeProjects: 1, businessLeads: 3 },
    features: ['1 AI content week', '3 complete Reel scripts', '3 performance reviews', '1 multi-format repurpose project', 'Track 3 deals and 3 business leads'],
  },
  pro: {
    name: 'Pro',
    price: '$29',
    cadence: 'per month',
    description: 'For creators building consistent content and revenue.',
    limits: { contentWeeks: 12, reels: 50, deals: 50, performanceAnalyses: 30, repurposeProjects: 20, businessLeads: 100 },
    features: ['12 AI content weeks per month', '50 complete Reel scripts', 'Performance Coach and Trend Matcher', '20 repurpose campaigns', 'Digital Product Builder', '100 business leads', 'Media kits, pricing and outreach'],
  },
  studio: {
    name: 'Studio',
    price: '$79',
    cadence: 'per month',
    description: 'For high-output creators and creator-management teams.',
    limits: { contentWeeks: Infinity, reels: Infinity, deals: Infinity, performanceAnalyses: Infinity, repurposeProjects: Infinity, businessLeads: Infinity },
    features: ['Everything in Pro', 'Unlimited AI workflows', 'Multi-client agency workspace', 'Retainer and review tracking', 'Unlimited deal and lead pipelines', 'Priority upgrade support'],
  },
};

export function unwrapFunctionResult(response) {
  return response?.data ?? response;
}

export async function loadSubscription() {
  const user = await base44.auth.me();
  if (!user?.email) return { plan_key: 'free', status: 'active', user: null };

  const rows = await base44.entities.Subscription.filter(
    { user_email: user.email },
    '-updated_date',
    1
  ).catch(() => []);

  const subscription = rows[0];
  const active = subscription && ['active', 'trialing'].includes(subscription.status);
  return {
    ...(active ? subscription : { plan_key: 'free', status: 'active' }),
    user,
  };
}

export async function saveUpgradeRequest(user, plan) {
  const existing = await base44.entities.UpgradeRequest.filter(
    { user_email: user.email, requested_plan: plan, status: 'pending' },
    '-created_date',
    1
  ).catch(() => []);

  if (existing[0]) return existing[0];

  return base44.entities.UpgradeRequest.create({
    user_email: user.email,
    requested_plan: plan,
    status: 'pending',
    source: 'pricing_page',
    note: 'Checkout configuration pending; follow up to activate this subscription.',
  });
}

const PLAN_ORDER = ['free', 'pro', 'studio'];

export function hasPlan(planKey, minimum) {
  return PLAN_ORDER.indexOf(planKey || 'free') >= PLAN_ORDER.indexOf(minimum);
}

export function planAllows(planKey, feature, used = 0) {
  const plan = PLAN_CATALOG[planKey] || PLAN_CATALOG.free;
  return used < (plan.limits[feature] ?? 0);
}
