import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadProfile, saveProfile } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCog, Sparkles, Check } from 'lucide-react';

const fields = [
  { key: 'brand_name', label: 'Brand / Creator name', placeholder: 'e.g. Maya Rivera' },
  { key: 'niche', label: 'Niche', placeholder: 'e.g. Beauty & skincare' },
  { key: 'personality', label: 'Personality', placeholder: 'Funny, warm, a little sarcastic' },
  { key: 'voice', label: 'Voice & writing style', placeholder: 'Conversational, punchy, emoji-light' },
  { key: 'visual_style', label: 'Visual style', placeholder: 'Clean, warm tones, natural light' },
  { key: 'favorite_phrases', label: 'Signature phrases', placeholder: '“okay but…”, “real talk”' },
  { key: 'goals', label: 'Goals', placeholder: 'Hit 100k, land 3 brand deals, launch a course' },
  { key: 'products', label: 'Products / offers', placeholder: 'Skincare ebook, 1:1 coaching' },
  { key: 'boundaries', label: 'Boundaries (do not post)', placeholder: 'No politics, no competitor names' },
  { key: 'audience_description', label: 'Audience', placeholder: 'Women 18-34, US, into clean beauty' },
  { key: 'primary_platforms', label: 'Primary platforms', placeholder: 'Instagram, TikTok' },
  { key: 'tone_tags', label: 'Tone tags', placeholder: 'aspirational, relatable' },
];

const numeric = ['follower_count', 'avg_views', 'engagement_rate'];

export default function BrandBrain() {
  const [profile, setProfile] = useState(undefined);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      if (p) setForm(p);
    });
  }, []);

  const update = (k, v) => {
    setForm((f) => ({ ...f, [k]: numeric.includes(k) ? (v === '' ? '' : Number(v)) : v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const savedProfile = await saveProfile(form, profile);
    setProfile(savedProfile);
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  if (profile === undefined) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <div className="flex items-center gap-2 text-primary text-sm font-medium">
          <UserCog className="w-4 h-4" /> Brand Brain
        </div>
        <h1 className="font-display text-3xl font-bold mt-1">Train your <span className="gradient-text">Creator Twin</span></h1>
        <p className="text-muted-foreground mt-2">
          This is the brain behind everything — content, captions, Reels, pitches. The more specific you are, the less generic the output.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-card/60 p-6 sm:p-8 card-glow">
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key} className={key === 'goals' || key === 'products' || key === 'boundaries' || key === 'audience_description' ? 'sm:col-span-2' : ''}>
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <Input
                value={form[key] ?? ''}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="mt-1 bg-secondary/40 border-border"
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-3 sm:col-span-2">
            <div>
              <Label className="text-xs text-muted-foreground">Followers</Label>
              <Input type="number" value={form.follower_count ?? ''} onChange={(e) => update('follower_count', e.target.value)} className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Avg views</Label>
              <Input type="number" value={form.avg_views ?? ''} onChange={(e) => update('avg_views', e.target.value)} className="mt-1 bg-secondary/40" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Engagement %</Label>
              <Input type="number" value={form.engagement_rate ?? ''} onChange={(e) => update('engagement_rate', e.target.value)} className="mt-1 bg-secondary/40" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" disabled={saving} className="gradient-bg border-0 hover:opacity-90">
            {saving ? 'Saving…' : saved ? <>Saved <Check className="w-4 h-4 ml-1" /></> : 'Save brand brain'}
          </Button>
          <Button asChild variant="outline" type="button">
            <Link to="/"><Sparkles className="w-4 h-4 mr-1.5" /> Go to dashboard</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}