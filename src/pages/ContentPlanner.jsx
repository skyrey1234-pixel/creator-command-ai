import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { loadProfile, generateContentWeek } from '@/lib/creatorAI';
import { PLAN_CATALOG, loadSubscription, planAllows } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clapperboard,
  Clock,
  Copy,
  Crown,
  Hash,
  Wand2,
} from 'lucide-react';

const typeColor = {
  reel: 'bg-violet-500/15 text-violet-300',
  carousel: 'bg-sky-500/15 text-sky-300',
  story: 'bg-fuchsia-500/15 text-fuchsia-300',
  post: 'bg-amber-500/15 text-amber-300',
  live: 'bg-rose-500/15 text-rose-300',
};

function monthKey(value) {
  const date = value ? new Date(value) : new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

function rowsForWeek(result) {
  const generationId = 'week-' + Date.now();
  const start = new Date();
  return (result.items || []).slice(0, 7).map((item, index) => {
    const publishDate = new Date(start);
    publishDate.setDate(start.getDate() + index);
    return {
      day: item.day,
      type: item.type,
      title: item.title,
      concept: item.concept,
      hook: item.hook,
      caption: item.caption,
      cta: item.cta,
      hashtags: item.hashtags || [],
      best_time: item.best_time,
      notes: item.notes,
      content_pillar: item.content_pillar || '',
      generation_id: generationId,
      publish_date: publishDate.toISOString().slice(0, 10),
      status: 'idea',
    };
  });
}

export default function ContentPlanner() {
  const location = useLocation();
  const [profile, setProfile] = useState(undefined);
  const [subscription, setSubscription] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  useEffect(() => {
    loadProfile().then(setProfile);
    loadSubscription().then(setSubscription);
    base44.entities.ContentItem.list('-created_date', 100).then(setItems).catch(() => setItems([]));
  }, []);

  const usedWeeks = useMemo(() => {
    const thisMonth = monthKey();
    const current = items.filter((item) => monthKey(item.created_date) === thisMonth);
    const ids = new Set(current.map((item) => item.generation_id).filter(Boolean));
    if (current.some((item) => !item.generation_id)) ids.add('legacy');
    return ids.size;
  }, [items]);

  const planKey = subscription?.plan_key || 'free';
  const canGenerate = planAllows(planKey, 'contentWeeks', usedWeeks);

  const generate = async () => {
    if (!profile || !canGenerate) return;
    setLoading(true);
    setError('');
    try {
      const result = await generateContentWeek(profile);
      const rows = rowsForWeek(result);
      if (!rows.length) throw new Error('The AI did not return a complete week.');
      const created = await base44.entities.ContentItem.bulkCreate(rows);
      setItems((current) => [...created, ...current]);
    } catch (generateError) {
      setError(generateError?.message || 'Your content week could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (item) => {
    const next = item.status === 'idea' ? 'scheduled' : item.status === 'scheduled' ? 'posted' : 'idea';
    const updated = await base44.entities.ContentItem.update(item.id, { status: next });
    setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
  };

  const copyCaption = async (item) => {
    const text = [item.hook, item.caption, (item.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(item.id);
    setTimeout(() => setCopied(''), 1800);
  };

  if (profile === undefined || !subscription) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium">
            <CalendarDays className="w-4 h-4" /> Content Planner
          </div>
          <h1 className="font-display text-3xl font-bold mt-1">Your seven-day publishing plan</h1>
          <p className="text-muted-foreground mt-1">
            Every idea is personalized to your audience, voice, content pillars, and revenue goal.
          </p>
        </div>
        <Button onClick={generate} disabled={loading || !profile || !canGenerate} className="gradient-bg border-0 hover:opacity-90">
          <Wand2 className={loading ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2'} />
          {loading ? 'Generating…' : 'Generate another week'}
        </Button>
      </header>

      {location.state?.onboardingComplete && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex gap-3">
          <Check className="w-5 h-5 text-emerald-300 shrink-0" />
          <div>
            <div className="font-medium text-emerald-100">Your Brand Profile is live.</div>
            <p className="text-sm text-emerald-200/80 mt-1">
              Creator Command generated your first week automatically. Pick a Reel and turn it into a film-ready script.
            </p>
          </div>
        </div>
      )}

      {!profile && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Finish onboarding first so every idea sounds like you.</p>
          <Button asChild className="mt-4 gradient-bg border-0">
            <Link to="/brand-brain">Build my Brand Profile <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      )}

      {!canGenerate && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-medium">You used your {PLAN_CATALOG[planKey].name} calendar allowance.</div>
            <p className="text-sm text-muted-foreground mt-1">
              Upgrade to keep generating fresh campaigns without replacing your saved work.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/plans"><Crown className="w-4 h-4 mr-2" /> Compare plans</Link>
          </Button>
        </div>
      )}

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

      {loading && items.length === 0 && (
        <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
          <Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Building your week…
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border bg-card/60 p-5 hover:border-primary/25 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={'text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ' + (typeColor[item.type] || 'bg-secondary')}>
                      {item.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.day}</span>
                    {item.publish_date && <span className="text-xs text-muted-foreground">{item.publish_date}</span>}
                    {item.best_time && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />{item.best_time}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-semibold mt-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.concept}</p>
                </div>
                <button
                  onClick={() => toggleStatus(item)}
                  className={
                    item.status === 'posted'
                      ? 'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : item.status === 'scheduled'
                      ? 'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border bg-sky-500/15 text-sky-300 border-sky-500/30'
                      : 'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border bg-secondary text-muted-foreground border-border'
                  }
                >
                  {item.status === 'posted' ? 'Posted' : item.status === 'scheduled' ? 'Scheduled' : 'Idea'}
                </button>
              </div>

              <div className="mt-3 text-sm">
                <span className="text-primary font-medium">Hook: </span>
                <span className="text-foreground/90">{item.hook}</span>
              </div>
              {item.caption && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{item.caption}</p>}
              {item.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.hashtags.map((tag, index) => (
                    <span key={index} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <Hash className="w-2.5 h-2.5" />{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/70">
                <Button size="sm" variant="ghost" onClick={() => copyCaption(item)}>
                  {copied === item.id ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
                  {copied === item.id ? 'Copied' : 'Copy post'}
                </Button>
                {item.type === 'reel' && (
                  <Button asChild size="sm" className="gradient-bg border-0">
                    <Link to={'/reel-builder?idea=' + encodeURIComponent(item.concept || item.title) + '&content=' + item.id}>
                      <Clapperboard className="w-4 h-4 mr-1.5" /> Build full Reel script
                    </Link>
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && profile && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No content yet. Generate your first personalized week.
        </div>
      )}
    </div>
  );
}
