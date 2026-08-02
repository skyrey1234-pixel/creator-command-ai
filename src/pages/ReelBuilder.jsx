import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { loadProfile, buildReel } from '@/lib/creatorAI';
import { PLAN_CATALOG, loadSubscription, planAllows } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  Crown,
  Image as ImageIcon,
  Music,
  Scissors,
  Type,
  Video,
  Wand2,
} from 'lucide-react';

function ScoreRing({ score }) {
  const value = Math.max(0, Math.min(100, score || 0));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const color = value >= 80 ? '#34d399' : value >= 60 ? '#fbbf24' : '#fb7185';
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-label={'Viral score ' + value}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(250 14% 16%)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * value) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-display font-bold" style={{ color }}>{value}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Viral score</span>
      </div>
    </div>
  );
}

function MiniBar({ label, value }) {
  const safeValue = Math.max(0, Math.min(100, value || 0));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{safeValue}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full gradient-bg" style={{ width: safeValue + '%' }} />
      </div>
    </div>
  );
}

function currentMonth(value) {
  const date = value ? new Date(value) : new Date();
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
}

export default function ReelBuilder() {
  const [searchParams] = useSearchParams();
  const [profile, setProfile] = useState(undefined);
  const [subscription, setSubscription] = useState(null);
  const [idea, setIdea] = useState(searchParams.get('idea') || '');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadProfile().then(setProfile);
    loadSubscription().then(setSubscription);
    base44.entities.ReelProject.list('-created_date', 100).then(setRecent).catch(() => setRecent([]));
  }, []);

  const usedThisMonth = useMemo(
    () => recent.filter((item) => currentMonth(item.created_date) === currentMonth()).length,
    [recent]
  );
  const planKey = subscription?.plan_key || 'free';
  const canBuild = planAllows(planKey, 'reels', usedThisMonth);

  const build = async (event) => {
    event.preventDefault();
    if (!idea.trim() || !profile || !canBuild) return;
    setLoading(true);
    setError('');
    try {
      const response = await buildReel(idea, profile);
      const record = await base44.entities.ReelProject.create({
        title: idea.slice(0, 60),
        idea,
        content_item_id: searchParams.get('content') || '',
        hook: response.hook,
        opening: response.opening,
        spoken_script: response.spoken_script,
        cuts: response.cuts || [],
        shot_list: response.shot_list || [],
        b_roll: response.b_roll || [],
        on_screen_text: response.on_screen_text || [],
        caption: response.caption,
        music_style: response.music_style,
        thumbnail_idea: response.thumbnail_idea,
        video_length: response.video_length,
        cta: response.cta,
        production_notes: response.production_notes,
        viral_score: response.viral_score,
        score_hook: response.score_hook,
        score_pacing: response.score_pacing,
        score_clarity: response.score_clarity,
        score_emotion: response.score_emotion,
        score_shareability: response.score_shareability,
        score_audience_fit: response.score_audience_fit,
        summary: response.summary,
        status: 'draft',
      });
      setResult(record);
      setRecent((current) => [record, ...current]);
    } catch (buildError) {
      setError(buildError?.message || 'The complete Reel script could not be generated.');
    } finally {
      setLoading(false);
    }
  };

  const copyScript = async () => {
    if (!result) return;
    const text = [
      'HOOK\n' + (result.hook || ''),
      'SPOKEN SCRIPT\n' + (result.spoken_script || ''),
      'SHOT LIST\n' + (result.shot_list || []).map((item, index) => String(index + 1) + '. ' + item).join('\n'),
      'B-ROLL\n' + (result.b_roll || []).map((item) => '- ' + item).join('\n'),
      'ON-SCREEN TEXT\n' + (result.on_screen_text || []).map((item) => '- ' + item).join('\n'),
      'CAPTION\n' + (result.caption || ''),
      'CTA\n' + (result.cta || ''),
    ].join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const markReady = async () => {
    const updated = await base44.entities.ReelProject.update(result.id, { status: 'ready' });
    setResult(updated);
    setRecent((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  if (profile === undefined || !subscription) return <div className="text-muted-foreground">Loading…</div>;

  const breakdown = result
    ? [
        ['Hook', result.score_hook],
        ['Pacing', result.score_pacing],
        ['Clarity', result.score_clarity],
        ['Emotion', result.score_emotion],
        ['Shareability', result.score_shareability],
        ['Audience fit', result.score_audience_fit],
      ]
    : [];

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <Clapperboard className="w-4 h-4" /> Reel Studio
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">Turn one idea into a film-ready Reel</h1>
        <p className="text-muted-foreground mt-1">
          Get the spoken script, shot list, B-roll, cuts, on-screen text, caption, CTA, and production notes.
        </p>
      </header>

      {!profile && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Build your Brand Profile so every script matches your voice.</p>
          <Button asChild className="mt-4 gradient-bg border-0">
            <Link to="/brand-brain">Start onboarding <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>
      )}

      {!canBuild && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-medium">You used your {PLAN_CATALOG[planKey].name} Reel allowance.</div>
            <p className="text-sm text-muted-foreground mt-1">Upgrade for more complete scripts this month.</p>
          </div>
          <Button asChild variant="outline"><Link to="/plans"><Crown className="w-4 h-4 mr-2" /> Compare plans</Link></Button>
        </div>
      )}

      <form onSubmit={build} className="rounded-3xl border border-border bg-card/60 p-6 card-glow">
        <Label className="text-xs text-muted-foreground">Your Reel idea</Label>
        <Textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          placeholder="Example: Three skincare mistakes I made in my twenties"
          className="mt-1.5 bg-secondary/40 min-h-[100px]"
        />
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <Button type="submit" disabled={loading || !profile || !idea.trim() || !canBuild} className="gradient-bg border-0 hover:opacity-90">
            <Wand2 className={loading ? 'w-4 h-4 mr-2 animate-spin' : 'w-4 h-4 mr-2'} />
            {loading ? 'Writing your complete script…' : 'Build complete Reel'}
          </Button>
          <span className="text-xs text-muted-foreground">{usedThisMonth} scripts used this month</span>
        </div>
      </form>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

      {loading && !result && (
        <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
          <Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Writing, scoring, and planning every shot…
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Production status</div>
              <div className="font-medium mt-1 capitalize">{result.status || 'draft'}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copyScript}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied' : 'Copy production brief'}
              </Button>
              {result.status !== 'ready' && <Button onClick={markReady}>Mark ready to film</Button>}
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <aside className="rounded-3xl border border-border bg-card/60 p-6">
              <ScoreRing score={result.viral_score} />
              <div className="mt-6 space-y-3">
                {breakdown.map(([label, value]) => <MiniBar key={label} label={label} value={value} />)}
              </div>
              <p className="text-sm text-muted-foreground mt-5 text-center">{result.summary}</p>
            </aside>

            <article className="lg:col-span-2 rounded-3xl border border-border bg-card/60 p-6 space-y-6">
              <section>
                <div className="text-xs uppercase tracking-wide text-primary font-medium">Opening hook</div>
                <p className="mt-1 text-xl font-display font-semibold">{result.hook}</p>
                <p className="text-sm text-muted-foreground mt-1">{result.opening}</p>
              </section>

              <section className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary font-medium">
                  <Video className="w-4 h-4" /> Word-for-word spoken script
                </div>
                <p className="text-sm leading-7 whitespace-pre-wrap mt-3">{result.spoken_script}</p>
              </section>

              <div className="grid sm:grid-cols-2 gap-5">
                <section>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><ImageIcon className="w-3.5 h-3.5" /> Shot list</div>
                  <ol className="space-y-2 text-sm">
                    {result.shot_list?.map((item, index) => <li key={index} className="flex gap-2"><span className="text-primary font-mono">{index + 1}.</span>{item}</li>)}
                  </ol>
                </section>
                <section>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Scissors className="w-3.5 h-3.5" /> Cut plan</div>
                  <ol className="space-y-2 text-sm">
                    {result.cuts?.map((item, index) => <li key={index} className="flex gap-2"><span className="text-primary font-mono">{index + 1}.</span>{item}</li>)}
                  </ol>
                </section>
                <section>
                  <div className="text-xs text-muted-foreground mb-2">B-roll</div>
                  <ul className="space-y-2 text-sm">{result.b_roll?.map((item, index) => <li key={index}>• {item}</li>)}</ul>
                </section>
                <section>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Type className="w-3.5 h-3.5" /> On-screen text</div>
                  <div className="space-y-2">{result.on_screen_text?.map((item, index) => <div key={index} className="text-sm px-3 py-2 rounded-xl bg-secondary/50">{item}</div>)}</div>
                </section>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2"><Music className="w-4 h-4 text-fuchsia-300" /> {result.music_style}</div>
                <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-sky-300" /> {result.thumbnail_idea}</div>
                <div className="flex items-center gap-2"><Clapperboard className="w-4 h-4 text-amber-300" /> {result.video_length}</div>
              </div>

              <section>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Caption</div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.caption}</p>
              </section>
              <section className="text-sm"><span className="text-primary font-medium">CTA: </span>{result.cta}</section>
              {result.production_notes && (
                <section className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Production notes</div>
                  <p className="text-sm mt-2">{result.production_notes}</p>
                </section>
              )}
            </article>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold mb-3">Saved Reel scripts</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {recent.slice(0, 6).map((item) => (
              <button
                key={item.id}
                onClick={() => setResult(item)}
                className="text-left rounded-2xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium line-clamp-1">{item.title}</span>
                  <span className="font-mono font-bold text-primary">{item.viral_score || '—'}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{item.hook}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
