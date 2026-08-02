import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { generateDailyPlan, loadProfile } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { Sparkles, Clock, Lightbulb, Wand2, ArrowRight, RefreshCw, CalendarDays } from 'lucide-react';

const typeMeta = {
  content: { icon: Sparkles, tint: 'text-violet-300 bg-violet-500/10' },
  engagement: { icon: Clock, tint: 'text-sky-300 bg-sky-500/10' },
  monetization: { icon: Lightbulb, tint: 'text-amber-300 bg-amber-500/10' },
  growth: { icon: Wand2, tint: 'text-fuchsia-300 bg-fuchsia-500/10' },
};

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-display font-bold mt-1">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(undefined);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (profile) {
      setLoading(true);
      generateDailyPlan(profile)
        .then(setPlan)
        .finally(() => setLoading(false));
    }
    base44.entities.ContentItem.list('-created_date', 4)
      .then(setItems)
      .catch(() => {});
  }, [profile]);

  if (profile === undefined) {
    return <div className="text-muted-foreground">Loading…</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6 card-glow">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold">Welcome to <span className="gradient-text">Creator Command</span></h1>
        <p className="text-muted-foreground mt-3">
          Your AI growth and monetization system. First, let's teach the AI your brand — your voice, niche, audience, and goals. This powers everything else.
        </p>
        <Button asChild size="lg" className="mt-8 gradient-bg border-0 hover:opacity-90">
          <Link to="/brand-brain">Set up your Brand Brain <ArrowRight className="w-4 h-4 ml-2" /></Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Today's Command Center</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Hi {profile.brand_name} 👋</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setLoading(true);
            generateDailyPlan(profile)
              .then(setPlan)
              .finally(() => setLoading(false));
          }}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh plan
        </Button>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Followers" value={profile.follower_count ? profile.follower_count.toLocaleString() : '—'} />
        <Stat label="Avg views" value={profile.avg_views ? profile.avg_views.toLocaleString() : '—'} />
        <Stat label="Engagement" value={profile.engagement_rate ? `${profile.engagement_rate}%` : '—'} />
        <Stat label="Niche" value={profile.niche || '—'} />
      </div>

      {loading && !plan ? (
        <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-3" />
          Crafting your personalized action plan…
        </div>
      ) : plan ? (
        <>
          <section className="rounded-3xl border border-border bg-card/60 p-6 sm:p-8 card-glow">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">{plan.greeting}</span>
            </div>
            <p className="mt-3 text-lg font-display font-semibold">{plan.focus}</p>
            <div className="mt-6 space-y-3">
              {plan.actions?.map((a, i) => {
                const meta = typeMeta[a.type] || typeMeta.content;
                const Icon = meta.icon;
                return (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-secondary/40 border border-border/60">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tint}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">{a.time}</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{a.type}</span>
                      </div>
                      <div className="font-medium mt-0.5">{a.title}</div>
                      <p className="text-sm text-muted-foreground mt-1">{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm font-medium uppercase tracking-wide">Today's insight</span>
            </div>
            <p className="text-lg leading-relaxed">{plan.insight}</p>
          </section>
        </>
      ) : null}

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> Upcoming content
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/planner">Open planner <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No content planned yet. Generate a weekly calendar to get started.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {items.map((it) => (
              <div key={it.id} className="rounded-2xl border border-border bg-card/60 p-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize px-2 py-0.5 rounded-full bg-secondary">{it.type}</span>
                  <span>{it.day}</span>
                </div>
                <div className="font-medium mt-2">{it.title}</div>
                <div className="text-sm text-muted-foreground mt-1 line-clamp-2">{it.hook}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}