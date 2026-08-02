import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { analyzePerformance, generateTrendMatches, loadProfile, repurposeContent } from '@/lib/creatorAI';
import { hasPlan, loadSubscription, planAllows, PLAN_CATALOG } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  Crown,
  Instagram,
  Loader2,
  Mic,
  RefreshCw,
  Sparkles,
  Square,
  TrendingUp,
  Wand2,
} from 'lucide-react';

const tabs = [
  { id: 'performance', label: 'Performance', icon: BarChart3 },
  { id: 'trends', label: 'Trend Matcher', icon: TrendingUp },
  { id: 'repurpose', label: 'Repurpose', icon: Mic },
  { id: 'publishing', label: 'Publishing', icon: CalendarClock },
];

const emptyMetrics = {
  platform: 'instagram',
  content_title: '',
  post_url: '',
  views: '',
  likes: '',
  comments: '',
  shares: '',
  saves: '',
  completion_rate: '',
  followers_gained: '',
};

function Card({ children, className = '' }) {
  return <section className={`rounded-3xl border border-border bg-card/60 p-5 sm:p-6 ${className}`}>{children}</section>;
}

function UpgradeGate({ title, children, minimum = 'pro' }) {
  return (
    <div className="rounded-3xl border border-primary/30 bg-primary/5 p-8 text-center">
      <Crown className="w-7 h-7 text-primary mx-auto" />
      <h2 className="font-display text-xl font-bold mt-3">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">{children}</p>
      <Button asChild className="mt-5 gradient-bg border-0">
        <Link to="/plans">Unlock {PLAN_CATALOG[minimum].name} <ArrowRight className="w-4 h-4 ml-2" /></Link>
      </Button>
    </div>
  );
}

export default function GrowthLab() {
  const [tab, setTab] = useState('performance');
  const [profile, setProfile] = useState(undefined);
  const [subscription, setSubscription] = useState(null);
  const [performance, setPerformance] = useState([]);
  const [trends, setTrends] = useState([]);
  const [projects, setProjects] = useState([]);
  const [content, setContent] = useState([]);
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [source, setSource] = useState({ title: '', source_type: 'voice_note', source_text: '' });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const reload = async () => {
    const [p, s, perf, trendRows, repurposeRows, contentRows] = await Promise.all([
      loadProfile(),
      loadSubscription(),
      base44.entities.PostPerformance.list('-created_date', 50).catch(() => []),
      base44.entities.TrendMatch.list('-created_date', 30).catch(() => []),
      base44.entities.RepurposeProject.list('-created_date', 30).catch(() => []),
      base44.entities.ContentItem.list('publish_date', 100).catch(() => []),
    ]);
    setProfile(p);
    setSubscription(s);
    setPerformance(perf);
    setTrends(trendRows);
    setProjects(repurposeRows);
    setContent(contentRows);
  };

  useEffect(() => { reload(); }, []);

  const planKey = subscription?.plan_key || 'free';
  const canAnalyze = planAllows(planKey, 'performanceAnalyses', performance.length);
  const canRepurpose = planAllows(planKey, 'repurposeProjects', projects.length);
  const canUseTrends = hasPlan(planKey, 'pro');

  const submitPerformance = async (event) => {
    event.preventDefault();
    if (!profile || !canAnalyze) return;
    setBusy('performance');
    setMessage('');
    try {
      const normalized = Object.fromEntries(
        Object.entries(metrics).map(([key, value]) => [
          key,
          ['views', 'likes', 'comments', 'shares', 'saves', 'completion_rate', 'followers_gained'].includes(key)
            ? Number(value || 0)
            : value,
        ])
      );
      const analysis = await analyzePerformance(normalized, profile);
      const created = await base44.entities.PostPerformance.create({
        ...normalized,
        source: 'manual',
        posted_at: new Date().toISOString().slice(0, 10),
        performance_score: analysis.performance_score,
        summary: analysis.summary,
        wins: analysis.wins || [],
        fixes: analysis.fixes || [],
        next_test: analysis.next_test,
      });
      setPerformance((rows) => [created, ...rows]);
      setMetrics(emptyMetrics);
      setMessage('Performance lesson saved.');
    } catch (error) {
      setMessage(error?.message || 'Performance analysis could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const refreshTrends = async () => {
    if (!profile || !canUseTrends) return;
    setBusy('trends');
    setMessage('');
    try {
      const result = await generateTrendMatches(profile);
      const rows = (result.trends || []).slice(0, 6).map((item) => ({ ...item, status: 'new' }));
      const created = rows.length ? await base44.entities.TrendMatch.bulkCreate(rows) : [];
      setTrends((current) => [...created, ...current].slice(0, 30));
      setMessage('Fresh trend matches saved. Verify the linked trend before filming.');
    } catch (error) {
      setMessage(error?.message || 'Trend matching could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const submitRepurpose = async (event) => {
    event.preventDefault();
    if (!profile || !source.source_text.trim() || !canRepurpose) return;
    setBusy('repurpose');
    setMessage('');
    try {
      const result = await repurposeContent(source.source_text, source.source_type, profile);
      const created = await base44.entities.RepurposeProject.create({
        ...source,
        title: source.title || result.title || 'Repurposed idea',
        reel_script: result.reel_script,
        carousel_slides: result.carousel_slides || [],
        story_frames: result.story_frames || [],
        caption: result.caption,
        email: result.email,
        promo_post: result.promo_post,
        status: 'ready',
      });
      setProjects((rows) => [created, ...rows]);
      setSource({ title: '', source_type: 'voice_note', source_text: '' });
      setMessage('One idea is now a complete multi-channel campaign.');
    } catch (error) {
      setMessage(error?.message || 'Repurposing could not be completed.');
    } finally {
      setBusy('');
    }
  };

  const toggleDictation = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessage('Voice dictation is not supported in this browser. Paste a transcript instead.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript + ' ';
      }
      setSource((current) => ({ ...current, source_text: (current.source_text + ' ' + transcript).trim() }));
    };
    recognition.onerror = () => { setListening(false); setMessage('Dictation stopped. You can continue by typing.'); };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const copyText = async (key, value) => {
    await navigator.clipboard.writeText(value || '');
    setCopied(key);
    setTimeout(() => setCopied(''), 1600);
  };

  const saveSchedule = async (item, changes) => {
    const updated = await base44.entities.ContentItem.update(item.id, changes);
    setContent((rows) => rows.map((row) => row.id === item.id ? updated : row));
  };

  const scheduled = useMemo(() => content.filter((item) => item.publish_date || item.status === 'scheduled'), [content]);

  if (profile === undefined || !subscription) return <div className="text-muted-foreground">Loading growth tools…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium"><TrendingUp className="w-4 h-4" /> Growth Lab</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Know what worked. Create what wins next.</h1>
          <p className="text-muted-foreground mt-2">Performance coaching, trend matching, multi-format repurposing, and a real publishing queue.</p>
        </div>
        <Button asChild variant="outline"><Link to="/plans"><Crown className="w-4 h-4 mr-2" /> {PLAN_CATALOG[planKey].name}</Link></Button>
      </header>

      <Card className="border-sky-500/25 bg-sky-500/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 text-pink-300 flex items-center justify-center shrink-0"><Instagram className="w-5 h-5" /></div>
            <div>
              <div className="font-medium">Instagram Business sync</div>
              <p className="text-sm text-muted-foreground mt-1">Manual performance tracking works now. Secure one-click account sync is connection-ready and activates after Meta app approval.</p>
            </div>
          </div>
          <span className="text-xs font-medium rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 px-3 py-1.5 whitespace-nowrap">Meta approval required</span>
        </div>
      </Card>

      <div className="flex gap-1.5 p-1 rounded-2xl bg-secondary/40 border border-border overflow-x-auto w-fit max-w-full">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => { setTab(id); setMessage(''); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {message && <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">{message}</div>}

      {tab === 'performance' && (
        <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-5">
          <Card>
            <h2 className="font-display text-xl font-bold">Analyze a post</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter real post numbers and get a plain-language lesson.</p>
            {!canAnalyze ? <UpgradeGate title="Your analysis allowance is used">Upgrade for more post reviews and deeper iteration history.</UpgradeGate> : (
              <form onSubmit={submitPerformance} className="space-y-3 mt-5">
                <div><Label>Post title</Label><Input value={metrics.content_title} onChange={(e) => setMetrics({ ...metrics, content_title: e.target.value })} placeholder="Morning routine Reel" className="mt-1 bg-secondary/40" required /></div>
                <div><Label>Post URL (optional)</Label><Input value={metrics.post_url} onChange={(e) => setMetrics({ ...metrics, post_url: e.target.value })} placeholder="https://instagram.com/p/..." className="mt-1 bg-secondary/40" /></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['views', 'likes', 'comments', 'shares', 'saves', 'followers_gained'].map((key) => <div key={key}><Label className="capitalize">{key.replace('_', ' ')}</Label><Input type="number" min="0" value={metrics[key]} onChange={(e) => setMetrics({ ...metrics, [key]: e.target.value })} className="mt-1 bg-secondary/40" /></div>)}
                </div>
                <div><Label>Completion rate %</Label><Input type="number" min="0" max="100" step="0.1" value={metrics.completion_rate} onChange={(e) => setMetrics({ ...metrics, completion_rate: e.target.value })} className="mt-1 bg-secondary/40" /></div>
                <Button type="submit" disabled={busy === 'performance'} className="w-full gradient-bg border-0"><Wand2 className={`w-4 h-4 mr-2 ${busy === 'performance' ? 'animate-spin' : ''}`} /> Analyze performance</Button>
              </form>
            )}
          </Card>
          <div className="space-y-3">
            {performance.length === 0 ? <Card className="text-center text-muted-foreground py-12"><BarChart3 className="w-7 h-7 mx-auto mb-3 opacity-50" />Your performance lessons will appear here.</Card> : performance.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{item.platform} · {Number(item.views || 0).toLocaleString()} views</div><h3 className="font-display font-bold mt-1">{item.content_title}</h3></div><div className="text-2xl font-display font-bold text-primary">{item.performance_score || '—'}</div></div>
                <p className="text-sm mt-3">{item.summary}</p>
                <div className="grid sm:grid-cols-2 gap-3 mt-4"><div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3"><div className="text-xs font-medium text-emerald-300">Keep</div>{item.wins?.map((value, index) => <div key={index} className="text-xs mt-1">• {value}</div>)}</div><div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-3"><div className="text-xs font-medium text-amber-300">Change</div>{item.fixes?.map((value, index) => <div key={index} className="text-xs mt-1">• {value}</div>)}</div></div>
                {item.next_test && <div className="mt-3 text-sm"><span className="text-primary font-medium">Next test:</span> {item.next_test}</div>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'trends' && (!canUseTrends ? <UpgradeGate title="Trend Matcher is a Pro tool">Filter the noise and get trends adapted to your actual brand instead of generic trend lists.</UpgradeGate> : (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={refreshTrends} disabled={busy === 'trends'} className="gradient-bg border-0"><RefreshCw className={`w-4 h-4 mr-2 ${busy === 'trends' ? 'animate-spin' : ''}`} /> Find fresh matches</Button></div>
          {trends.length === 0 ? <Card className="text-center text-muted-foreground py-12">Run Trend Matcher to find timely formats and angles that fit your brand.</Card> : <div className="grid md:grid-cols-2 gap-4">{trends.map((trend) => (
            <Card key={trend.id}>
              <div className="flex items-start justify-between gap-3"><div><span className="text-[11px] uppercase tracking-wide text-muted-foreground">{trend.platform} · {trend.urgency?.replace('_', ' ')}</span><h3 className="font-display font-bold mt-1">{trend.trend_name}</h3></div><span className="text-lg font-bold text-primary">{trend.fit_score}% fit</span></div>
              <p className="text-sm text-muted-foreground mt-3">{trend.fit_reason}</p>
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 mt-3"><div className="text-xs text-primary font-medium">Original angle</div><div className="text-sm mt-1">{trend.original_angle}</div></div>
              {trend.hook && <div className="text-sm mt-3"><span className="font-medium">Hook:</span> {trend.hook}</div>}
              {trend.source_url && <a href={trend.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-3 inline-block">Verify source →</a>}
            </Card>
          ))}</div>}
        </div>
      ))}

      {tab === 'repurpose' && (
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-5">
          <Card>
            <h2 className="font-display text-xl font-bold">One idea → six assets</h2>
            <p className="text-sm text-muted-foreground mt-1">Speak or paste a transcript. Creator Command keeps your voice intact.</p>
            {!canRepurpose ? <UpgradeGate title="Your repurposing allowance is used">Upgrade to turn more voice notes and long-form ideas into campaigns.</UpgradeGate> : (
              <form onSubmit={submitRepurpose} className="space-y-3 mt-5">
                <div><Label>Project title</Label><Input value={source.title} onChange={(e) => setSource({ ...source, title: e.target.value })} placeholder="What I learned launching my offer" className="mt-1 bg-secondary/40" /></div>
                <div><Label>Source type</Label><select value={source.source_type} onChange={(e) => setSource({ ...source, source_type: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-secondary/40 px-3 text-sm"><option value="voice_note">Voice note</option><option value="text">Written idea</option><option value="video">Video transcript</option><option value="podcast">Podcast transcript</option></select></div>
                <div><div className="flex items-center justify-between"><Label>Transcript or idea</Label><Button type="button" size="sm" variant={listening ? 'destructive' : 'outline'} onClick={toggleDictation}>{listening ? <Square className="w-3.5 h-3.5 mr-1" /> : <Mic className="w-3.5 h-3.5 mr-1" />}{listening ? 'Stop' : 'Dictate'}</Button></div><Textarea value={source.source_text} onChange={(e) => setSource({ ...source, source_text: e.target.value })} placeholder="Talk naturally for one or two minutes…" className="mt-2 min-h-[220px] bg-secondary/40" required /></div>
                <Button type="submit" disabled={busy === 'repurpose'} className="w-full gradient-bg border-0"><Sparkles className={`w-4 h-4 mr-2 ${busy === 'repurpose' ? 'animate-spin' : ''}`} /> Build campaign</Button>
              </form>
            )}
          </Card>
          <div className="space-y-4">
            {projects.length === 0 ? <Card className="text-center text-muted-foreground py-12">Your repurposed campaigns will appear here.</Card> : projects.map((project) => (
              <Card key={project.id}>
                <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{project.source_type?.replace('_', ' ')}</div><h3 className="font-display font-bold mt-1">{project.title}</h3></div><span className="text-xs rounded-full bg-emerald-500/10 text-emerald-300 px-2.5 py-1">Ready</span></div>
                <div className="space-y-3 mt-4">
                  {[['Reel script', project.reel_script], ['Caption', project.caption], ['Email', project.email], ['Promo post', project.promo_post]].map(([label, value]) => value && <div key={label} className="rounded-xl border border-border bg-secondary/30 p-3"><div className="flex items-center justify-between"><div className="text-xs text-primary font-medium">{label}</div><button onClick={() => copyText(project.id + label, value)} className="text-muted-foreground hover:text-foreground">{copied === project.id + label ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button></div><p className="text-sm whitespace-pre-wrap mt-2 line-clamp-6">{value}</p></div>)}
                </div>
                {project.carousel_slides?.length > 0 && <div className="mt-3 text-sm"><span className="font-medium">Carousel:</span> {project.carousel_slides.length} slides · <span className="font-medium">Stories:</span> {project.story_frames?.length || 0} frames</div>}
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'publishing' && (
        <div className="space-y-4">
          <Card><div className="flex gap-3"><CalendarClock className="w-5 h-5 text-primary shrink-0" /><div><h2 className="font-display font-bold">Approval and scheduling queue</h2><p className="text-sm text-muted-foreground mt-1">Set the platform, date, time, and approval status. Direct Instagram publishing activates with the secure Meta connection.</p></div></div></Card>
          {content.length === 0 ? <Card className="text-center text-muted-foreground py-12">Generate a content week first, then schedule it here.</Card> : content.map((item) => (
            <Card key={item.id}>
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex-1 min-w-0"><div className="text-xs uppercase tracking-wide text-muted-foreground">{item.type} · {item.day}</div><h3 className="font-medium mt-1">{item.title}</h3><p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.hook}</p></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:w-[610px]">
                  <select aria-label="Platform" value={item.platform || 'instagram'} onChange={(e) => saveSchedule(item, { platform: e.target.value })} className="h-10 rounded-md border border-input bg-secondary/40 px-2 text-sm"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="other">Other</option></select>
                  <Input aria-label="Publish date" type="date" value={item.publish_date || ''} onChange={(e) => saveSchedule(item, { publish_date: e.target.value })} className="bg-secondary/40" />
                  <Input aria-label="Publish time" type="time" value={item.scheduled_time || ''} onChange={(e) => saveSchedule(item, { scheduled_time: e.target.value })} className="bg-secondary/40" />
                  <select aria-label="Approval status" value={item.approval_status || 'draft'} onChange={(e) => saveSchedule(item, { approval_status: e.target.value })} className="h-10 rounded-md border border-input bg-secondary/40 px-2 text-sm"><option value="draft">Draft</option><option value="review">In review</option><option value="approved">Approved</option></select>
                </div>
                <Button variant={item.status === 'scheduled' ? 'default' : 'outline'} onClick={() => saveSchedule(item, { status: item.status === 'scheduled' ? 'idea' : 'scheduled' })}>{item.status === 'scheduled' ? <Check className="w-4 h-4 mr-1" /> : <CalendarClock className="w-4 h-4 mr-1" />}{item.status === 'scheduled' ? 'Scheduled' : 'Schedule'}</Button>
              </div>
            </Card>
          ))}
          {scheduled.length > 0 && <div className="text-xs text-muted-foreground text-right">{scheduled.length} items have a publishing date or scheduled status.</div>}
        </div>
      )}
    </div>
  );
}
