import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { loadProfile, generateMediaKit, calculatePricing, generatePitch } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { DollarSign, FileText, Mail, Wand2, ArrowRight, Sparkles, Check } from 'lucide-react';

function Card({ children, className = '' }) {
  return <div className={`rounded-3xl border border-border bg-card/60 p-6 card-glow ${className}`}>{children}</div>;
}

export default function Monetize() {
  const [profile, setProfile] = useState(undefined);
  const [tab, setTab] = useState('pricing');

  const [price, setPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceForm, setPriceForm] = useState({ followers: '', avg_views: '', engagement: '', niche: '', deliverables: '1 Reel', usage: 'Organic only', exclusivity: 'No exclusivity', duration: '1 week' });

  const [kit, setKit] = useState(null);
  const [kitLoading, setKitLoading] = useState(false);

  const [pitchForm, setPitchForm] = useState({ brand: '', goal: 'Secure a paid Reel sponsorship' });
  const [pitch, setPitch] = useState(null);
  const [pitchLoading, setPitchLoading] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      if (p) {
        setPriceForm((f) => ({
          ...f,
          followers: p.follower_count || '',
          avg_views: p.avg_views || '',
          engagement: p.engagement_rate || '',
          niche: p.niche || '',
        }));
      }
    });
  }, []);

  const runPricing = async (e) => {
    e.preventDefault();
    setPriceLoading(true);
    try {
      setPrice(await calculatePricing(priceForm));
    } finally {
      setPriceLoading(false);
    }
  };

  const runKit = async () => {
    setKitLoading(true);
    try {
      const res = await generateMediaKit(profile);
      setKit(res);
      await base44.entities.BrandDeal.create({
        kind: 'media_kit',
        title: `${profile.brand_name} — Media Kit`,
        headline: res.headline,
        body: res.bio,
        packages: JSON.stringify(res.packages || []),
        pricing_summary: res.stats_summary,
      });
    } finally {
      setKitLoading(false);
    }
  };

  const runPitch = async (e) => {
    e.preventDefault();
    setPitchLoading(true);
    try {
      const res = await generatePitch(profile, pitchForm.brand, pitchForm.goal);
      setPitch(res);
      await base44.entities.BrandDeal.create({
        kind: 'pitch',
        title: `Pitch → ${pitchForm.brand}`,
        headline: res.subject,
        body: res.body,
        pricing_summary: res.follow_up,
      });
    } finally {
      setPitchLoading(false);
    }
  };

  if (profile === undefined) return <div className="text-muted-foreground">Loading…</div>;

  const tabs = [
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'kit', label: 'Media Kit', icon: FileText },
    { id: 'pitch', label: 'Brand Pitch', icon: Mail },
  ];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <DollarSign className="w-4 h-4" /> Monetize
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">Turn followers into income</h1>
        <p className="text-muted-foreground mt-1">Price your deals, build your media kit, and pitch brands — all in your voice.</p>
      </header>

      {!profile && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Set up your Brand Brain first to generate accurate pricing and kits.</p>
          <Button asChild className="mt-4 gradient-bg border-0"><Link to="/brand-brain">Set up Brand Brain <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
        </div>
      )}

      <div className="flex gap-1.5 p-1 rounded-2xl bg-secondary/40 border border-border w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'pricing' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Pricing inputs</h3>
            <form onSubmit={runPricing} className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">Followers</Label><Input type="number" value={priceForm.followers} onChange={(e) => setPriceForm({ ...priceForm, followers: e.target.value })} className="bg-secondary/40 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Avg views</Label><Input type="number" value={priceForm.avg_views} onChange={(e) => setPriceForm({ ...priceForm, avg_views: e.target.value })} className="bg-secondary/40 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Engage %</Label><Input type="number" value={priceForm.engagement} onChange={(e) => setPriceForm({ ...priceForm, engagement: e.target.value })} className="bg-secondary/40 mt-1" /></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Niche</Label><Input value={priceForm.niche} onChange={(e) => setPriceForm({ ...priceForm, niche: e.target.value })} className="bg-secondary/40 mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Deliverables</Label><Input value={priceForm.deliverables} onChange={(e) => setPriceForm({ ...priceForm, deliverables: e.target.value })} className="bg-secondary/40 mt-1" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs text-muted-foreground">Usage</Label><Input value={priceForm.usage} onChange={(e) => setPriceForm({ ...priceForm, usage: e.target.value })} className="bg-secondary/40 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Exclusivity</Label><Input value={priceForm.exclusivity} onChange={(e) => setPriceForm({ ...priceForm, exclusivity: e.target.value })} className="bg-secondary/40 mt-1" /></div>
                <div><Label className="text-xs text-muted-foreground">Duration</Label><Input value={priceForm.duration} onChange={(e) => setPriceForm({ ...priceForm, duration: e.target.value })} className="bg-secondary/40 mt-1" /></div>
              </div>
              <Button type="submit" disabled={priceLoading} className="gradient-bg border-0 hover:opacity-90 w-full">
                <Wand2 className={`w-4 h-4 mr-2 ${priceLoading ? 'animate-spin' : ''}`} /> {priceLoading ? 'Calculating…' : 'Calculate pricing'}
              </Button>
            </form>
          </Card>

          <Card>
            {priceLoading && !price ? (
              <div className="text-center text-muted-foreground py-10"><Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Crunching the numbers…</div>
            ) : price ? (
              <div className="space-y-4">
                <div className="text-center pb-4 border-b border-border">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Suggested base rate</div>
                  <div className="text-4xl font-display font-bold gradient-text mt-1">{price.base_rate}</div>
                </div>
                <div className="space-y-2">
                  {price.recommendations?.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/40">
                      <div>
                        <div className="font-medium text-sm">{p.package}</div>
                        <div className="text-xs text-muted-foreground">{p.deliverables}</div>
                      </div>
                      <span className="font-mono font-bold text-primary whitespace-nowrap">{p.price}</span>
                    </div>
                  ))}
                </div>
                {price.factors?.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Pricing factors</div>
                    <div className="flex flex-wrap gap-1.5">{price.factors.map((f, i) => <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-secondary">{f}</span>)}</div>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{price.notes}</p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10"><DollarSign className="w-6 h-6 mx-auto mb-3 opacity-50" /> Get fair, competitive pricing for any deal.</div>
            )}
          </Card>
        </div>
      )}

      {tab === 'kit' && (
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Media Kit</h3>
            <Button onClick={runKit} disabled={kitLoading || !profile} className="gradient-bg border-0 hover:opacity-90">
              <Wand2 className={`w-4 h-4 mr-2 ${kitLoading ? 'animate-spin' : ''}`} /> {kit ? 'Regenerate' : 'Generate media kit'}
            </Button>
          </div>
          {kitLoading ? (
            <div className="text-center text-muted-foreground py-10"><Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Building your kit…</div>
          ) : kit ? (
            <div className="mt-5 space-y-5">
              <div className="text-center py-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                <h2 className="font-display text-2xl font-bold gradient-text">{kit.headline}</h2>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">{kit.bio}</p>
                <div className="text-xs text-muted-foreground mt-3">{kit.stats_summary}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Audience</div>
                  <ul className="space-y-1 text-sm">{kit.audience_highlights?.map((a, i) => <li key={i} className="flex gap-2"><Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />{a}</li>)}</ul>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">What sets you apart</div>
                  <ul className="space-y-1 text-sm">{kit.differentiators?.map((d, i) => <li key={i} className="flex gap-2"><Check className="w-3.5 h-3.5 text-emerald-300 mt-0.5 shrink-0" />{d}</li>)}</ul>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Campaign packages</div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {kit.packages?.map((p, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-secondary/40 p-4">
                      <div className="font-display font-bold text-primary">{p.price}</div>
                      <div className="font-medium text-sm mt-1">{p.name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{p.deliverables}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-center text-sm text-muted-foreground border-t border-border pt-4">{kit.contact_cta}</div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10"><FileText className="w-6 h-6 mx-auto mb-3 opacity-50" /> Generate a media kit from your real stats to land brand deals.</div>
          )}
        </Card>
      )}

      {tab === 'pitch' && (
        <div className="grid lg:grid-cols-2 gap-5">
          <Card>
            <h3 className="font-display font-bold text-lg flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Pitch details</h3>
            <form onSubmit={runPitch} className="mt-4 space-y-3">
              <div><Label className="text-xs text-muted-foreground">Brand / company</Label><Input value={pitchForm.brand} onChange={(e) => setPitchForm({ ...pitchForm, brand: e.target.value })} placeholder="e.g. Glow Recipe" className="bg-secondary/40 mt-1" required /></div>
              <div><Label className="text-xs text-muted-foreground">Goal</Label><Textarea value={pitchForm.goal} onChange={(e) => setPitchForm({ ...pitchForm, goal: e.target.value })} className="bg-secondary/40 mt-1 min-h-[80px]" /></div>
              <Button type="submit" disabled={pitchLoading || !profile} className="gradient-bg border-0 hover:opacity-90 w-full">
                <Wand2 className={`w-4 h-4 mr-2 ${pitchLoading ? 'animate-spin' : ''}`} /> {pitchLoading ? 'Writing…' : 'Generate pitch'}
              </Button>
            </form>
          </Card>
          <Card>
            {pitchLoading ? (
              <div className="text-center text-muted-foreground py-10"><Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Crafting your pitch…</div>
            ) : pitch ? (
              <div className="space-y-4">
                <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Subject</div><div className="font-medium mt-1">{pitch.subject}</div></div>
                <div><div className="text-xs uppercase tracking-wide text-muted-foreground">Email body</div><p className="text-sm leading-relaxed whitespace-pre-wrap mt-1">{pitch.body}</p></div>
                <div className="border-t border-border pt-3"><div className="text-xs uppercase tracking-wide text-muted-foreground">Follow-up (day 4)</div><p className="text-sm leading-relaxed whitespace-pre-wrap mt-1">{pitch.follow_up}</p></div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10"><Mail className="w-6 h-6 mx-auto mb-3 opacity-50" /> Generate a brand pitch email in your voice.</div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}