import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { generateContentWeek, loadProfile, saveProfile } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Loader2,
  Sparkles,
  Target,
  UserCog,
} from 'lucide-react';

const steps = [
  {
    title: 'Brand foundation',
    subtitle: 'Tell the AI exactly who you help and why they should care.',
    icon: UserCog,
    fields: [
      { key: 'brand_name', label: 'Creator or brand name', placeholder: 'Maya Rivera', required: true },
      { key: 'niche', label: 'Niche', placeholder: 'Beauty and skincare', required: true },
      { key: 'value_proposition', label: 'Why people follow you', placeholder: 'I make evidence-based skincare feel simple and affordable.', wide: true, multiline: true },
      { key: 'audience_description', label: 'Ideal audience', placeholder: 'Women 18–34 who want clear skin without a 12-step routine.', wide: true, multiline: true },
    ],
  },
  {
    title: 'Voice and creative style',
    subtitle: 'This makes every caption, script, and pitch sound like you.',
    icon: Sparkles,
    fields: [
      { key: 'personality', label: 'Personality', placeholder: 'Warm, funny, direct' },
      { key: 'voice', label: 'Writing voice', placeholder: 'Conversational, punchy, emoji-light' },
      { key: 'tone_tags', label: 'Tone tags', placeholder: 'Relatable, expert, aspirational' },
      { key: 'visual_style', label: 'Visual style', placeholder: 'Warm tones, natural light, clean close-ups' },
      { key: 'favorite_phrases', label: 'Signature phrases', placeholder: '“real talk”, “okay but…”', wide: true },
      { key: 'boundaries', label: 'Never say or post', placeholder: 'No politics, no competitor attacks, no medical promises', wide: true, multiline: true },
    ],
  },
  {
    title: 'Growth and revenue',
    subtitle: 'Set the targets that shape your first seven-day plan.',
    icon: Target,
    fields: [
      { key: 'content_pillars', label: 'Content pillars', placeholder: 'Education, routines, product reviews', wide: true },
      { key: 'primary_platforms', label: 'Primary platforms', placeholder: 'Instagram, TikTok' },
      { key: 'posting_frequency', label: 'Ideal posting pace', placeholder: '5 posts per week' },
      { key: 'goals', label: 'Growth goals', placeholder: 'Reach 100k followers and improve saves', wide: true, multiline: true },
      { key: 'products', label: 'Products or offers', placeholder: 'Skincare guide, affiliate links, 1:1 consults', wide: true, multiline: true },
      { key: 'monetization_goal', label: 'Revenue goal', placeholder: 'Close two $2,000 sponsorships per month', wide: true },
    ],
  },
];

const numericFields = ['follower_count', 'avg_views', 'engagement_rate'];

function toProfilePayload(form) {
  return {
    ...form,
    content_pillars: String(form.content_pillars || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    onboarding_complete: true,
  };
}

function contentRows(result) {
  const generationId = 'onboarding-' + Date.now();
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

export default function BrandBrain() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(undefined);
  const [form, setForm] = useState({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile().then((current) => {
      setProfile(current);
      if (current) {
        setForm({
          ...current,
          content_pillars: Array.isArray(current.content_pillars)
            ? current.content_pillars.join(', ')
            : current.content_pillars || '',
        });
      }
    });
  }, []);

  const update = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: numericFields.includes(key) ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const canContinue = step > 0 || (String(form.brand_name || '').trim() && String(form.niche || '').trim());

  const finish = async (event) => {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = toProfilePayload(form);
      const savedProfile = await saveProfile(payload, profile);
      setProfile(savedProfile);

      if (!profile) {
        const generated = await generateContentWeek(savedProfile);
        const rows = contentRows(generated);
        if (rows.length) await base44.entities.ContentItem.bulkCreate(rows);
        navigate('/planner', { state: { onboardingComplete: true } });
      } else {
        navigate('/');
      }
    } catch (saveError) {
      setError(saveError?.message || 'Your Brand Profile could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (profile === undefined) return <div className="text-muted-foreground">Loading…</div>;

  const current = steps[step];
  const StepIcon = current.icon;
  const isNew = !profile;

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      <header className="text-center max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-primary text-sm font-medium rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5">
          <Sparkles className="w-4 h-4" /> {isNew ? 'Personalized onboarding' : 'Brand Profile'}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold mt-4">
          {isNew ? 'Build your creator growth engine' : 'Keep your Creator Twin sharp'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isNew
            ? 'Finish these three short steps and Creator Command will immediately build your first seven-day content plan.'
            : 'Update the source of truth behind your calendars, scripts, and brand outreach.'}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const active = index === step;
          const complete = index < step;
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => index <= step && setStep(index)}
              className={
                active
                  ? 'rounded-2xl border border-primary/50 bg-primary/10 p-3 text-left'
                  : complete
                  ? 'rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-left'
                  : 'rounded-2xl border border-border bg-card/40 p-3 text-left opacity-60'
              }
            >
              <div className="flex items-center gap-2">
                {complete ? <Check className="w-4 h-4 text-emerald-300" /> : <Icon className="w-4 h-4 text-primary" />}
                <span className="text-xs font-medium hidden sm:inline">Step {index + 1}</span>
              </div>
              <div className="text-sm font-medium mt-2 line-clamp-1">{item.title}</div>
            </button>
          );
        })}
      </div>

      <form onSubmit={finish} className="rounded-3xl border border-border bg-card/70 p-6 sm:p-8 card-glow">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <StepIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold">{current.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{current.subtitle}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-7">
          {current.fields.map((field) => (
            <div key={field.key} className={field.wide ? 'sm:col-span-2' : ''}>
              <Label className="text-xs text-muted-foreground">
                {field.label}{field.required ? ' *' : ''}
              </Label>
              {field.multiline ? (
                <Textarea
                  value={form[field.key] ?? ''}
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1.5 min-h-[88px] bg-secondary/40"
                  required={field.required}
                />
              ) : (
                <Input
                  value={form[field.key] ?? ''}
                  onChange={(event) => update(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className="mt-1.5 bg-secondary/40"
                  required={field.required}
                />
              )}
            </div>
          ))}

          {step === 2 && (
            <div className="sm:col-span-2 grid grid-cols-3 gap-3 rounded-2xl border border-border bg-secondary/20 p-4">
              <div>
                <Label className="text-xs text-muted-foreground">Followers</Label>
                <Input type="number" min="0" value={form.follower_count ?? ''} onChange={(event) => update('follower_count', event.target.value)} className="mt-1 bg-background/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Avg views</Label>
                <Input type="number" min="0" value={form.avg_views ?? ''} onChange={(event) => update('avg_views', event.target.value)} className="mt-1 bg-background/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Engagement %</Label>
                <Input type="number" min="0" step="0.1" value={form.engagement_rate ?? ''} onChange={(event) => update('engagement_rate', event.target.value)} className="mt-1 bg-background/50" />
              </div>
            </div>
          )}
        </div>

        {error && <div className="mt-5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-200">{error}</div>}

        <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-border">
          <Button type="button" variant="ghost" onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0 || saving}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button type="submit" disabled={!canContinue || saving} className="gradient-bg border-0 hover:opacity-90">
            {saving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isNew ? 'Building your first week…' : 'Saving profile…'}</>
            ) : step < steps.length - 1 ? (
              <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
            ) : isNew ? (
              <><CalendarDays className="w-4 h-4 mr-2" /> Save & generate my week</>
            ) : (
              <>Save Brand Profile <Check className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Your information stays inside your account and powers only your Creator Command workspace.
      </p>
    </div>
  );
}
