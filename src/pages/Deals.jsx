import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { generateDealOutreach, loadProfile } from '@/lib/creatorAI';
import { PLAN_CATALOG, loadSubscription, planAllows } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Copy,
  Crown,
  DollarSign,
  Mail,
  Plus,
  Sparkles,
  Wand2,
} from 'lucide-react';

const stages = ['lead', 'pitch_ready', 'pitched', 'negotiating', 'won', 'lost'];

const stageLabel = {
  lead: 'Lead',
  pitch_ready: 'Pitch ready',
  pitched: 'Pitched',
  negotiating: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
};

const stageStyle = {
  lead: 'bg-secondary text-muted-foreground',
  pitch_ready: 'bg-violet-500/15 text-violet-300',
  pitched: 'bg-sky-500/15 text-sky-300',
  negotiating: 'bg-amber-500/15 text-amber-300',
  won: 'bg-emerald-500/15 text-emerald-300',
  lost: 'bg-rose-500/15 text-rose-300',
};

const emptyForm = {
  brand_name: '',
  contact_name: '',
  contact_email: '',
  deal_value: '',
  deliverables: '1 sponsored Reel',
  next_follow_up: '',
  notes: '',
};

function money(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0);
}

export default function Deals() {
  const [profile, setProfile] = useState(undefined);
  const [subscription, setSubscription] = useState(null);
  const [deals, setDeals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [expanded, setExpanded] = useState('');
  const [copied, setCopied] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile().then(setProfile);
    loadSubscription().then(setSubscription);
    base44.entities.BrandDeal.list('-updated_date', 100).then(setDeals).catch(() => setDeals([]));
  }, []);

  const pipelineDeals = useMemo(
    () => deals.filter((deal) => !['media_kit', 'rate_card'].includes(deal.kind)),
    [deals]
  );
  const filteredDeals = filter === 'all'
    ? pipelineDeals
    : pipelineDeals.filter((deal) => (deal.stage || 'lead') === filter);
  const openValue = pipelineDeals
    .filter((deal) => !['won', 'lost'].includes(deal.stage || 'lead'))
    .reduce((sum, deal) => sum + Number(deal.deal_value || 0), 0);
  const wonValue = pipelineDeals
    .filter((deal) => deal.stage === 'won')
    .reduce((sum, deal) => sum + Number(deal.deal_value || 0), 0);

  const planKey = subscription?.plan_key || 'free';
  const canAddDeal = planAllows(planKey, 'deals', pipelineDeals.length);

  const createDeal = async (event) => {
    event.preventDefault();
    if (!canAddDeal) return;
    setBusy('create');
    setError('');
    try {
      const created = await base44.entities.BrandDeal.create({
        kind: 'opportunity',
        title: form.brand_name + ' partnership',
        brand_name: form.brand_name,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        stage: 'lead',
        deal_value: form.deal_value ? Number(form.deal_value) : 0,
        deliverables: form.deliverables,
        next_follow_up: form.next_follow_up || null,
        notes: form.notes,
      });
      setDeals((current) => [created, ...current]);
      setForm(emptyForm);
      setShowForm(false);
      setExpanded(created.id);
    } catch (createError) {
      setError(createError?.message || 'The opportunity could not be saved.');
    } finally {
      setBusy('');
    }
  };

  const generateOutreach = async (deal) => {
    if (!profile) return;
    setBusy(deal.id + '-outreach');
    setError('');
    try {
      const outreach = await generateDealOutreach(profile, deal);
      const updated = await base44.entities.BrandDeal.update(deal.id, {
        headline: outreach.subject,
        body: outreach.body,
        follow_up_body: outreach.follow_up,
        pricing_summary: outreach.angle,
        outreach_generated_at: new Date().toISOString(),
        stage: deal.stage === 'lead' || !deal.stage ? 'pitch_ready' : deal.stage,
      });
      setDeals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setExpanded(updated.id);
    } catch (outreachError) {
      setError(outreachError?.message || 'Outreach could not be generated.');
    } finally {
      setBusy('');
    }
  };

  const advance = async (deal) => {
    const currentStage = deal.stage || 'lead';
    const index = stages.indexOf(currentStage);
    const next = stages[Math.min(index + 1, stages.indexOf('won'))];
    const updated = await base44.entities.BrandDeal.update(deal.id, {
      stage: next,
      last_contacted_at: next === 'pitched' ? new Date().toISOString() : deal.last_contacted_at,
    });
    setDeals((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const copyOutreach = async (deal) => {
    await navigator.clipboard.writeText(
      ['Subject: ' + (deal.headline || ''), deal.body || '', 'Follow-up:\n' + (deal.follow_up_body || '')].join('\n\n')
    );
    setCopied(deal.id);
    setTimeout(() => setCopied(''), 1800);
  };

  if (profile === undefined || !subscription) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-7">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <BriefcaseBusiness className="w-4 h-4" /> Brand Deals
          </div>
          <h1 className="font-display text-3xl font-bold mt-1">Turn outreach into a revenue pipeline</h1>
          <p className="text-muted-foreground mt-1">Track every opportunity, generate tailored outreach, and move deals toward won.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)} disabled={!canAddDeal} className="gradient-bg border-0">
          <Plus className="w-4 h-4 mr-2" /> Add opportunity
        </Button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="text-xs text-muted-foreground">Open pipeline</div>
          <div className="text-2xl font-display font-bold mt-1">{money(openValue)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="text-xs text-muted-foreground">Revenue won</div>
          <div className="text-2xl font-display font-bold text-emerald-300 mt-1">{money(wonValue)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="text-xs text-muted-foreground">Opportunities</div>
          <div className="text-2xl font-display font-bold mt-1">{pipelineDeals.length}</div>
        </div>
      </div>

      {!profile && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Complete your Brand Profile before generating outreach.</p>
          <Button asChild className="mt-4 gradient-bg border-0"><Link to="/brand-brain">Start onboarding <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
        </div>
      )}

      {!canAddDeal && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-medium">Your {PLAN_CATALOG[planKey].name} pipeline is full.</div>
            <p className="text-sm text-muted-foreground mt-1">Upgrade to track more active opportunities.</p>
          </div>
          <Button asChild variant="outline"><Link to="/plans"><Crown className="w-4 h-4 mr-2" /> Compare plans</Link></Button>
        </div>
      )}

      {showForm && (
        <form onSubmit={createDeal} className="rounded-3xl border border-primary/30 bg-card/70 p-6 card-glow">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold">New brand opportunity</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-5">
            <div>
              <Label className="text-xs text-muted-foreground">Brand *</Label>
              <Input required value={form.brand_name} onChange={(event) => setForm({ ...form, brand_name: event.target.value })} placeholder="Glow Recipe" className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Target deal value</Label>
              <Input type="number" min="0" value={form.deal_value} onChange={(event) => setForm({ ...form, deal_value: event.target.value })} placeholder="2000" className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contact name</Label>
              <Input value={form.contact_name} onChange={(event) => setForm({ ...form, contact_name: event.target.value })} placeholder="Jordan Lee" className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contact email</Label>
              <Input type="email" value={form.contact_email} onChange={(event) => setForm({ ...form, contact_email: event.target.value })} placeholder="partnerships@brand.com" className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Deliverables</Label>
              <Input value={form.deliverables} onChange={(event) => setForm({ ...form, deliverables: event.target.value })} className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Next follow-up</Label>
              <Input type="date" value={form.next_follow_up} onChange={(event) => setForm({ ...form, next_follow_up: event.target.value })} className="mt-1 bg-secondary/40" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Why this brand is a fit, recent launch, campaign angle…" className="mt-1 bg-secondary/40" />
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <Button type="submit" disabled={busy === 'create'} className="gradient-bg border-0">
              {busy === 'create' ? <Wand2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save opportunity
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['all', ...stages].map((stage) => (
          <button
            key={stage}
            onClick={() => setFilter(stage)}
            className={
              filter === stage
                ? 'rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium whitespace-nowrap'
                : 'rounded-full bg-secondary/60 text-muted-foreground px-3 py-1.5 text-xs font-medium whitespace-nowrap'
            }
          >
            {stage === 'all' ? 'All deals' : stageLabel[stage]}
          </button>
        ))}
      </div>

      {filteredDeals.length ? (
        <div className="grid gap-4">
          {filteredDeals.map((deal) => {
            const stage = deal.stage || 'lead';
            const isExpanded = expanded === deal.id;
            return (
              <article key={deal.id} className="rounded-2xl border border-border bg-card/60 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-lg font-bold">{deal.brand_name || deal.title}</h3>
                        <span className={'rounded-full px-2.5 py-1 text-[11px] font-medium ' + stageStyle[stage]}>{stageLabel[stage]}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{deal.deliverables || 'Creator partnership'}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-bold text-emerald-300">{money(deal.deal_value)}</div>
                      {deal.next_follow_up && <div className="text-xs text-muted-foreground mt-1">Follow up {deal.next_follow_up}</div>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button size="sm" onClick={() => generateOutreach(deal)} disabled={!profile || busy === deal.id + '-outreach'} className="gradient-bg border-0">
                      <Sparkles className={busy === deal.id + '-outreach' ? 'w-4 h-4 mr-1.5 animate-spin' : 'w-4 h-4 mr-1.5'} />
                      {deal.body ? 'Regenerate outreach' : 'Generate outreach'}
                    </Button>
                    {!['won', 'lost'].includes(stage) && (
                      <Button size="sm" variant="outline" onClick={() => advance(deal)}>
                        Advance stage <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                    {deal.body && <Button size="sm" variant="ghost" onClick={() => setExpanded(isExpanded ? '' : deal.id)}>{isExpanded ? 'Hide email' : 'View email'}</Button>}
                  </div>
                </div>

                {isExpanded && deal.body && (
                  <div className="border-t border-border bg-secondary/20 p-5 space-y-4">
                    {deal.pricing_summary && <div className="text-sm text-primary"><span className="font-medium">Angle: </span>{deal.pricing_summary}</div>}
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Subject</div>
                      <div className="font-medium mt-1">{deal.headline}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Outreach</div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap mt-1">{deal.body}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">Four-day follow-up</div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap mt-1">{deal.follow_up_body || deal.pricing_summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => copyOutreach(deal)}>
                        {copied === deal.id ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                        {copied === deal.id ? 'Copied' : 'Copy email'}
                      </Button>
                      {deal.contact_email && (
                        <Button asChild size="sm">
                          <a href={'mailto:' + deal.contact_email + '?subject=' + encodeURIComponent(deal.headline || '') + '&body=' + encodeURIComponent(deal.body || '')}>
                            <Mail className="w-4 h-4 mr-1.5" /> Open in email
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center">
          <BriefcaseBusiness className="w-8 h-8 text-muted-foreground mx-auto" />
          <h2 className="font-display font-bold mt-3">No deals in this view</h2>
          <p className="text-sm text-muted-foreground mt-1">Add a brand opportunity and let Creator Command write the first outreach.</p>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card/40 p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-emerald-300" />
          <div>
            <div className="text-sm font-medium">Need a rate before you pitch?</div>
            <div className="text-xs text-muted-foreground">Use the monetization suite to calculate pricing and package deliverables.</div>
          </div>
        </div>
        <Button asChild variant="ghost" size="sm"><Link to="/monetize">Open tools <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
      </div>
    </div>
  );
}
