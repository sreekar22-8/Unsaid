import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUpRight, BarChart3, BookOpen, Check, ChevronDown, Clock3, Feather, Heart, LockKeyhole, MessageCircle, Plus, Save, Send, ShieldCheck, Sparkles, Trash2, WandSparkles, X } from 'lucide-react';
import {
  getGetDashboardSummaryQueryKey,
  getListConversationsQueryKey,
  getListJournalEntriesQueryKey,
  getListMemoriesQueryKey,
  getListMessagesQueryKey,
  useCreateConversation,
  useCreateJournalEntry,
  useDeleteJournalEntry,
  useDeleteMemory,
  useDetectEmotion,
  useGetCompanionBootstrap,
  useGetDashboardSummary,
  useListConversations,
  useListJournalEntries,
  useListMemories,
  useListMessages,
  useSendMessage,
  useUpdateJournalEntry,
  useUpdateMemorySettings,
} from '@workspace/api-client-react';
import type { ConversationMode, EmotionDetection, JournalEntry } from '@workspace/api-client-react';
import { AppShell, Button, EmptyState, ErrorNotice, formatDate, LoadingBlocks, PageHeading, Toggle } from '@/components/unsaid-ui';

const modes: { id: ConversationMode; label: string; hint: string }[] = [
  { id: 'listen', label: 'Listen', hint: 'No fixing. Just room.' },
  { id: 'understand', label: 'Understand', hint: 'Find the thread.' },
  { id: 'help', label: 'Help me through', hint: 'Small next steps.' },
  { id: 'private', label: 'Private note', hint: 'Keep it between us.' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">{children}</div>;
}

type LocalChatMessage = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
};

export function ChatPage() {
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

  const submit = (event: React.FormEvent) => {
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

  return <AppShell>
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeading eyebrow="A simple conversation" title="Say what you mean." description="There is no need to polish it first. Put the thought here and let it be heard." />
      <section className="flex min-h-[calc(100dvh-270px)] flex-col overflow-hidden rounded-[28px] border border-border bg-card quiet-shadow">
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
      </section>
    </div>
  </AppShell>;
}

export function CompanionPage() {
  const client = useQueryClient();
  const bootstrap = useGetCompanionBootstrap();
  const conversationsQuery = useListConversations({ query: { queryKey: getListConversationsQueryKey() } });
  const conversations = conversationsQuery.data ?? bootstrap.data?.conversations ?? [];
  const [activeId, setActiveId] = useState<number | null>(null);
  const [mode, setMode] = useState<ConversationMode>('listen');
  const [draft, setDraft] = useState('');
  const [detection, setDetection] = useState<EmotionDetection | null>(null);
  const [notice, setNotice] = useState('');
  const createConversation = useCreateConversation();
  const sendMessage = useSendMessage();
  const detectEmotion = useDetectEmotion();
  useEffect(() => {
    if (activeId === null && conversations.length) {
      setActiveId(conversations[0].id);
      setMode(conversations[0].mode);
    }
  }, [conversations, activeId]);
  const activeConversation = conversations.find((item) => item.id === activeId);
  const messagesQuery = useListMessages(activeId ?? 0, { query: { queryKey: getListMessagesQueryKey(activeId ?? 0), enabled: activeId !== null } });
  const messages = messagesQuery.data ?? (activeId ? (bootstrap.data?.messages ?? []).filter((item) => item.conversationId === activeId) : []);
  const startConversation = (requestedMode = mode) => {
    setNotice('');
    createConversation.mutate({ data: { title: requestedMode === 'private' ? 'A private note' : 'A little space', mode: requestedMode } }, {
      onSuccess: (conversation) => {
        setActiveId(conversation.id);
        setMode(conversation.mode);
        client.invalidateQueries({ queryKey: getListConversationsQueryKey() });
      },
      onError: () => setNotice('We could not open a new space just now. Please try again.'),
    });
  };
  const submit = (event?: React.FormEvent) => {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || sendMessage.isPending || createConversation.isPending) return;
    const send = (conversationId: number) => {
      sendMessage.mutate({ conversationId, data: { content, mode } }, {
        onSuccess: (nextMessages) => {
          client.setQueryData(getListMessagesQueryKey(conversationId), nextMessages);
          setDraft('');
          setNotice('');
        },
        onError: () => setNotice('Your words did not make it through. They are still here — try once more.'),
      });
    };
    if (activeId === null) {
      createConversation.mutate({ data: { title: content.slice(0, 34), mode } }, { onSuccess: (conversation) => { setActiveId(conversation.id); send(conversation.id); client.invalidateQueries({ queryKey: getListConversationsQueryKey() }); } });
    } else send(activeId);
    detectEmotion.mutate({ data: { content } }, { onSuccess: setDetection });
  };
  return <AppShell>
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_278px]">
      <section className="min-w-0 animate-rise">
        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary"><span className="size-1.5 rounded-full bg-accent" />A quiet place</div><h1 className="font-display text-[clamp(2.6rem,6vw,4.65rem)] leading-[.95] tracking-[-.06em]">What feels true<br /><em className="text-primary">right now?</em></h1><p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">You do not have to arrive with the right words. Start wherever you are.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground"><ShieldCheck size={14} className="text-primary" />Private session</div>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1" data-testid="mode-switcher">{modes.map((item) => <button key={item.id} type="button" onClick={() => { setMode(item.id); if (activeConversation) client.setQueryData(getListConversationsQueryKey(), conversations.map((c) => c.id === activeId ? { ...c, mode: item.id } : c)); }} className={`group min-w-[132px] rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${mode === item.id ? 'border-primary bg-primary text-primary-foreground shadow-sm' : 'border-border bg-card hover:-translate-y-0.5 hover:border-primary/40'}`} data-testid={`button-mode-${item.id}`}><span className="block text-xs font-bold">{item.label}</span><span className={`mt-1 block text-[10px] ${mode === item.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{item.hint}</span></button>)}</div>
        <div className="relative flex min-h-[470px] flex-col overflow-hidden rounded-[28px] border border-border bg-card quiet-shadow">
          <div className="surface-grid pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative flex items-center justify-between border-b border-border/70 px-5 py-4 md:px-7"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-secondary text-primary"><Feather size={17} /></span><div><p className="text-xs font-bold">{activeConversation?.title ?? 'A fresh beginning'}</p><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">{modes.find((item) => item.id === mode)?.label} mode</p></div></div><button className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => startConversation()} aria-label="Start a new conversation" data-testid="button-new-conversation"><Plus size={18} /></button></div>
          <div className="relative flex-1 space-y-5 overflow-y-auto px-5 py-7 md:px-10">{messagesQuery.isLoading && <LoadingBlocks count={2} />}{!messagesQuery.isLoading && messages.length === 0 && <div className="flex min-h-[270px] flex-col items-center justify-center text-center"><div className="relative mb-6"><span className="absolute inset-0 animate-pulse-soft rounded-full bg-accent/20 blur-xl" /><span className="relative grid size-16 place-items-center rounded-full border border-accent/40 bg-secondary text-primary"><Sparkles size={22} /></span></div><p className="font-display text-2xl">There is time for this.</p><p className="mt-2 max-w-xs text-sm leading-5 text-muted-foreground">Tell me the part you have been carrying around.</p></div>}{messages.map((message, index) => <div key={message.id} className={`flex animate-rise gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index * 45, 300)}ms` }} data-testid={`message-${message.id}`}><div className={`max-w-[min(580px,88%)] rounded-[20px] px-4 py-3.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-background text-foreground'}`}><p>{message.content}</p>{message.emotion && <span className="mt-2 inline-block font-mono-ui text-[9px] uppercase tracking-wider opacity-60">{message.emotion}</span>}</div></div>)}</div>
          <form onSubmit={submit} className="relative border-t border-border/70 bg-background/70 p-4 md:p-5"><div className="flex items-end gap-3 rounded-2xl border border-border bg-card p-2 pl-4 transition-colors focus-within:border-primary/60"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(e); } }} placeholder="Begin with a sentence, a fragment, or nothing polished..." rows={2} className="max-h-28 min-h-[46px] flex-1 resize-none bg-transparent py-2 text-sm leading-5 outline-none placeholder:text-muted-foreground/65" data-testid="input-message" /><button type="submit" disabled={!draft.trim() || sendMessage.isPending} className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-foreground transition-transform hover:scale-105 disabled:opacity-40" aria-label="Send message" data-testid="button-send-message">{sendMessage.isPending ? <span className="size-4 animate-spin rounded-full border-2 border-foreground/30 border-t-foreground" /> : <Send size={17} />}</button></div><div className="mt-2 flex items-center justify-between px-1 font-mono-ui text-[9px] uppercase tracking-[.13em] text-muted-foreground/70"><span>Shift + return for a new line</span><span className="flex items-center gap-1"><LockKeyhole size={10} />Only you can see this</span></div></form>
        </div>
        {notice && <div className="mt-3 text-xs text-accent" data-testid="status-companion-notice">{notice}</div>}
      </section>
      <aside className="space-y-5 animate-rise stagger-2">
        <div className="rounded-[24px] border border-border bg-secondary/60 p-5"><SectionLabel>Recent spaces</SectionLabel>{conversationsQuery.isLoading && <LoadingBlocks count={3} />}{conversations.length === 0 && !conversationsQuery.isLoading && <p className="text-sm leading-5 text-muted-foreground">Your first conversation can be small. One honest sentence is enough.</p>}<div className="space-y-1">{conversations.slice(0, 5).map((conversation) => <button key={conversation.id} onClick={() => { setActiveId(conversation.id); setMode(conversation.mode); }} className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-colors ${activeId === conversation.id ? 'bg-card' : 'hover:bg-card/60'}`} data-testid={`button-conversation-${conversation.id}`}><span className="min-w-0"><span className="block truncate text-xs font-semibold">{conversation.title || 'Untitled space'}</span><span className="mt-1 block font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">{formatDate(conversation.updatedAt)}</span></span><ChevronDown size={14} className="-rotate-90 text-muted-foreground" /></button>)}</div><Button variant="quiet" className="mt-3 w-full justify-between border border-dashed border-primary/25" onClick={() => startConversation()}><span>Open a new space</span><Plus size={14} /></Button></div>
        <div className="rounded-[24px] border border-border bg-card p-5"><SectionLabel>What I notice</SectionLabel>{detection ? <div className="animate-rise"><div className="flex items-end justify-between"><span className="font-display text-3xl">{detection.primary}</span><span className="font-mono-ui text-[10px] text-accent">{Math.round(detection.intensity * 100)}% intensity</span></div><div className="mt-3 flex flex-wrap gap-1.5">{detection.secondary.map((label) => <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground">{label}</span>)}</div><p className="mt-4 border-l-2 border-accent pl-3 text-xs leading-5 text-muted-foreground">{detection.reflection}</p></div> : <div className="flex gap-3 text-sm leading-5 text-muted-foreground"><WandSparkles size={16} className="mt-0.5 shrink-0 text-accent" /><p>Share a thought and I will gently reflect the feeling underneath it.</p></div>}</div>
        <Link href="/journal" className="group flex items-center justify-between rounded-[24px] bg-primary p-5 text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="link-journal-prompt"><div><p className="font-display text-xl">Leave a trace</p><p className="mt-1 text-xs text-primary-foreground/65">Save something for later.</p></div><ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></Link>
      </aside>
    </div>
  </AppShell>;
}

function JournalEditor({ entry, onClose, onSaved }: { entry?: JournalEntry; onClose: () => void; onSaved: () => void }) {
  const client = useQueryClient();
  const [title, setTitle] = useState(entry?.title ?? '');
  const [content, setContent] = useState(entry?.content ?? '');
  const [mood, setMood] = useState(entry?.mood ?? 'A little tender');
  const create = useCreateJournalEntry();
  const update = useUpdateJournalEntry();
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;
    const done = () => { client.invalidateQueries({ queryKey: getListJournalEntriesQueryKey() }); onSaved(); onClose(); };
    if (entry) update.mutate({ entryId: entry.id, data: { title, content, mood } }, { onSuccess: done });
    else create.mutate({ data: { title, content, mood } }, { onSuccess: done });
  };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/25 p-0 backdrop-blur-sm sm:items-center sm:p-5"><div className="w-full max-w-2xl rounded-t-[28px] border border-border bg-card p-6 shadow-2xl sm:rounded-[28px] md:p-8" role="dialog" aria-modal="true" data-testid="dialog-journal-editor"><div className="mb-6 flex items-center justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{entry ? 'Edit entry' : 'New entry'}</div><h2 className="mt-2 font-display text-3xl">{entry ? 'Return to this thought' : 'Make a little room'}</h2></div><button onClick={onClose} className="rounded-xl p-2 hover:bg-muted" aria-label="Close editor" data-testid="button-close-journal-editor"><X size={19} /></button></div><form onSubmit={save} className="space-y-4"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A title, if it wants one" className="w-full border-b border-border bg-transparent py-3 font-display text-2xl outline-none placeholder:text-muted-foreground/50 focus:border-primary" data-testid="input-journal-title" /><textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="What is here?" rows={7} autoFocus className="w-full resize-none rounded-2xl border border-border bg-background p-4 text-sm leading-6 outline-none placeholder:text-muted-foreground/60 focus:border-primary" data-testid="input-journal-content" /><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><label htmlFor="mood" className="mb-1 block font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">The weather inside</label><select id="mood" value={mood} onChange={(e) => setMood(e.target.value)} className="rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none" data-testid="select-journal-mood"><option>A little tender</option><option>Clearer than before</option><option>Heavy, but here</option><option>Quietly hopeful</option><option>Unsettled</option></select></div><div className="flex gap-2"><Button type="button" variant="quiet" onClick={onClose}>Not now</Button><Button type="submit" disabled={!content.trim() || create.isPending || update.isPending}><Save size={14} />{entry ? 'Save changes' : 'Keep this'}</Button></div></div></form></div></div>;
}

export function JournalPage() {
  const bootstrap = useGetCompanionBootstrap();
  const query = useListJournalEntries({ query: { queryKey: getListJournalEntriesQueryKey() } });
  const entries = query.data ?? bootstrap.data?.journalEntries ?? [];
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | undefined>();
  const deleteEntry = useDeleteJournalEntry();
  const remove = (id: number) => { if (window.confirm('Forget this journal entry?')) deleteEntry.mutate({ entryId: id }, { onSuccess: () => query.refetch() }); };
  return <AppShell><PageHeading eyebrow="Your journal" title="A place to put it down." description="Not everything needs to be solved. Some things feel different once they have somewhere to land." action={<Button onClick={() => { setEditing(undefined); setEditorOpen(true); }} data-testid="button-new-journal-entry"><Plus size={15} />New entry</Button>} />
    {query.isError && !entries.length ? <ErrorNotice message="Your journal is safe, but it is not responding right now." /> : query.isLoading && !entries.length ? <LoadingBlocks count={4} /> : entries.length === 0 ? <EmptyState icon={BookOpen} title="The first page is blank" description="Write toward the feeling, not a perfect summary." action={<Button onClick={() => setEditorOpen(true)}><Feather size={14} />Begin a page</Button>} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry, index) => <article key={entry.id} className={`group relative flex min-h-[250px] flex-col rounded-[25px] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${index === 0 ? 'md:col-span-2 bg-secondary/65' : ''}`} data-testid={`card-journal-entry-${entry.id}`}><div className="mb-8 flex items-start justify-between"><span className="rounded-full bg-background/70 px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-primary">{entry.mood || 'Unmarked'}</span><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={() => { setEditing(entry); setEditorOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit ${entry.title || 'entry'}`} data-testid={`button-edit-entry-${entry.id}`}><Feather size={14} /></button><button onClick={() => remove(entry.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${entry.title || 'entry'}`} data-testid={`button-delete-entry-${entry.id}`}><Trash2 size={14} /></button></div></div><h2 className="font-display text-2xl tracking-[-.03em]">{entry.title || 'Untitled thought'}</h2><p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{entry.content}</p><div className="mt-auto flex items-center gap-1.5 pt-7 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground"><Clock3 size={11} />{formatDate(entry.updatedAt || entry.createdAt, true)}</div></article>)}</div>}{editorOpen && <JournalEditor entry={editing} onClose={() => setEditorOpen(false)} onSaved={() => {}} />}</AppShell>;
}

export function InsightsPage() {
  const bootstrap = useGetCompanionBootstrap();
  const query = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const summary = query.data ?? bootstrap.data?.dashboard;
  const max = Math.max(...(summary?.weeklyIntensity?.map((point) => point.value) ?? [1]), 1);
  return <AppShell><PageHeading eyebrow="A gentle read" title="Your inner weather." description="Patterns are not verdicts. They are invitations to notice what you already know." /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{[['Check-ins', summary?.checkIns ?? 0, MessageCircle], ['Journal pages', summary?.journalEntries ?? 0, BookOpen], ['Conversations', summary?.conversations ?? 0, Feather], ['Current streak', summary?.streak ?? 0, Heart]].map(([label, value, Icon], index) => { const StatIcon = Icon as typeof Heart; return <div key={label as string} className={`animate-rise stagger-${index + 1} rounded-[23px] border border-border bg-card p-5`} data-testid={`stat-${String(label).toLowerCase().replaceAll(' ', '-')}`}><div className="mb-7 flex items-center justify-between"><span className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">{label as string}</span><StatIcon size={16} className="text-accent" /></div><p className="font-display text-4xl">{value as number}</p><p className="mt-1 text-xs text-muted-foreground">{label === 'Current streak' ? 'days of checking in' : 'so far, this season'}</p></div> })}</div>{query.isError && !summary ? <div className="mt-5"><ErrorNotice message="The reflection board is resting. Check back in a moment." /></div> : <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><section className="rounded-[25px] border border-border bg-card p-6 md:p-7"><div className="mb-8 flex items-start justify-between"><div><SectionLabel>Seven day rhythm</SectionLabel><h2 className="font-display text-2xl">Intensity, without judgement.</h2></div><BarChart3 size={19} className="text-primary" /></div>{summary?.weeklyIntensity?.length ? <div className="flex h-[210px] items-end gap-2 border-b border-border pb-0 sm:gap-4">{summary.weeklyIntensity.map((point, index) => <div key={`${point.day}-${index}`} className="group flex h-full flex-1 flex-col items-center justify-end gap-3" data-testid={`chart-intensity-${point.day}-${index}`}><div className="relative w-full max-w-[42px] rounded-t-xl bg-secondary transition-all duration-500 group-hover:bg-accent" style={{ height: `${Math.max((point.value / max) * 78, 9)}%` }}><span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono-ui text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{point.value}</span></div><span className="font-mono-ui text-[9px] uppercase text-muted-foreground">{point.day}</span></div>)}</div> : <EmptyState icon={BarChart3} title="Your rhythm will appear here" description="A few check-ins are all it takes to begin seeing your own pattern." />}</section><section className="rounded-[25px] border border-border bg-primary p-6 text-primary-foreground md:p-7"><SectionLabel>Coming up often</SectionLabel><h2 className="font-display text-2xl">What has been close lately.</h2>{summary?.topEmotions?.length ? <div className="mt-7 space-y-5">{summary.topEmotions.map((emotion) => <div key={emotion.emotion}><div className="mb-2 flex justify-between text-xs"><span className="font-semibold">{emotion.emotion}</span><span className="text-primary-foreground/60">{emotion.count} mentions</span></div><div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/15"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(emotion.count * 13 + 18, 100)}%` }} /></div></div>)}</div> : <p className="mt-7 text-sm leading-6 text-primary-foreground/65">As you talk and write, the shape of your feelings will become easier to see here.</p>}<div className="mt-10 border-t border-primary-foreground/15 pt-4 text-xs leading-5 text-primary-foreground/60">There is no “right” emotional baseline. This is simply your noticing place.</div></section></div>}</AppShell>;
}

export function MemoryPage() {
  const client = useQueryClient();
  const bootstrap = useGetCompanionBootstrap();
  const query = useListMemories({ query: { queryKey: getListMemoriesQueryKey() } });
  const memories = query.data ?? bootstrap.data?.memories ?? [];
  const [enabled, setEnabled] = useState(bootstrap.data?.memoryEnabled ?? true);
  useEffect(() => { if (bootstrap.data) setEnabled(bootstrap.data.memoryEnabled); }, [bootstrap.data]);
  const update = useUpdateMemorySettings();
  const remove = useDeleteMemory();
  return <AppShell><PageHeading eyebrow="Your memory" title="You are in control." description="Unsaid can remember the details you choose to make conversations feel more continuous. Nothing is kept without your say." action={<div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><div><p className="text-xs font-bold">Memory {enabled ? 'on' : 'off'}</p><p className="text-[10px] text-muted-foreground">For your companion</p></div><Toggle enabled={enabled} label="memory" onChange={(value) => { setEnabled(value); update.mutate({ data: { enabled: value } }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }), onError: () => setEnabled(!value) }); }} /></div>} />
    <div className="mb-6 flex items-start gap-4 rounded-[22px] border border-accent/25 bg-accent/10 p-5"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-foreground"><LockKeyhole size={18} /></span><div><p className="text-sm font-bold">Memory is a choice, not a default.</p><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">You can turn this off at any time. When it is off, remembered details will not be used in new conversations.</p></div></div>
    {query.isLoading && !memories.length ? <LoadingBlocks count={3} /> : memories.length === 0 ? <EmptyState icon={LockKeyhole} title="Nothing remembered yet" description="When something feels worth carrying forward, we will ask first." /> : <div className="space-y-3">{memories.map((memory) => <div key={memory.id} className={`flex flex-col gap-4 rounded-[22px] border border-border bg-card p-5 transition-opacity sm:flex-row sm:items-center ${memory.enabled ? '' : 'opacity-60'}`} data-testid={`row-memory-${memory.id}`}><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Sparkles size={16} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold">{memory.label}</h2>{memory.enabled && <span className="rounded-full bg-muted px-2 py-0.5 font-mono-ui text-[8px] uppercase tracking-wider text-primary">In use</span>}</div><p className="mt-1 text-sm leading-5 text-muted-foreground">{memory.detail}</p><p className="mt-2 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground/70">Added {formatDate(memory.createdAt, true)}</p></div><div className="flex items-center gap-2 self-end sm:self-center"><span className="text-[10px] text-muted-foreground">{memory.enabled ? 'Remembering' : 'Paused'}</span><button onClick={() => remove.mutate({ memoryId: memory.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }) })} className="rounded-xl p-2.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Forget ${memory.label}`} data-testid={`button-forget-memory-${memory.id}`}><Trash2 size={15} /></button></div></div>)}</div>}
  </AppShell>;
}

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [showInsights, setShowInsights] = useState(true);
  const [saved, setSaved] = useState(false);
  return <AppShell><PageHeading eyebrow="The private details" title="Make it feel like yours." description="Small choices for the way you want Unsaid to show up." /><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="space-y-5"><section className="rounded-[25px] border border-border bg-card p-6"><SectionLabel>Companion presence</SectionLabel><div className="divide-y divide-border/70"><div className="flex items-center justify-between gap-6 py-5 first:pt-2"><div><h2 className="text-sm font-bold">Gentle check-in reminders</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A soft nudge when you have asked for one.</p></div><Toggle enabled={notifications} label="gentle check-in reminders" onChange={setNotifications} /></div><div className="flex items-center justify-between gap-6 py-5"><div><h2 className="text-sm font-bold">Use reflections in Insights</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Let patterns from your conversations shape your dashboard.</p></div><Toggle enabled={showInsights} label="use reflections in insights" onChange={setShowInsights} /></div></div></section><section className="rounded-[25px] border border-border bg-card p-6"><SectionLabel>Your data</SectionLabel><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold">Everything can leave with you.</h2><p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Your journal, conversations, and memories belong to you. You can request a copy or clear a space whenever you need.</p></div><Button variant="outline" onClick={() => setSaved(true)} data-testid="button-export-data"><ArrowUpRight size={14} />Request export</Button></div></section><Button onClick={() => setSaved(true)} data-testid="button-save-settings"><Check size={14} />{saved ? 'Saved for now' : 'Save preferences'}</Button></div><aside className="h-fit rounded-[25px] bg-primary p-6 text-primary-foreground"><div className="mb-5 grid size-11 place-items-center rounded-2xl bg-accent text-foreground"><ShieldCheck size={20} /></div><h2 className="font-display text-2xl">No performance here.</h2><p className="mt-3 text-sm leading-6 text-primary-foreground/65">Unsaid is a room to be honest in, not a place to become a better version of yourself on schedule.</p><div className="mt-8 space-y-3 border-t border-primary-foreground/15 pt-5 font-mono-ui text-[9px] uppercase tracking-[.15em] text-primary-foreground/55"><div className="flex items-center gap-2"><Check size={12} className="text-accent" />Private by default</div><div className="flex items-center gap-2"><Check size={12} className="text-accent" />You choose what stays</div><div className="flex items-center gap-2"><Check size={12} className="text-accent" />No perfect words needed</div></div></aside></div></AppShell>;
}
