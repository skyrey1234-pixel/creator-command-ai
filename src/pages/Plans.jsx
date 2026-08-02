import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, Crown, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import {
  PLAN_CATALOG,
  loadSubscription,
  saveUpgradeRequest,
  unwrapFunctionResult,
} from '@/lib/subscription';

const order = ['free', 'pro', 'studio'];

export default function Plans() {
  const [searchParams] = useSearchParams();
  const [subscription, setSubscription] = useState(null);
  const [billingReady, setBillingReady] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState(
    searchParams.get('checkout') === 'success'
      ? 'Payment received. Your plan will update as soon as Stripe confirms it.'
      : searchParams.get('checkout') === 'canceled'
      ? 'Checkout was canceled. Your current plan is unchanged.'
      : ''
  );
  const [error, setError] = useState('');

  const refresh = async () => {
    const [currentSubscription, statusResponse] = await Promise.all([
      loadSubscription(),
      base44.functions.invoke('billing-status', {}).catch(() => null),
    ]);
    setSubscription(currentSubscription);
    const status = unwrapFunctionResult(statusResponse);
    setBillingReady(Boolean(status?.configured));
  };

  useEffect(() => {
    refresh();
  }, []);

  const upgrade = async (planKey) => {
    if (!subscription?.user) return;
    setBusy(planKey);
    setError('');
    setMessage('');
    try {
      const response = await base44.functions.invoke('create-checkout-session', {
        plan: planKey,
        return_origin: window.location.origin,
      });
      const payload = unwrapFunctionResult(response);
      if (!payload?.url) throw new Error('Checkout did not return a secure URL.');
      window.location.assign(payload.url);
    } catch (checkoutError) {
      const code = checkoutError?.response?.data?.code || checkoutError?.data?.code;
      const status = checkoutError?.response?.status || checkoutError?.status;
      if (code === 'STRIPE_NOT_CONFIGURED' || status === 503) {
        await saveUpgradeRequest(subscription.user, planKey);
        setMessage(
          `Your ${PLAN_CATALOG[planKey].name} upgrade request is saved. Connect Stripe to activate instant checkout.`
        );
      } else {
        setError(checkoutError?.response?.data?.error || checkoutError?.message || 'Checkout could not be started.');
      }
    } finally {
      setBusy('');
    }
  };

  const manageBilling = async () => {
    setBusy('portal');
    setError('');
    try {
      const response = await base44.functions.invoke('create-customer-portal', {
        return_origin: window.location.origin,
      });
      const payload = unwrapFunctionResult(response);
      if (!payload?.url) throw new Error('Billing portal did not return a URL.');
      window.location.assign(payload.url);
    } catch (portalError) {
      setError(portalError?.response?.data?.error || portalError?.message || 'Billing portal could not be opened.');
    } finally {
      setBusy('');
    }
  };

  const currentPlan = subscription?.plan_key || 'free';

  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <Crown className="w-4 h-4" /> Plans
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
          Start free. Upgrade when the app is making you money.
        </h1>
        <p className="text-muted-foreground mt-2">
          Every plan keeps your Brand Profile. Paid plans unlock the volume needed to publish consistently and close more deals.
        </p>
      </header>

      <div className={billingReady ? "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" : "rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"}>
        {billingReady
          ? 'Secure Stripe checkout and subscription updates are active.'
          : 'Free accounts are active. Paid upgrade requests are saved until Stripe is securely connected by the app owner.'}
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {order.map((key) => {
          const plan = PLAN_CATALOG[key];
          const isCurrent = currentPlan === key;
          const featured = key === 'pro';
          return (
            <section
              key={key}
              className={`relative rounded-3xl border p-6 sm:p-7 bg-card/70 ${
                featured ? 'border-primary/60 card-glow' : 'border-border'
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-6 rounded-full gradient-bg px-3 py-1 text-[11px] font-bold text-white">
                  BEST FOR GROWTH
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold">{plan.name}</h2>
                {isCurrent && (
                  <span className="rounded-full bg-emerald-500/15 text-emerald-300 px-2.5 py-1 text-xs font-medium">
                    Current
                  </span>
                )}
              </div>
              <div className="mt-5 flex items-end gap-2">
                <span className="font-display text-4xl font-bold">{plan.price}</span>
                <span className="text-sm text-muted-foreground mb-1">{plan.cadence}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-3 min-h-10">{plan.description}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                {isCurrent ? (
                  key === 'free' ? (
                    <Button disabled className="w-full">Your current plan</Button>
                  ) : (
                    <Button variant="outline" className="w-full" onClick={manageBilling} disabled={busy === 'portal'}>
                      {busy === 'portal' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      Manage billing
                    </Button>
                  )
                ) : key === 'free' ? (
                  <Button disabled variant="outline" className="w-full">Included</Button>
                ) : (
                  <Button
                    className="w-full gradient-bg border-0 hover:opacity-90"
                    onClick={() => upgrade(key)}
                    disabled={Boolean(busy)}
                  >
                    {busy === key ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <ShieldCheck className="w-5 h-5 text-emerald-300" />
          <h3 className="font-medium mt-3">Secure subscription design</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Plan status is written from verified Stripe webhooks, not editable profile fields.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <CreditCard className="w-5 h-5 text-primary" />
          <h3 className="font-medium mt-3">Simple self-service</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Paid members manage cards, invoices, upgrades, and cancellations through Stripe’s hosted portal.
          </p>
        </div>
      </div>
    </div>
  );
}
