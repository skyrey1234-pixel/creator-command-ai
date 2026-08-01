import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { loadProfile, buildReel } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Clapperboard, Wand2, Scissors, Type, Music, Image as ImageIcon, ArrowRight } from 'lucide-react';

function ScoreRing({ score }) {
  const pct = Math.max(0, Math.min(100, score || 0));
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#fb7185';
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(250 14% 16%)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-display font-bold" style={{ color }}>{pct}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Viral score</span>
      </div>
    </div>
  );
}

function MiniBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground capitalize">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full gradient-bg" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function ReelBuilder() {
  const [profile, setProfile] = useState(undefined);
  const [idea, setIdea] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    loadProfile().then(setProfile);
    base44.entities.ReelProject.list('-created_date', 4).then(setRecent).catch(() => {});
  }, []);

  const build = async (e) => {
    e.preventDefault();
    if (!idea.trim() || !profile) return;
    setLoading(true);
    try {
      const res = await buildReel(idea, profile);
      const record = await base44.entities.ReelProject.create({
        title: idea.slice(0, 60),
        idea,
        hook: res.hook,
        opening: res.opening,
        cuts: res.cuts || [],
        on_screen_text: res.on_screen_text || [],
        caption: res.caption,
        music_style: res.music_style,
        thumbnail_idea: res.thumbnail_idea,
        video_length: res.video_length,
        cta: res.cta,
        viral_score: res.viral_score,
        score_hook: res.score_hook,
        score_pacing: res.score_pacing,
        score_clarity: res.score_clarity,
        score_emotion: res.score_emotion,
        score_shareability: res.score_shareability,
        score_audience_fit: res.score_audience_fit,
        summary: res.summary,
        status: 'draft',
      });
      setResult(record);
      setRecent((prev) => [record, ...prev].slice(0, 4));
    } finally {
      setLoading(false);
    }
  };

  if (profile === undefined) return <div className="text-muted-foreground">Loading…</div>;

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
          <Clapperboard className="w-4 h-4" /> Viral Reel Builder
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">Blueprint your next Reel</h1>
        <p className="text-muted-foreground mt-1">From idea to edit plan — hook, cuts, on-screen text, caption, and a viral potential score.</p>
      </header>

      {!profile && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Set up your Brand Brain so Reels match your style.</p>
          <Button asChild className="mt-4 gradient-bg border-0"><Link to="/brand-brain">Set up Brand Brain <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
        </div>
      )}

      <form onSubmit={build} className="rounded-3xl border border-border bg-card/60 p-6 card-glow">
        <Label className="text-xs text-muted-foreground">Your Reel idea</Label>
        <Textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. 3 skincare mistakes I made in my 20s that aged my skin"
          className="mt-1.5 bg-secondary/40 min-h-[90px]"
        />
        <Button type="submit" disabled={loading || !profile || !idea.trim()} className="mt-4 gradient-bg border-0 hover:opacity-90">
          <Wand2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Building blueprint…' : 'Build Reel blueprint'}
        </Button>
      </form>

      {loading && !result && (
        <div className="rounded-3xl border border-border bg-card/60 p-10 text-center text-muted-foreground">
          <Wand2 className="w-5 h-5 animate-spin mx-auto mb-3" /> Analyzing hook, pacing & shareability…
        </div>
      )}

      {result && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 rounded-3xl border border-border bg-card/60 p-6 flex flex-col items-center justify-center">
            <ScoreRing score={result.viral_score} />
            <div className="w-full mt-6 space-y-3">
              {breakdown.map(([label, v]) => (
                <MiniBar key={label} label={label} value={v} />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-5 text-center">{result.summary}</p>
          </div>

          <div className="lg:col-span-2 rounded-3xl border border-border bg-card/60 p-6 space-y-5">
            <div>
              <div className="text-xs uppercase tracking-wide text-primary font-medium">Opening hook</div>
              <p className="mt-1 text-lg font-display font-semibold">{result.hook}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.opening}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Scissors className="w-3.5 h-3.5" /> Cut plan</div>
                <ul className="space-y-1.5 text-sm">
                  {result.cuts?.map((c, i) => <li key={i} className="flex gap-2"><span className="text-muted-foreground">{i + 1}.</span>{c}</li>)}
                </ul>
              </div>
              <div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-2"><Type className="w-3.5 h-3.5" /> On-screen text</div>
                <ul className="space-y-1.5 text-sm">
                  {result.on_screen_text?.map((t, i) => <li key={i} className="px-2.5 py-1 rounded-lg bg-secondary/50">{t}</li>)}
                </ul>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2"><Music className="w-4 h-4 text-fuchsia-300" /> {result.music_style}</div>
              <div className="flex items-center gap-2"><ImageIcon className="w-4 h-4 text-sky-300" /> {result.thumbnail_idea}</div>
              <div className="flex items-center gap-2"><Clapperboard className="w-4 h-4 text-amber-300" /> {result.video_length}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Caption</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.caption}</p>
            </div>
            <div className="text-sm">
              <span className="text-primary font-medium">CTA: </span>{result.cta}
            </div>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-bold mb-3">Recent blueprints</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {recent.map((r) => (
              <button
                key={r.id}
                onClick={() => setResult(r)}
                className="text-left rounded-2xl border border-border bg-card/40 p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground line-clamp-1">{r.title}</span>
                  <span className={`text-sm font-mono font-bold ${r.viral_score >= 80 ? 'text-emerald-300' : r.viral_score >= 60 ? 'text-amber-300' : 'text-rose-300'}`}>{r.viral_score}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{r.hook}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}