import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { loadProfile, twinReply } from '@/lib/creatorAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTIONS = [
  'Write a caption for a behind-the-scenes Reel',
  'Brainstorm 5 carousel ideas for my niche',
  'Draft a brand pitch to a skincare company',
  'How do I monetize my audience this month?',
];

export default function CreatorTwin() {
  const [profile, setProfile] = useState(undefined);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState('main');
  const scrollRef = useRef(null);

  useEffect(() => {
    loadProfile().then((p) => {
      setProfile(p);
      if (p) setConversationId(`twin_${p.id}`);
    });
  }, []);

  useEffect(() => {
    if (!conversationId || conversationId === 'main') return;
    base44.entities.TwinMessage.filter({ conversation_id: conversationId }, 'created_date', 200)
      .then(setMessages)
      .catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || !profile || loading) return;
    setInput('');
    const userMsg = { conversation_id: conversationId, role: 'user', content };
    const savedUser = await base44.entities.TwinMessage.create(userMsg);
    setMessages((prev) => [...prev, savedUser]);
    setLoading(true);
    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const reply = await twinReply(history, profile);
      const savedAssistant = await base44.entities.TwinMessage.create({
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
      });
      setMessages((prev) => [...prev, savedAssistant]);
    } finally {
      setLoading(false);
    }
  };

  if (profile === undefined) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <header className="text-center pt-2">
        <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto card-glow mb-4">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold">Creator <span className="gradient-text">Twin</span></h1>
        <p className="text-muted-foreground mt-2">
          Your private AI — content strategist, brand manager & monetization coach, trained on your brand.
        </p>
      </header>

      {!profile ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-muted-foreground">Train your Brand Brain first so the Twin writes like you.</p>
          <Button asChild className="mt-4 gradient-bg border-0"><Link to="/brand-brain">Set up Brand Brain <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="rounded-3xl border border-border bg-card/60 p-4 sm:p-6 h-[460px] overflow-y-auto space-y-4">
            {messages.length === 0 && !loading && (
              <div className="text-center py-10">
                <Sparkles className="w-6 h-6 text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Ask me anything — I write in your voice, plan content, and find money.</p>
                <div className="grid sm:grid-cols-2 gap-2 mt-6 max-w-lg mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-sm px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 hover:border-primary/40 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/60 text-foreground'
                  }`}
                >
                  {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary/60 rounded-2xl px-4 py-3 flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your Twin…"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="bg-secondary/40 min-h-[52px] max-h-40 resize-none"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="gradient-bg border-0 hover:opacity-90 px-4">
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </div>
  );
}