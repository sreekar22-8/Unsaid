import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EmotionTag = {
  emotion: string;
  intensity: number; // 0–1
};

type LocalChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  emotionTags?: EmotionTag[];
};

// ---------------------------------------------------------------------------
// Emotion badge colour palette — curated, not garish
// Maps common emotion words to a soft hue. Falls back to a neutral sage.
// ---------------------------------------------------------------------------

const EMOTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  // warm / activating
  anxiety:     { bg: 'bg-[#f5e6d8]/70 dark:bg-[#3d2a1a]/60',  text: 'text-[#8a4a1e] dark:text-[#e8a87c]', dot: 'bg-[#c06a35]' },
  fear:        { bg: 'bg-[#f5e6d8]/70 dark:bg-[#3d2a1a]/60',  text: 'text-[#8a4a1e] dark:text-[#e8a87c]', dot: 'bg-[#c06a35]' },
  anger:       { bg: 'bg-[#fde8e8]/70 dark:bg-[#3b1818]/60',  text: 'text-[#8b2020] dark:text-[#f09090]', dot: 'bg-[#c03535]' },
  frustrated:  { bg: 'bg-[#fde8e8]/70 dark:bg-[#3b1818]/60',  text: 'text-[#8b2020] dark:text-[#f09090]', dot: 'bg-[#c03535]' },
  // cool / withdrawing
  sadness:     { bg: 'bg-[#dce9f5]/70 dark:bg-[#182a3b]/60',  text: 'text-[#1e4a72] dark:text-[#85b8e8]', dot: 'bg-[#3572a8]' },
  sad:         { bg: 'bg-[#dce9f5]/70 dark:bg-[#182a3b]/60',  text: 'text-[#1e4a72] dark:text-[#85b8e8]', dot: 'bg-[#3572a8]' },
  grief:       { bg: 'bg-[#dce9f5]/70 dark:bg-[#182a3b]/60',  text: 'text-[#1e4a72] dark:text-[#85b8e8]', dot: 'bg-[#3572a8]' },
  loneliness:  { bg: 'bg-[#e0e5f5]/70 dark:bg-[#1a1f3b]/60',  text: 'text-[#2a3272] dark:text-[#9aa4e8]', dot: 'bg-[#4555c0]' },
  // gentle / hopeful
  hopeful:     { bg: 'bg-[#d9f0e8]/70 dark:bg-[#0f2e22]/60',  text: 'text-[#1a5e3e] dark:text-[#72c8a0]', dot: 'bg-[#2e8f62]' },
  relief:      { bg: 'bg-[#d9f0e8]/70 dark:bg-[#0f2e22]/60',  text: 'text-[#1a5e3e] dark:text-[#72c8a0]', dot: 'bg-[#2e8f62]' },
  gratitude:   { bg: 'bg-[#d9f0e8]/70 dark:bg-[#0f2e22]/60',  text: 'text-[#1a5e3e] dark:text-[#72c8a0]', dot: 'bg-[#2e8f62]' },
  // warm muted
  shame:       { bg: 'bg-[#f0e0f0]/70 dark:bg-[#2a182a]/60',  text: 'text-[#622062] dark:text-[#c88ac8]', dot: 'bg-[#9a359a]' },
  guilt:       { bg: 'bg-[#f0e0f0]/70 dark:bg-[#2a182a]/60',  text: 'text-[#622062] dark:text-[#c88ac8]', dot: 'bg-[#9a359a]' },
  // neutral
  uncertain:   { bg: 'bg-[#e8e5df]/70 dark:bg-[#28251f]/60',  text: 'text-[#5a5040] dark:text-[#b8a888]', dot: 'bg-[#8a7a60]' },
  confused:    { bg: 'bg-[#e8e5df]/70 dark:bg-[#28251f]/60',  text: 'text-[#5a5040] dark:text-[#b8a888]', dot: 'bg-[#8a7a60]' },
};

const FALLBACK_COLOR = { bg: 'bg-muted/50', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' };

function emotionColor(emotion: string) {
  const key = emotion.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(EMOTION_COLORS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return FALLBACK_COLOR;
}

// ---------------------------------------------------------------------------
// EmotionBadge
// ---------------------------------------------------------------------------

function EmotionBadge({ tag }: { tag: EmotionTag }) {
  const c = emotionColor(tag.emotion);
  const pct = Math.round(tag.intensity * 100);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none tracking-wide animate-rise ${c.bg} ${c.text}`}
      title={`${tag.emotion} · ${pct}% intensity`}
    >
      <span className={`size-1.5 shrink-0 rounded-full ${c.dot}`} aria-hidden />
      {tag.emotion}
      <span className="opacity-55">{tag.intensity.toFixed(1)}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Lightweight local emotion classifier (regex heuristic)
// Replace the return value of this function with real API data once the
// backend emotion_tags pipeline is wired up.
// ---------------------------------------------------------------------------

function detectLocalEmotions(text: string): EmotionTag[] {
  const lower = text.toLowerCase();
  const tags: EmotionTag[] = [];

  const rules: [RegExp, string][] = [
    [/(angry|mad|furious|frustrat|irritat)/, 'anger'],
    [/(anxious|worry|worried|nervous|overwhelm|panic|scared)/, 'anxiety'],
    [/(sad|lonely|empty|miss|cry|grief|heartbreak)/, 'sadness'],
    [/(alone|isolat|loneli)/, 'loneliness'],
    [/(shame|ashamed|embarrass)/, 'shame'],
    [/(guilty|guilt|regret)/, 'guilt'],
    [/(happy|glad|excited|relief|grateful|hopeful|good)/, 'hopeful'],
    [/(confus|unsure|uncertain|lost)/, 'confused'],
  ];

  for (const [re, label] of rules) {
    if (re.test(lower)) {
      const wordCount = (lower.match(re) ?? []).length;
      const intensity = Math.min(0.95, 0.45 + wordCount * 0.15 + lower.length / 600);
      tags.push({ emotion: label, intensity: parseFloat(intensity.toFixed(2)) });
    }
    if (tags.length >= 3) break;
  }

  if (tags.length === 0) {
    tags.push({ emotion: 'uncertain', intensity: parseFloat((0.3 + lower.length / 800).toFixed(2)) });
  }

  return tags;
}

// ---------------------------------------------------------------------------
// ChatWindow
// ---------------------------------------------------------------------------

export function ChatWindow() {
  const [messages, setMessages] = useState<LocalChatMessage[]>([
    { id: 1, role: 'assistant', content: 'Take your time. I\u2019m listening.' },
  ]);
  const [draft, setDraft] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const replyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, isReplying]);

  useEffect(() => () => {
    if (replyTimerRef.current !== null) window.clearTimeout(replyTimerRef.current);
  }, []);

  const [mode, setMode] = useState<'listen' | 'understand' | 'reframe' | 'help'>('listen');

  const modes: { id: 'listen' | 'understand' | 'reframe' | 'help'; label: string; hint: string }[] = [
    { id: 'listen', label: 'Listen', hint: 'No fixing. Just room.' },
    { id: 'understand', label: 'Understand', hint: 'Find the thread.' },
    { id: 'reframe', label: 'Reframe', hint: 'Look from a new angle.' },
    { id: 'help', label: 'Help', hint: 'Small next steps.' },
  ];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isReplying) return;

    const emotionTags = detectLocalEmotions(content);

    setMessages((current) => [...current, { id: Date.now(), role: 'user', content, emotionTags }]);
    setDraft('');
    setIsReplying(true);
    replyTimerRef.current = window.setTimeout(() => {
      let reply = 'I hear you.';
      if (mode === 'listen') reply = `I hear how much weight is sitting underneath this feeling. It makes total sense that you feel this way, and you don't have to fix or make it neat right now.`;
      else if (mode === 'understand') reply = `It sounds like there might be more than one thing happening at once. If you look closely at what's happening, what single part feels hardest to speak out loud right now?`;
      else if (mode === 'reframe') reply = `Carrying regret around this can feel heavy. Looking at this with compassion: what was actually within your control, how would you advise a dear friend in your exact shoes, and what is one thing you handled right?`;
      else if (mode === 'help') reply = `Here are 2 concrete, realistic small next steps we can take together:\n1. Take a 5-minute pause without forcing yourself to solve the whole picture.\n2. Identify the single smallest action within your reach today. Would you like to talk through that step first?`;

      setMessages((current) => [...current, { id: Date.now(), role: 'assistant', content: reply }]);
      setIsReplying(false);
      replyTimerRef.current = null;
    }, 1000);
  };

  return <section className="relative flex min-h-[calc(100dvh-270px)] flex-col overflow-hidden rounded-[28px] border border-border bg-card quiet-shadow">
    <div className="surface-grid pointer-events-none absolute" />
    <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 md:px-7">
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle size={17} /></span>
        <div><p className="text-xs font-bold">A quiet chat</p><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">{modes.find(m => m.id === mode)?.label} Mode</p></div>
      </div>
    </div>
    <div className="flex gap-2 overflow-x-auto border-b border-border/70 bg-muted/20 p-3" data-testid="mode-switcher">
      {modes.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setMode(item.id)}
          className={`min-w-[120px] rounded-xl border px-3 py-2 text-left transition-all ${mode === item.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/40'}`}
          data-testid={`button-mode-${item.id}`}
        >
          <span className="block text-xs font-bold">{item.label}</span>
          <span className={`block text-[9px] ${mode === item.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{item.hint}</span>
        </button>
      ))}
    </div>
    <div ref={messageListRef} className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-7 md:px-10" aria-live="polite" data-testid="chat-message-list">
      {messages.map((message) => (
        <div key={message.id} className={`flex flex-col gap-1.5 ${message.role === 'user' ? 'items-end' : 'items-start'}`} data-testid={`chat-message-${message.role}`}>
          {/* Message bubble */}
          <div className={`max-w-[min(580px,88%)] whitespace-pre-wrap rounded-[20px] px-4 py-3.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-background text-foreground'}`}>
            {message.content}
          </div>
          {/* Emotion badges — only for user messages, only when tags exist */}
          {message.role === 'user' && message.emotionTags && message.emotionTags.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1 px-1" aria-label="Detected emotions">
              {message.emotionTags.map((tag) => (
                <EmotionBadge key={tag.emotion} tag={tag} />
              ))}
            </div>
          )}
        </div>
      ))}
      {isReplying && <div className="flex justify-start gap-3" data-testid="chat-reply-loading"><div className="rounded-[20px] rounded-bl-md border border-border bg-background px-4 py-3.5 text-sm text-muted-foreground"><span className="inline-flex gap-1" aria-label="Unsaid is replying"><span className="size-1.5 animate-pulse rounded-full bg-accent" /><span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:120ms]" /><span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:240ms]" /></span></div></div>}
    </div>
    <form onSubmit={submit} className="relative border-t border-border/70 bg-background/70 p-4 md:p-5">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-2 pl-4 transition-colors focus-within:border-primary/60">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write something..." className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground/65" aria-label="Message" data-testid="input-chat-message" />
        <button type="submit" disabled={!draft.trim() || isReplying} className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-foreground transition-transform hover:scale-105 disabled:opacity-40" aria-label="Send message" data-testid="button-chat-send">{isReplying ? <span className="size-4 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" /> : <Send size={17} />}</button>
      </div>
      <div className="mt-2 flex items-center justify-between px-1 font-mono-ui text-[9px] uppercase tracking-[.13em] text-muted-foreground/70"><span>Press return to send</span><span>Only you can see this</span></div>
    </form>
  </section>;
}
