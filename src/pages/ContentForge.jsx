import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { generateBatchImage, generateContentBatch, loadProfile } from '@/lib/creatorAI';
import { hasPlan, loadSubscription, planAllows, PLAN_CATALOG } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Image } from '@/components/ui/image';
import {
  ArrowRight,
  Check,
  Clapperboard,
  Copy,
  Crown,
  FileVideo,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';

function Card({ children, className = '' }) {
  return <section className={`rounded-3xl border border-border bg-card/60 p-5 sm:p-6 ${className}`}>{children}</section>;
}

const STAGES = {
  idle: '',
  upload: 'Uploading your file…',
  transcribe: 'Transcribing the audio…',
  batch: 'Writing your content batch…',
  images: 'Generating visuals…',
  saving: 'Saving your batch…',
};

// Whisper transcription caps single files at 25MB.
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const fmtSize = (bytes) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`);
// Whisper-supported input extensions (mp4 yes, mov/no).
const SUPPORTED_EXT = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
const ACCEPT_ATTR = SUPPORTED_EXT.map((e) => `.${e}`).join(',');

export default function ContentForge() {
  const [profile, setProfile] = useState(undefined);
  const [subscription, setSubscription] = useState(null);
  const [forgeCount, setForgeCount] = useState(0);
  const [source, setSource] = useState({ source_type: 'text', source_text: '' });
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('idle');
  const [batch, setBatch] = useState(null);
  const [message, setMessage] = useState('');
  const [fileWarning, setFileWarning] = useState('');
  const [copied, setCopied] = useState('');
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    const ext = f ? f.name.split('.').pop()?.toLowerCase() : '';
    let warn = '';
    if (f && !SUPPORTED_EXT.includes(ext)) warn = `.${ext} isn't supported. Use mp4, m4a, mp3, wav, webm, or ogg — convert a .mov to .mp4 first, or paste the transcript into the notes box.`;
    else if (f && f.size > MAX_FILE_BYTES) warn = `That file is ${fmtSize(f.size)} — transcription supports up to 25MB. Trim it down, or paste a transcript instead.`;
    setFile(f);
    setFileWarning(warn);
  };

  const reload = async () => {
    const [p, s, forged] = await Promise.all([
      loadProfile(),
      loadSubscription(),
      base44.entities.ContentItem.filter({ generation_id: 'forge' }).catch(() => []),
    ]);
    setProfile(p);
    setSubscription(s);
    setForgeCount(forged.length);
  };

  useEffect(() => { reload(); }, []);

  const planKey = subscription?.plan_key || 'free';
  const canForge = planAllows(planKey, 'forgePosts', forgeCount);
  const hasProfile = profile?.brand_name;

  const copyText = async (key, value) => {
    await navigator.clipboard.writeText(value || '');
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };

  const run = async (event) => {
    event.preventDefault();
    if (!hasProfile || !canForge) return;
    setMessage('');
    setBatch(null);
    try {
      let combined = source.source_text.trim();

      if (file) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!SUPPORTED_EXT.includes(ext)) {
          setMessage(`.${ext} isn't supported by transcription. Use mp4, m4a, mp3, wav, webm, or ogg — convert .mov to .mp4, or paste the transcript into the notes box.`);
          setStage('idle');
          return;
        }
        if (file.size > MAX_FILE_BYTES) {
          setMessage(`That file is ${fmtSize(file.size)} — transcription supports up to 25MB. Trim it shorter or paste the transcript into the notes box.`);
          setStage('idle');
          return;
        }
        try {
          setStage('upload');
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          setStage('transcribe');
          const transcript = await base44.integrations.Core.TranscribeAudio({ audio_url: file_url });
          const text = typeof transcript === 'string' ? transcript : transcript?.text || '';
          combined = (combined ? combined + '\n\n' : '') + text.trim();
        } catch (err) {
          setMessage(`Upload or transcription failed${err?.message ? `: ${err.message}` : ''}. For videos over 25MB, trim the clip or paste a transcript into the notes box.`);
          setStage('idle');
          return;
        }
      }

      if (!combined) {
        setMessage('Add some source content first — paste your notes or upload a video/audio clip.');
        setStage('idle');
        return;
      }

      setStage('batch');
      const result = await generateContentBatch(combined, source.source_type, profile);
      const posts = (result.posts || []).slice(0, 4);

      setStage('images');
      const withImages = await Promise.all(
        posts.map(async (post) => {
          try {
            const url = await generateBatchImage(post, profile);
            return { ...post, image_url: url };
          } catch {
            return { ...post, image_url: '' };
          }
        })
      );

      setStage('saving');
      const dayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      const items = withImages.map((p) => ({
        day: dayLabel,
        type: p.type,
        title: p.title,
        hook: p.hook,
        caption: p.caption,
        hashtags: p.hashtags || [],
        image_url: p.image_url,
        status: 'idea',
        generation_id: 'forge',
      }));
      const saved = await base44.entities.ContentItem.bulkCreate(items);
      let savedReel = null;
      if (result.reel) {
        const r = result.reel;
        savedReel = await base44.entities.ReelProject.create({
          title: r.title,
          idea: combined.slice(0, 240) || r.title,
          hook: r.hook,
          spoken_script: r.spoken_script,
          shot_list: r.shot_list || [],
          on_screen_text: r.on_screen_text || [],
          caption: r.caption,
          video_length: r.video_length,
          cta: r.cta,
          thumbnail_idea: r.thumbnail_idea,
          status: 'draft',
        });
      }

      setBatch({ title: result.title, posts: withImages, reel: savedReel });
      setForgeCount((count) => count + saved.length);
      setMessage('Batch ready — 4 posts and a reel script saved to your planner and Reel Builder.');
    } catch (error) {
      setMessage(error?.message || 'The forge hit a snag. Try again in a moment.');
    } finally {
      setStage('idle');
    }
  };

  if (profile === undefined || !subscription) {
    return <div className="text-muted-foreground">Loading the Content Forge…</div>;
  }

  const busy = stage !== 'idle';

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium"><Wand2 className="w-4 h-4" /> Content Forge</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Drop it in. Get a batch out.</h1>
          <p className="text-muted-foreground mt-2">Paste notes or upload a video/voice clip — we transcribe, then generate AI images, captions + hashtags, and a film-ready reel script.</p>
        </div>
        <Button asChild variant="outline"><Link to="/plans"><Crown className="w-4 h-4 mr-2" /> {PLAN_CATALOG[planKey].name}</Link></Button>
      </header>

      {!hasProfile ? (
        <Card className="text-center py-12">
          <Sparkles className="w-7 h-7 text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold mt-3">Set up your Brand Profile first</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">The Forge writes in your voice and visual style. Tell it who you are so every batch sounds like you.</p>
          <Button asChild className="mt-5 gradient-bg border-0"><Link to="/brand-brain">Build my Brand Brain <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-5">
          <Card>
            <h2 className="font-display text-xl font-bold">Your source material</h2>
            <p className="text-sm text-muted-foreground mt-1">No edits needed — raw is fine. More detail means a sharper batch.</p>
            {!canForge ? (
              <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center mt-5">
                <Crown className="w-7 h-7 text-primary mx-auto" />
                <h3 className="font-display text-lg font-bold mt-3">Forge allowance used</h3>
                <p className="text-sm text-muted-foreground mt-2">Your plan includes {PLAN_CATALOG[planKey].limits.forgePosts} forged posts. Upgrade for more batches.</p>
                <Button asChild className="mt-5 gradient-bg border-0"><Link to="/plans">Upgrade <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
              </div>
            ) : (
              <form onSubmit={run} className="space-y-3 mt-5">
                <div>
                  <Label>Source type</Label>
                  <select value={source.source_type} onChange={(e) => setSource({ ...source, source_type: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-secondary/40 px-3 text-sm">
                    <option value="text">Written notes / idea</option>
                    <option value="video">Video clip</option>
                    <option value="voice_note">Voice note</option>
                    <option value="podcast">Podcast clip</option>
                  </select>
                </div>
                <div>
                  <Label>Notes or transcript</Label>
                  <Textarea value={source.source_text} onChange={(e) => setSource({ ...source, source_text: e.target.value })} placeholder="Paste talking points, a blog draft, live notes — anything you want turned into posts…" className="mt-1 min-h-[180px] bg-secondary/40" />
                </div>
                <div>
                  <Label>Or upload a video / audio file</Label>
                  <button type="button" onClick={() => fileRef.current?.click()} className="mt-1 w-full rounded-xl border border-dashed border-border bg-secondary/30 hover:bg-secondary/50 transition-colors px-4 py-6 text-left flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0"><Upload className="w-5 h-5" /></div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{file ? file.name : 'Choose a file to transcribe'}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">mp4, m4a, mp3, wav, webm, ogg — we transcribe the audio. Convert .mov to .mp4 first.</div>
                    </div>
                  </button>
                  <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={handleFileChange} />
                  {file && <div className="text-xs text-muted-foreground mt-1.5">{fmtSize(file.size)}{file.size > MAX_FILE_BYTES ? ' · too large for transcription' : ''}</div>}
                  {fileWarning && <div className="text-xs text-destructive mt-1.5">{fileWarning}</div>}
                </div>
                <Button type="submit" disabled={busy} className="w-full gradient-bg border-0">
                  <Wand2 className={`w-4 h-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
                  {busy ? (STAGES[stage] || 'Working…') : 'Generate content batch'}
                </Button>
                {busy && (
                  <div className="space-y-2 mt-1">
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full gradient-bg transition-all" style={{ width: stage === 'saving' ? '92%' : stage === 'images' ? '70%' : stage === 'batch' ? '46%' : stage === 'transcribe' ? '26%' : '12%' }} /></div>
                    <p className="text-xs text-muted-foreground text-center">Images take ~30s × 4 — hang tight.</p>
                  </div>
                )}
              </form>
            )}
          </Card>

          <div className="space-y-4">
            {message && !batch && (
              <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">{message}</div>
            )}

            {!batch && !busy && (
              <Card className="text-center text-muted-foreground py-16">
                <Sparkles className="w-7 h-7 mx-auto mb-3 opacity-50" />
                Drop in your raw content and a full batch — 4 posts with AI images and captions, plus a reel script — lands here.
              </Card>
            )}

            {batch && (
              <>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4" /> {message}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{batch.posts.length}</span> posts saved to Content Planner
                  <span className="mx-1">·</span>
                  <Clapperboard className="w-4 h-4" /> reel script in Reel Builder
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {batch.posts.map((post, index) => (
                    <Card key={index} className="p-0 overflow-hidden">
                      <div className="aspect-square bg-secondary/40">
                        {post.image_url ? (
                          <Image src={post.image_url} fittingType="fill" className="w-full h-full" alt={post.title} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Image pending</div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] uppercase tracking-wide text-primary">{post.type}</span>
                          <button onClick={() => copyText(`post${index}-cap`, `${post.caption}\n\n${(post.hashtags || []).join(' ')}`)} className="text-muted-foreground hover:text-foreground">
                            {copied === `post${index}-cap` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <h3 className="font-display font-bold leading-tight">{post.title}</h3>
                        <p className="text-sm font-medium text-primary/90">{post.hook}</p>
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground line-clamp-5">{post.caption}</p>
                        {post.hashtags?.length > 0 && (
                          <p className="text-xs text-primary/70 flex flex-wrap gap-x-1.5 gap-y-1 line-clamp-3">
                            {post.hashtags.map((tag) => <span key={tag}>#{tag}</span>)}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                {batch.reel && (
                  <Card>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-primary text-sm font-medium"><Clapperboard className="w-4 h-4" /> Reel script</div>
                      <button onClick={() => copyText('reel', batch.reel.spoken_script)} className="text-muted-foreground hover:text-foreground">
                        {copied === 'reel' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <h3 className="font-display font-bold mt-2">{batch.reel.title}</h3>
                    <p className="text-sm text-primary/90 mt-1">{batch.reel.hook}</p>
                    <div className="rounded-xl border border-border bg-secondary/30 p-3 mt-3">
                      <div className="text-xs text-primary font-medium mb-1.5">Spoken script</div>
                      <p className="text-sm whitespace-pre-wrap">{batch.reel.spoken_script}</p>
                    </div>
                    {(batch.reel.shot_list?.length > 0 || batch.reel.on_screen_text?.length > 0) && (
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        {batch.reel.shot_list?.length > 0 && (
                          <div className="rounded-xl border border-border bg-secondary/30 p-3">
                            <div className="text-xs text-primary font-medium mb-1.5">Shot list</div>
                            {batch.reel.shot_list.map((line, i) => <div key={i} className="text-xs mt-0.5">• {line}</div>)}
                          </div>
                        )}
                        {batch.reel.on_screen_text?.length > 0 && (
                          <div className="rounded-xl border border-border bg-secondary/30 p-3">
                            <div className="text-xs text-primary font-medium mb-1.5">On-screen text</div>
                            {batch.reel.on_screen_text.map((line, i) => <div key={i} className="text-xs mt-0.5">• {line}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                    <Button asChild variant="outline" size="sm" className="mt-4"><Link to="/reel-builder"><ArrowRight className="w-4 h-4 mr-1" /> Open in Reel Builder</Link></Button>
                  </Card>
                )}
                <div className="flex justify-end">
                  <Button variant="ghost" onClick={() => { setBatch(null); setSource({ source_type: 'text', source_text: '' }); setFile(null); setMessage(''); }}>Forge another batch</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}