import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { loadProfile, generateContentWeek } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { CalendarDays, Wand2, Hash, Clock, Check, ArrowRight } from 'lucide-react';

const typeColor = {
  reel: 'bg-violet-500/15 text-violet-300',
  carousel: 'bg-sky-500/15 text-sky-300',
  story: 'bg-fuchsia-500/15 text-fuchsia-300',
  post: 'bg-amber-500/15 text-amber-300',
  live: 'bg-rose-500/15 text-rose-300',
};

export default function ContentPlanner() {
  const [profile, setProfile] = useState(undefined);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfile().then(setProfile);
    base44.entities.ContentItem.list('-created_date', 50).then(setItems).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await generateContentWeek(profile);
      const rows = (res.items || []).map((it) => ({
        day: it.day,
        type: it.type,
        title: it.title,
        concept: it.concept,
        hook: it.hook,
        caption: it.caption,
        cta: it.cta,
        hashtags: it.hashtags || [],
        best_time: it.best_time,
        notes: it.notes,
        status: 'idea',
      }));
      const created = await base44.entities.ContentItem.bulkCreate(rows);
      setItems((prev) => [...created, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item) => {
    const next = item.status === 'idea' ? 'scheduled' : item.status === 'scheduled' ? 'posted' : 'idea';
    const updated = await base44.entities.ContentItem.update(item.id, { status: next });
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
  };

  if (profile === undefined) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <CalendarDays className="w-4 h-4" /> Content Planner
          </div>
          <h1 className="font-display text-3xl font-bold mt-1">Weekly content calendar</h1>
          <p className="text-muted-foreground mt-1">AI-built around your niche, voice, and audience performance.</p>
        </div>
        <Button onClick={generate} disabled={loading || !profile} className="gradient-bg border-0 hover:opacity-90">
          <Wand2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating…' : 'Generate week'}
        </Button>
      </header>

      {!profile && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Set up your Brand Brain first so the calendar matches your voice.</p>
          <Button asChild className="mt-4 gradient-bg border-0">
            <Link to="/brand-brain">Set up Brand Brain <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
          <Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Building your week…
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-3">
          {items.map((it) => (
            <div key={it.id} className="rounded-2xl border border-border bg-card/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${typeColor[it.type] || 'bg-secondary'}`}>{it.type}</span>
                    <span className="text-xs text-muted-foreground">{it.day}</span>
                    {it.best_time && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{it.best_time}</span>
                    )}
                  </div>
                  <h3 className="font-display font-semibold mt-1.5">{it.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{it.concept}</p>
                </div>
                <button
                  onClick={() => toggleStatus(it)}
                  className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                    it.status === 'posted'
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : it.status === 'scheduled'
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'bg-secondary text-muted-foreground border-border'
                  }`}
                >
                  {it.status === 'posted' ? <><Check className="w-3 h-3 inline mr-1" />Posted</> : it.status === 'scheduled' ? 'Scheduled' : 'Idea'}
                </button>
              </div>

              <div className="mt-3 text-sm">
                <span className="text-primary font-medium">Hook: </span>
                <span className="text-foreground/90">{it.hook}</span>
              </div>
              {it.caption && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{it.caption}</p>}
              {it.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {it.hashtags.map((h, i) => (
                    <span key={i} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{h}
                    </span>
                  ))}
                </div>
              )}
              {it.cta && <div className="mt-3 text-xs text-primary">↳ {it.cta}</div>}
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && profile && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No content yet. Hit “Generate week” to build your calendar.
        </div>
      )}
    </div>
  );
}