import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';

type LocalChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

export function ChatWindow() {
  const [messages, setMessages] = useState<LocalChatMessage[]>([
    { id: 1, role: 'assistant', content: 'Take your time. I’m listening.' },
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

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isReplying) return;

    setMessages((current) => [...current, { id: Date.now(), role: 'user', content }]);
    setDraft('');
    setIsReplying(true);
    replyTimerRef.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: Date.now(), role: 'assistant', content: 'I hear you.' }]);
      setIsReplying(false);
      replyTimerRef.current = null;
    }, 1000);
  };

  return <section className="relative flex min-h-[calc(100dvh-270px)] flex-col overflow-hidden rounded-[28px] border border-border bg-card quiet-shadow">
    <div className="surface-grid pointer-events-none absolute" />
    <div className="flex items-center gap-3 border-b border-border/70 px-5 py-4 md:px-7">
      <span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary"><MessageCircle size={17} /></span>
      <div><p className="text-xs font-bold">A quiet chat</p><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Private by default</p></div>
    </div>
    <div ref={messageListRef} className="relative min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-7 md:px-10" aria-live="polite" data-testid="chat-message-list">
      {messages.map((message) => <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} data-testid={`chat-message-${message.role}`}>
        <div className={`max-w-[min(580px,88%)] rounded-[20px] px-4 py-3.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-background text-foreground'}`}>{message.content}</div>
      </div>)}
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