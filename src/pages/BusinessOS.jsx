import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { buildDigitalProduct, draftLeadReply, generateAgencyPlan, loadProfile } from '@/lib/creatorAI';
import { hasPlan, loadSubscription, planAllows, PLAN_CATALOG } from '@/lib/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowRight,
  Building2,
  Check,
  Copy,
  Crown,
  DollarSign,
  ExternalLink,
  Mail,
  MessageSquareText,
  PackageOpen,
  Sparkles,
  Users,
  Wand2,
} from 'lucide-react';

const tabs = [
  { id: 'inbox', label: 'Lead Inbox', icon: MessageSquareText },
  { id: 'products', label: 'Digital Products', icon: PackageOpen },
  { id: 'agency', label: 'Agency', icon: Building2 },
];

function Card({ children, className = '' }) {
  return <section className={`rounded-3xl border border-border bg-card/60 p-5 sm:p-6 ${className}`}>{children}</section>;
}

function UpgradeGate({ plan = 'pro', title, text }) {
  return (
    <div className="rounded-3xl border border-primary/30 bg-primary/5 p-9 text-center">
      <Crown className="w-7 h-7 text-primary mx-auto" />
      <h2 className="font-display text-xl font-bold mt-3">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">{text}</p>
      <Button asChild className="mt-5 gradient-bg border-0"><Link to="/plans">Unlock {PLAN_CATALOG[plan].name} <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
    </div>
  );
}

export default function BusinessOS() {
  const [tab, setTab] = useState('inbox');
  const [profile, setProfile] = useState(undefined);
  const [subscription, setSubscription] = useState(null);
  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [leadForm, setLeadForm] = useState({ contact_name: '', contact_handle: '', contact_email: '', platform: 'instagram', lead_type: 'brand', incoming_message: '', estimated_value: '' });
  const [productForm, setProductForm] = useState({ title: '', product_type: 'guide', audience: '', promise: '', price: '' });
  const [clientForm, setClientForm] = useState({ client_name: '', contact_email: '', brand_name: '', niche: '', goals: '', monthly_fee: '', next_review: '' });
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');

  const reload = async () => {
    const [p, s, leadRows, productRows, clientRows] = await Promise.all([
      loadProfile(),
      loadSubscription(),
      base44.entities.LeadConversation.list('-updated_date', 100).catch(() => []),
      base44.entities.DigitalProduct.list('-updated_date', 50).catch(() => []),
      base44.entities.AgencyClient.list('-updated_date', 50).catch(() => []),
    ]);
    setProfile(p);
    setSubscription(s);
    setLeads(leadRows);
    setProducts(productRows);
    setClients(clientRows);
  };

  useEffect(() => { reload(); }, []);

  const planKey = subscription?.plan_key || 'free';
  const canAddLead = planAllows(planKey, 'businessLeads', leads.length);
  const canBuildProducts = hasPlan(planKey, 'pro');
  const canUseAgency = hasPlan(planKey, 'studio');

  const addLead = async (event) => {
    event.preventDefault();
    if (!canAddLead) return;
    setBusy('lead-add');
    try {
      const created = await base44.entities.LeadConversation.create({ ...leadForm, estimated_value: Number(leadForm.estimated_value || 0), stage: 'new' });
      setLeads((rows) => [created, ...rows]);
      setLeadForm({ contact_name: '', contact_handle: '', contact_email: '', platform: 'instagram', lead_type: 'brand', incoming_message: '', estimated_value: '' });
      setMessage('Lead added. Generate a reply when you are ready.');
    } catch (error) {
      setMessage(error?.message || 'Lead could not be saved.');
    } finally { setBusy(''); }
  };

  const createReply = async (lead) => {
    setBusy('lead-' + lead.id);
    try {
      const result = await draftLeadReply(profile, lead);
      const updated = await base44.entities.LeadConversation.update(lead.id, {
        ai_reply: result.reply,
        follow_up: result.follow_up,
        lead_type: result.classification || lead.lead_type,
        stage: 'reply_ready',
        estimated_value: lead.estimated_value || Number(result.estimated_value || 0),
      });
      setLeads((rows) => rows.map((row) => row.id === lead.id ? updated : row));
    } catch (error) {
      setMessage(error?.message || 'Reply could not be generated.');
    } finally { setBusy(''); }
  };

  const buildProduct = async (event) => {
    event.preventDefault();
    if (!canBuildProducts) return;
    setBusy('product');
    try {
      const input = { ...productForm, price: Number(productForm.price || 0) };
      const result = await buildDigitalProduct(profile, input);
      const created = await base44.entities.DigitalProduct.create({
        ...input,
        title: result.title || input.title,
        promise: result.promise || input.promise,
        outline: result.outline || [],
        landing_headline: result.landing_headline,
        landing_copy: result.landing_copy,
        launch_plan: result.launch_plan || [],
        status: 'building',
      });
      setProducts((rows) => [created, ...rows]);
      setProductForm({ title: '', product_type: 'guide', audience: '', promise: '', price: '' });
      setMessage('Your product blueprint and launch campaign are ready.');
    } catch (error) {
      setMessage(error?.message || 'Product blueprint could not be generated.');
    } finally { setBusy(''); }
  };

  const addClient = async (event) => {
    event.preventDefault();
    if (!canUseAgency) return;
    setBusy('client');
    try {
      const created = await base44.entities.AgencyClient.create({ ...clientForm, monthly_fee: Number(clientForm.monthly_fee || 0), status: 'onboarding' });
      setClients((rows) => [created, ...rows]);
      setClientForm({ client_name: '', contact_email: '', brand_name: '', niche: '', goals: '', monthly_fee: '', next_review: '' });
      setMessage('Client workspace added.');
    } catch (error) {
      setMessage(error?.message || 'Client could not be added.');
    } finally { setBusy(''); }
  };

  const buildClientPlan = async (client) => {
    setBusy('client-' + client.id);
    try {
      const result = await generateAgencyPlan(client);
      const updated = await base44.entities.AgencyClient.update(client.id, { monthly_plan: result.monthly_plan, status: 'active' });
      setClients((rows) => rows.map((row) => row.id === client.id ? updated : row));
    } catch (error) {
      setMessage(error?.message || 'Client plan could not be generated.');
    } finally { setBusy(''); }
  };

  const updateProduct = async (product, changes) => {
    const updated = await base44.entities.DigitalProduct.update(product.id, changes);
    setProducts((rows) => rows.map((row) => row.id === product.id ? updated : row));
  };

  const copyText = async (key, value) => {
    await navigator.clipboard.writeText(value || '');
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const pipelineValue = useMemo(() => leads.filter((lead) => !['won', 'closed'].includes(lead.stage)).reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0), [leads]);
  const agencyRevenue = useMemo(() => clients.filter((client) => client.status === 'active').reduce((sum, client) => sum + Number(client.monthly_fee || 0), 0), [clients]);

  if (profile === undefined || !subscription) return <div className="text-muted-foreground">Loading business tools…</div>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div><div className="flex items-center gap-2 text-primary text-sm font-medium"><DollarSign className="w-4 h-4" /> Business OS</div><h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">Turn attention into owned revenue.</h1><p className="text-muted-foreground mt-2">Qualify inbound opportunities, build products, and manage creator clients from one place.</p></div>
        <Button asChild variant="outline"><Link to="/plans"><Crown className="w-4 h-4 mr-2" /> {PLAN_CATALOG[planKey].name}</Link></Button>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Card><div className="text-xs text-muted-foreground">Open leads</div><div className="font-display text-2xl font-bold mt-1">{leads.filter((lead) => !['won', 'closed'].includes(lead.stage)).length}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Pipeline value</div><div className="font-display text-2xl font-bold mt-1">${pipelineValue.toLocaleString()}</div></Card>
        <Card><div className="text-xs text-muted-foreground">Agency MRR</div><div className="font-display text-2xl font-bold mt-1">${agencyRevenue.toLocaleString()}</div></Card>
      </div>

      <div className="flex gap-1.5 p-1 rounded-2xl bg-secondary/40 border border-border overflow-x-auto w-fit max-w-full">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); setMessage(''); }} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}><Icon className="w-4 h-4" /> {label}</button>)}
      </div>
      {message && <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">{message}</div>}

      {tab === 'inbox' && (
        <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-5">
          <Card>
            <h2 className="font-display text-xl font-bold">Add an opportunity</h2>
            <p className="text-sm text-muted-foreground mt-1">Paste a DM or inquiry. The AI qualifies it and drafts your response.</p>
            {!canAddLead ? <UpgradeGate title="Your lead allowance is used" text="Upgrade to keep every business inquiry organized and moving." /> : <form onSubmit={addLead} className="space-y-3 mt-5">
              <div className="grid grid-cols-2 gap-3"><div><Label>Name</Label><Input value={leadForm.contact_name} onChange={(e) => setLeadForm({ ...leadForm, contact_name: e.target.value })} className="mt-1 bg-secondary/40" required /></div><div><Label>Handle</Label><Input value={leadForm.contact_handle} onChange={(e) => setLeadForm({ ...leadForm, contact_handle: e.target.value })} placeholder="@brand" className="mt-1 bg-secondary/40" /></div></div>
              <div><Label>Email (optional)</Label><Input type="email" value={leadForm.contact_email} onChange={(e) => setLeadForm({ ...leadForm, contact_email: e.target.value })} className="mt-1 bg-secondary/40" /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Type</Label><select value={leadForm.lead_type} onChange={(e) => setLeadForm({ ...leadForm, lead_type: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-secondary/40 px-3 text-sm"><option value="brand">Brand</option><option value="customer">Customer</option><option value="collaboration">Collaboration</option><option value="fan">Fan</option><option value="spam">Spam</option></select></div><div><Label>Potential $</Label><Input type="number" min="0" value={leadForm.estimated_value} onChange={(e) => setLeadForm({ ...leadForm, estimated_value: e.target.value })} className="mt-1 bg-secondary/40" /></div></div>
              <div><Label>Incoming message</Label><Textarea value={leadForm.incoming_message} onChange={(e) => setLeadForm({ ...leadForm, incoming_message: e.target.value })} className="mt-1 min-h-[130px] bg-secondary/40" required /></div>
              <Button type="submit" disabled={busy === 'lead-add'} className="w-full gradient-bg border-0"><MessageSquareText className="w-4 h-4 mr-2" /> Save opportunity</Button>
            </form>}
          </Card>
          <div className="space-y-4">
            {leads.length === 0 ? <Card className="text-center text-muted-foreground py-12">Your qualified inbox will appear here.</Card> : leads.map((lead) => <Card key={lead.id}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{lead.platform} · {lead.lead_type}</div><h3 className="font-display font-bold mt-1">{lead.contact_name} {lead.contact_handle}</h3></div><div className="text-right"><span className="text-xs rounded-full bg-primary/10 text-primary px-2.5 py-1">{lead.stage?.replace('_', ' ')}</span>{lead.estimated_value > 0 && <div className="text-sm font-bold mt-2">${Number(lead.estimated_value).toLocaleString()}</div>}</div></div>
              <p className="text-sm text-muted-foreground mt-3 border-l-2 border-border pl-3">{lead.incoming_message}</p>
              {lead.ai_reply ? <div className="rounded-xl bg-secondary/35 border border-border p-3 mt-4"><div className="flex items-center justify-between"><span className="text-xs text-primary font-medium">Suggested reply</span><button onClick={() => copyText(lead.id, lead.ai_reply)}>{copied === lead.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div><p className="text-sm whitespace-pre-wrap mt-2">{lead.ai_reply}</p>{lead.follow_up && <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-2">Follow-up: {lead.follow_up}</p>}</div> : <Button variant="outline" size="sm" className="mt-4" onClick={() => createReply(lead)} disabled={busy === 'lead-' + lead.id}><Wand2 className={`w-4 h-4 mr-2 ${busy === 'lead-' + lead.id ? 'animate-spin' : ''}`} /> Generate reply</Button>}
              {lead.contact_email && lead.ai_reply && <a className="inline-flex items-center text-xs text-primary hover:underline mt-3" href={`mailto:${lead.contact_email}?subject=${encodeURIComponent('Following up')}&body=${encodeURIComponent(lead.ai_reply)}`}><Mail className="w-3.5 h-3.5 mr-1" /> Open email</a>}
            </Card>)}
          </div>
        </div>
      )}

      {tab === 'products' && (!canBuildProducts ? <UpgradeGate title="Digital Product Builder is a Pro tool" text="Turn your expertise into guides, courses, templates, consultations, and memberships." /> : (
        <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-5">
          <Card>
            <h2 className="font-display text-xl font-bold">Build a sellable offer</h2><p className="text-sm text-muted-foreground mt-1">Get the product structure, sales copy, and seven-step launch plan.</p>
            <form onSubmit={buildProduct} className="space-y-3 mt-5">
              <div><Label>Product idea</Label><Input value={productForm.title} onChange={(e) => setProductForm({ ...productForm, title: e.target.value })} placeholder="30-Day Creator Consistency Guide" className="mt-1 bg-secondary/40" required /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Format</Label><select value={productForm.product_type} onChange={(e) => setProductForm({ ...productForm, product_type: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-secondary/40 px-3 text-sm"><option value="guide">Guide</option><option value="course">Course</option><option value="membership">Membership</option><option value="consultation">Consultation</option><option value="template">Template</option><option value="community">Community</option></select></div><div><Label>Price $</Label><Input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="mt-1 bg-secondary/40" /></div></div>
              <div><Label>Audience</Label><Input value={productForm.audience} onChange={(e) => setProductForm({ ...productForm, audience: e.target.value })} placeholder={profile?.audience_description || 'Who is this for?'} className="mt-1 bg-secondary/40" /></div>
              <div><Label>Transformation</Label><Textarea value={productForm.promise} onChange={(e) => setProductForm({ ...productForm, promise: e.target.value })} placeholder="What will buyers achieve?" className="mt-1 min-h-[90px] bg-secondary/40" /></div>
              <Button type="submit" disabled={busy === 'product'} className="w-full gradient-bg border-0"><Sparkles className={`w-4 h-4 mr-2 ${busy === 'product' ? 'animate-spin' : ''}`} /> Build product</Button>
            </form>
          </Card>
          <div className="space-y-4">
            {products.length === 0 ? <Card className="text-center text-muted-foreground py-12">Your sellable product blueprints will appear here.</Card> : products.map((product) => <Card key={product.id}>
              <div className="flex items-start justify-between"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{product.product_type} · {product.status}</div><h3 className="font-display text-xl font-bold mt-1">{product.title}</h3></div><div className="text-2xl font-bold text-primary">${Number(product.price || 0).toLocaleString()}</div></div>
              <p className="text-sm mt-3">{product.promise}</p>
              {product.landing_headline && <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 mt-4"><div className="text-xs text-primary font-medium">Landing page headline</div><div className="font-medium mt-1">{product.landing_headline}</div><p className="text-sm text-muted-foreground mt-2">{product.landing_copy}</p></div>}
              <div className="grid sm:grid-cols-2 gap-4 mt-4"><div><div className="text-xs font-medium text-muted-foreground">Product outline</div>{product.outline?.map((step, index) => <div key={index} className="text-sm mt-1">{index + 1}. {step}</div>)}</div><div><div className="text-xs font-medium text-muted-foreground">Launch plan</div>{product.launch_plan?.map((step, index) => <div key={index} className="text-sm mt-1">{index + 1}. {step}</div>)}</div></div>
              <div className="flex flex-col sm:flex-row gap-2 mt-5"><Input value={product.checkout_url || ''} onChange={(e) => setProducts((rows) => rows.map((row) => row.id === product.id ? { ...row, checkout_url: e.target.value } : row))} onBlur={(e) => updateProduct(product, { checkout_url: e.target.value })} placeholder="Add your checkout link" className="bg-secondary/40" />{product.checkout_url && <Button asChild variant="outline"><a href={product.checkout_url} target="_blank" rel="noreferrer">Open <ExternalLink className="w-4 h-4 ml-2" /></a></Button>}</div>
            </Card>)}
          </div>
        </div>
      ))}

      {tab === 'agency' && (!canUseAgency ? <UpgradeGate plan="studio" title="Agency workspace is a Studio tool" text="Manage multiple creator clients, monthly retainers, goals, reviews, and AI-generated action plans." /> : (
        <div className="grid lg:grid-cols-[0.75fr_1.25fr] gap-5">
          <Card>
            <h2 className="font-display text-xl font-bold">Add a creator client</h2><p className="text-sm text-muted-foreground mt-1">Track retainers and generate a focused monthly growth plan.</p>
            <form onSubmit={addClient} className="space-y-3 mt-5">
              <div className="grid grid-cols-2 gap-3"><div><Label>Client name</Label><Input value={clientForm.client_name} onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })} className="mt-1 bg-secondary/40" required /></div><div><Label>Brand</Label><Input value={clientForm.brand_name} onChange={(e) => setClientForm({ ...clientForm, brand_name: e.target.value })} className="mt-1 bg-secondary/40" required /></div></div>
              <div><Label>Email</Label><Input type="email" value={clientForm.contact_email} onChange={(e) => setClientForm({ ...clientForm, contact_email: e.target.value })} className="mt-1 bg-secondary/40" /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label>Niche</Label><Input value={clientForm.niche} onChange={(e) => setClientForm({ ...clientForm, niche: e.target.value })} className="mt-1 bg-secondary/40" /></div><div><Label>Monthly fee $</Label><Input type="number" min="0" value={clientForm.monthly_fee} onChange={(e) => setClientForm({ ...clientForm, monthly_fee: e.target.value })} className="mt-1 bg-secondary/40" /></div></div>
              <div><Label>Goals</Label><Textarea value={clientForm.goals} onChange={(e) => setClientForm({ ...clientForm, goals: e.target.value })} className="mt-1 min-h-[100px] bg-secondary/40" /></div>
              <div><Label>Next review</Label><Input type="date" value={clientForm.next_review} onChange={(e) => setClientForm({ ...clientForm, next_review: e.target.value })} className="mt-1 bg-secondary/40" /></div>
              <Button type="submit" disabled={busy === 'client'} className="w-full gradient-bg border-0"><Users className="w-4 h-4 mr-2" /> Add client</Button>
            </form>
          </Card>
          <div className="space-y-4">
            {clients.length === 0 ? <Card className="text-center text-muted-foreground py-12">Your agency clients will appear here.</Card> : clients.map((client) => <Card key={client.id}>
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs uppercase tracking-wide text-muted-foreground">{client.status} · {client.niche}</div><h3 className="font-display font-bold mt-1">{client.brand_name}</h3><div className="text-sm text-muted-foreground">{client.client_name}</div></div><div className="text-right"><div className="text-lg font-bold text-primary">${Number(client.monthly_fee || 0).toLocaleString()}/mo</div>{client.next_review && <div className="text-xs text-muted-foreground mt-1">Review {client.next_review}</div>}</div></div>
              <p className="text-sm mt-3">{client.goals}</p>
              {client.monthly_plan ? <div className="rounded-xl bg-secondary/35 border border-border p-3 mt-4"><div className="flex items-center justify-between"><span className="text-xs text-primary font-medium">Monthly action plan</span><button onClick={() => copyText(client.id, client.monthly_plan)}>{copied === client.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</button></div><p className="text-sm whitespace-pre-wrap mt-2">{client.monthly_plan}</p></div> : <Button variant="outline" size="sm" className="mt-4" onClick={() => buildClientPlan(client)} disabled={busy === 'client-' + client.id}><Wand2 className={`w-4 h-4 mr-2 ${busy === 'client-' + client.id ? 'animate-spin' : ''}`} /> Generate monthly plan</Button>}
            </Card>)}
          </div>
        </div>
      ))}
    </div>
  );
}
