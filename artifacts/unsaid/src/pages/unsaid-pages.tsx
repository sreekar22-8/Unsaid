import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ArrowUpRight, BarChart3, BookOpen, Check, ChevronDown, Clock3, Feather, Heart, LockKeyhole, MessageCircle, Pencil, Plus, Save, Send, ShieldCheck, Sparkles, Trash2, WandSparkles, X } from 'lucide-react';
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
import { ChatWindow, detectLocalEmotions, EmotionBadge } from '@/components/chat-window';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';

const modes: { id: ConversationMode; label: string; hint: string }[] = [
  { id: 'listen', label: 'Listen', hint: 'No fixing. Just room.' },
  { id: 'understand', label: 'Understand', hint: 'Find the thread.' },
  { id: 'reframe', label: 'Reframe', hint: 'Look from a new angle.' },
  { id: 'help', label: 'Help', hint: 'Small next steps.' },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">{children}</div>;
}

export function ChatPage() {
  return <AppShell>
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeading eyebrow="A simple conversation" title="Say what you mean." description="There is no need to polish it first. Put the thought here and let it be heard." />
      <ChatWindow />
    </div>
  </AppShell>;
}

export function CompanionPage() {
  const client = useQueryClient();
  const bootstrap = useGetCompanionBootstrap();
  const conversationsQuery = useListConversations({ query: { queryKey: getListConversationsQueryKey() } });
  const rawConversations = conversationsQuery.data ?? bootstrap.data?.conversations;
  const conversations = Array.isArray(rawConversations) ? rawConversations : [];
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
  const rawMessages = messagesQuery.data ?? (activeId ? bootstrap.data?.messages : undefined);
  const messages = Array.isArray(rawMessages) ? (activeId ? rawMessages.filter((item) => item.conversationId === activeId) : rawMessages) : [];
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
           <div className="relative flex-1 space-y-5 overflow-y-auto px-5 py-7 md:px-10">{messagesQuery.isLoading && <LoadingBlocks count={2} />}{!messagesQuery.isLoading && messages.length === 0 && <div className="flex min-h-[270px] flex-col items-center justify-center text-center"><div className="relative mb-6"><span className="absolute inset-0 animate-pulse-soft rounded-full bg-accent/20 blur-xl" /><span className="relative grid size-16 place-items-center rounded-full border border-accent/40 bg-secondary text-primary"><Sparkles size={22} /></span></div><p className="font-display text-2xl">There is time for this.</p><p className="mt-2 max-w-xs text-sm leading-5 text-muted-foreground">Tell me the part you have been carrying around.</p></div>}{messages.map((message, index) => <div key={message.id} className={`flex animate-rise gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index * 45, 300)}ms` }} data-testid={`message-${message.id}`}><div className={`flex flex-col items-end gap-1.5 ${message.role === 'assistant' ? 'items-start' : ''}`}><div className={`max-w-[min(580px,88%)] rounded-[20px] px-4 py-3.5 text-sm leading-6 ${message.role === 'user' ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border bg-background text-foreground'}`}><p>{message.content}</p>{message.emotion && <span className="mt-2 inline-block font-mono-ui text-[9px] uppercase tracking-wider opacity-60">{message.emotion}</span>}</div>{message.role === 'user' && <div className="flex flex-wrap justify-end gap-1 px-1" aria-label="Detected emotions">{detectLocalEmotions(message.content).map((tag) => <EmotionBadge key={tag.emotion} tag={tag} />)}</div>}</div></div>)}</div>
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
  const rawEntries = query.data ?? bootstrap.data?.journalEntries;
  const entries = Array.isArray(rawEntries) ? rawEntries : [];
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<JournalEntry | undefined>();
  const deleteEntry = useDeleteJournalEntry();
  const remove = (id: number) => { if (window.confirm('Forget this journal entry?')) deleteEntry.mutate({ entryId: id }, { onSuccess: () => query.refetch() }); };
  return <AppShell><PageHeading eyebrow="Your journal" title="A place to put it down." description="Not everything needs to be solved. Some things feel different once they have somewhere to land." action={<Button onClick={() => { setEditing(undefined); setEditorOpen(true); }} data-testid="button-new-journal-entry"><Plus size={15} />New entry</Button>} />
    {query.isError && !entries.length ? <ErrorNotice message="Your journal is safe, but it is not responding right now." /> : query.isLoading && !entries.length ? <LoadingBlocks count={4} /> : entries.length === 0 ? <EmptyState icon={BookOpen} title="The first page is blank" description="Write toward the feeling, not a perfect summary." action={<Button onClick={() => setEditorOpen(true)}><Feather size={14} />Begin a page</Button>} /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{entries.map((entry, index) => <article key={entry.id} className={`group relative flex min-h-[250px] flex-col rounded-[25px] border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${index === 0 ? 'md:col-span-2 bg-secondary/65' : ''}`} data-testid={`card-journal-entry-${entry.id}`}><div className="mb-8 flex items-start justify-between"><span className="rounded-full bg-background/70 px-2.5 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-primary">{entry.mood || 'Unmarked'}</span><div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"><button onClick={() => { setEditing(entry); setEditorOpen(true); }} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Edit ${entry.title || 'entry'}`} data-testid={`button-edit-entry-${entry.id}`}><Feather size={14} /></button><button onClick={() => remove(entry.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${entry.title || 'entry'}`} data-testid={`button-delete-entry-${entry.id}`}><Trash2 size={14} /></button></div></div><h2 className="font-display text-2xl tracking-[-.03em]">{entry.title || 'Untitled thought'}</h2><p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">{entry.content}</p><div className="mt-auto flex items-center gap-1.5 pt-7 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground"><Clock3 size={11} />{formatDate(entry.updatedAt || entry.createdAt, true)}</div></article>)}</div>}{editorOpen && <JournalEditor entry={editing} onClose={() => setEditorOpen(false)} onSaved={() => {}} />}</AppShell>;
}

function getMoodColor(mood?: string | null): string {
  if (!mood) return '#8d83a8';
  const m = mood.toLowerCase();
  if (m.includes('hope') || m.includes('clear')) return '#c1a15d';
  if (m.includes('relie') || m.includes('calm') || m.includes('peace')) return '#569882';
  if (m.includes('tender') || m.includes('soft')) return '#c88770';
  if (m.includes('heavy') || m.includes('sad') || m.includes('grief')) return '#798ea4';
  if (m.includes('unsettle') || m.includes('anxious') || m.includes('frustrat') || m.includes('anger')) return '#b87070';
  if (m.includes('regret') || m.includes('guilt') || m.includes('shame')) return '#7e82a8';
  return '#8d83a8';
}

export function InsightsPage() {
  const bootstrap = useGetCompanionBootstrap();
  const query = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const summary = query.data ?? bootstrap.data?.dashboard;

  const journalQuery = useListJournalEntries({ query: { queryKey: getListJournalEntriesQueryKey() } });
  const rawJournalEntries = journalQuery.data ?? bootstrap.data?.journalEntries;
  const journalEntries: JournalEntry[] = Array.isArray(rawJournalEntries) ? rawJournalEntries : [];

  const max = Math.max(...(summary?.weeklyIntensity?.map((point) => point.value) ?? [1]), 1);
  const emotionMax = Math.max(...(summary?.topEmotions?.map((e) => e.count) ?? [1]), 1);

  // 1. Calendar Heatmap (Last 60 Days dominant mood_tag)
  const heatmapDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      displayDate: string;
      dominantMood: string | null;
      color: string;
      count: number;
    }> = [];

    const entriesByDay = new Map<string, JournalEntry[]>();
    for (const entry of journalEntries) {
      if (!entry.createdAt) continue;
      const d = new Date(entry.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const list = entriesByDay.get(key) ?? [];
      list.push(entry);
      entriesByDay.set(key, list);
    }

    const now = new Date();
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayEntries = entriesByDay.get(dateKey) ?? [];

      if (dayEntries.length > 0) {
        const moodCounts = new Map<string, number>();
        for (const e of dayEntries) {
          const mood = (e.moodTag || e.mood || 'Reflective').trim();
          moodCounts.set(mood, (moodCounts.get(mood) ?? 0) + 1);
        }
        let topMood = '';
        let topCount = 0;
        for (const [m, c] of moodCounts.entries()) {
          if (c > topCount) {
            topCount = c;
            topMood = m;
          }
        }
        days.push({
          dateStr: dateKey,
          displayDate,
          dominantMood: topMood,
          color: getMoodColor(topMood),
          count: dayEntries.length,
        });
      } else {
        days.push({
          dateStr: dateKey,
          displayDate,
          dominantMood: null,
          color: '',
          count: 0,
        });
      }
    }

    return days;
  }, [journalEntries]);

  // 2. Growth View (Selected Emotion & Line Chart of intensity over time)
  const [selectedEmotion, setSelectedEmotion] = useState('Regret');

  const availableEmotions = useMemo(() => {
    const defaultEmotions = [
      'Regret',
      'Anxiety',
      'Sadness',
      'Grief',
      'Guilt',
      'Loneliness',
      'Frustration',
      'Tender',
      'Hopeful',
      'Relieved',
      'Unsettled',
      'Reflective',
    ];
    const set = new Set<string>(defaultEmotions);
    for (const e of journalEntries) {
      if (e.moodTag) set.add(e.moodTag);
      if (e.mood) set.add(e.mood);
    }
    return Array.from(set);
  }, [journalEntries]);

  const growthData = useMemo(() => {
    const target = selectedEmotion.toLowerCase().trim();
    const points: Array<{
      dateStr: string;
      displayDate: string;
      intensity: number;
      rawDate: number;
    }> = [];

    for (const entry of journalEntries) {
      if (!entry.createdAt) continue;
      const moodStr = `${entry.moodTag || ''} ${entry.mood || ''}`.toLowerCase();
      const contentStr = (entry.content || '').toLowerCase();

      let matched = false;
      let intensity = 0.5;

      if (moodStr.includes(target) || (target.length > 3 && target.includes(moodStr.trim()))) {
        matched = true;
        intensity = 0.65;
      }

      const tags = detectLocalEmotions(entry.content || '');
      const foundTag = tags.find(
        (t) => t.emotion.toLowerCase().includes(target) || target.includes(t.emotion.toLowerCase()),
      );
      if (foundTag) {
        matched = true;
        intensity = foundTag.intensity;
      } else if (contentStr.includes(target)) {
        matched = true;
        intensity = Math.min(0.95, Math.max(0.4, 0.5 + Math.min((entry.content || '').length / 500, 0.4)));
      }

      if (matched) {
        const d = new Date(entry.createdAt);
        points.push({
          dateStr: entry.createdAt.slice(0, 10),
          displayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          intensity: parseFloat(intensity.toFixed(2)),
          rawDate: d.getTime(),
        });
      }
    }

    points.sort((a, b) => a.rawDate - b.rawDate);
    return points;
  }, [selectedEmotion, journalEntries]);

  const growthEmotionColor = getMoodColor(selectedEmotion);

  // SVG Line Chart metrics & coordinates
  const chartW = 600;
  const chartH = 170;
  const padL = 45;
  const padR = 30;
  const padT = 25;
  const padB = 35;
  const usableW = chartW - padL - padR;
  const usableH = chartH - padT - padB;

  const growthCoords = useMemo(() => {
    return growthData.map((pt, idx) => {
      const x = growthData.length === 1 ? chartW / 2 : padL + (idx / (growthData.length - 1)) * usableW;
      const y = chartH - padB - pt.intensity * usableH;
      return { ...pt, x, y };
    });
  }, [growthData, usableW, usableH]);

  const linePath = useMemo(() => {
    if (growthCoords.length < 2) return '';
    return growthCoords.reduce(
      (acc, pt, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`,
      '',
    );
  }, [growthCoords]);

  const areaPath = useMemo(() => {
    if (growthCoords.length < 2) return '';
    const baseY = (chartH - padB).toFixed(1);
    const firstX = growthCoords[0].x.toFixed(1);
    const lastX = growthCoords[growthCoords.length - 1].x.toFixed(1);
    return `${linePath} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  }, [linePath, growthCoords]);

  return (
    <AppShell>
      <PageHeading
        eyebrow="A gentle read"
        title="Your inner weather."
        description="Patterns are not verdicts. They are invitations to notice what you already know."
      />

      {/* Top 4 Summary Stat Cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Check-ins', summary?.checkIns ?? 0, MessageCircle],
          ['Journal pages', summary?.journalEntries ?? 0, BookOpen],
          ['Conversations', summary?.conversations ?? 0, Feather],
          ['Current streak', summary?.streak ?? 0, Heart],
        ].map(([label, value, Icon], index) => {
          const StatIcon = Icon as typeof Heart;
          return (
            <div
              key={label as string}
              className={`animate-rise stagger-${index + 1} rounded-[23px] border border-border bg-card p-5`}
              data-testid={`stat-${String(label).toLowerCase().replaceAll(' ', '-')}`}
            >
              <div className="mb-7 flex items-center justify-between">
                <span className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">
                  {label as string}
                </span>
                <StatIcon size={16} className="text-accent" />
              </div>
              <p className="font-display text-4xl">{value as number}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {label === 'Current streak' ? 'days of checking in' : 'so far, this season'}
              </p>
            </div>
          );
        })}
      </div>

      {query.isError && !summary ? (
        <div className="mt-5">
          <ErrorNotice message="The reflection board is resting. Check back in a moment." />
        </div>
      ) : (
        <>
          {/* Existing 2-Column Rhythm and Top Emotions Charts */}
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <section className="rounded-[25px] border border-border bg-card p-6 md:p-7">
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <SectionLabel>Seven day rhythm</SectionLabel>
                  <h2 className="font-display text-2xl">Intensity, without judgement.</h2>
                </div>
                <BarChart3 size={19} className="text-primary" />
              </div>
              {summary?.weeklyIntensity?.length ? (
                <div className="flex h-[210px] items-end gap-2 border-b border-border pb-0 sm:gap-4">
                  {summary.weeklyIntensity.map((point, index) => (
                    <div
                      key={`${point.day}-${index}`}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-3"
                      data-testid={`chart-intensity-${point.day}-${index}`}
                    >
                      <div
                        className="relative w-full max-w-[42px] rounded-t-xl bg-secondary transition-all duration-500 group-hover:bg-accent"
                        style={{ height: `${Math.max((point.value / max) * 78, 9)}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono-ui text-[9px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                          {point.value}
                        </span>
                      </div>
                      <span className="font-mono-ui text-[9px] uppercase text-muted-foreground">{point.day}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Your rhythm will appear here"
                  description="A few check-ins are all it takes to begin seeing your own pattern."
                />
              )}
            </section>

            <section
              className="rounded-[25px] border border-border bg-card p-6 md:p-7"
              data-testid="section-top-emotions-chart"
            >
              <div className="mb-8 flex items-start justify-between">
                <div>
                  <SectionLabel>Coming up often</SectionLabel>
                  <h2 className="font-display text-2xl">Top emotions, by count.</h2>
                </div>
                <BarChart3 size={19} className="text-primary" />
              </div>
              {summary?.topEmotions?.length ? (
                <div className="flex h-[210px] items-end gap-3 border-b border-border pb-0 sm:gap-4">
                  {summary.topEmotions.map((item, index) => (
                    <div
                      key={item.emotion}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-3"
                      data-testid={`chart-emotion-${item.emotion}-${index}`}
                    >
                      <div
                        className="relative w-full rounded-t-xl transition-all duration-500"
                        style={{
                          height: `${Math.max((item.count / emotionMax) * 78, 9)}%`,
                          backgroundColor: item.color,
                          opacity: 0.82,
                        }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 font-mono-ui text-[9px] font-semibold text-foreground opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                          {item.count}
                        </span>
                      </div>
                      <span className="w-full truncate text-center font-mono-ui text-[9px] uppercase leading-tight text-muted-foreground">
                        {item.emotion}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="Your emotions will appear here"
                  description="As you talk, the feelings you carry most will show up here."
                />
              )}
              <div className="mt-6 border-t border-border/60 pt-4 font-mono-ui text-[9px] uppercase tracking-[.13em] text-muted-foreground/60">
                Counts across all conversations · Hover a bar to see the number
              </div>
            </section>
          </div>

          {/* Feature 1: Calendar-Style Heatmap (Last 60 Days dominant mood_tag) */}
          <section
            className="mt-5 rounded-[25px] border border-border bg-card p-6 md:p-7"
            data-testid="section-journal-heatmap"
          >
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionLabel>Mood rhythm</SectionLabel>
                <h2 className="font-display text-2xl">Inner weather across 60 days.</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each tile represents the dominant mood tag recorded in your journal pages.
                </p>
              </div>
              <div className="font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
                Last 60 days · {journalEntries.length} {journalEntries.length === 1 ? 'entry' : 'entries'}
              </div>
            </div>

            {/* Heatmap Grid: 60 Day Tiles */}
            <div className="flex flex-wrap gap-2 pt-2" data-testid="heatmap-grid">
              {heatmapDays.map((day) => (
                <div
                  key={day.dateStr}
                  className={`group relative size-6 rounded-md transition-all duration-200 hover:scale-125 hover:z-10 ${
                    day.dominantMood
                      ? 'shadow-xs cursor-pointer'
                      : 'border border-border/50 bg-secondary/35 hover:border-border cursor-default'
                  }`}
                  style={day.dominantMood ? { backgroundColor: day.color } : undefined}
                  data-testid={`heatmap-day-${day.dateStr}`}
                  aria-label={`${day.displayDate}: ${day.dominantMood || 'No entry'}`}
                >
                  {/* Tooltip on hover */}
                  <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2 py-1 font-mono-ui text-[9px] font-medium text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 z-30">
                    {day.displayDate}: {day.dominantMood ? `${day.dominantMood} (${day.count})` : 'No entry'}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend for Mood Heatmap */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-4 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
              <span className="font-semibold text-foreground">Moods:</span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: '#c1a15d' }} />
                Hopeful
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: '#569882' }} />
                Relieved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: '#c88770' }} />
                Tender
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: '#798ea4' }} />
                Heavy
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: '#b87070' }} />
                Unsettled
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm" style={{ backgroundColor: '#8d83a8' }} />
                Reflective
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm border border-border/60 bg-secondary/35" />
                No entry
              </span>
            </div>
          </section>

          {/* Feature 2: Growth View (Emotion intensity over time) */}
          <section
            className="mt-5 rounded-[25px] border border-border bg-card p-6 md:p-7"
            data-testid="section-growth-view"
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionLabel>Growth view</SectionLabel>
                <h2 className="font-display text-2xl">Watching feelings soften.</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pick a feeling to see only that emotion&apos;s intensity over time across your journal reflections.
                </p>
              </div>

              {/* Emotion Selector Dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <label
                  htmlFor="select-growth-emotion"
                  className="font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground"
                >
                  Emotion:
                </label>
                <select
                  id="select-growth-emotion"
                  value={selectedEmotion}
                  onChange={(e) => setSelectedEmotion(e.target.value)}
                  className="rounded-xl border border-border bg-background px-3 py-1.5 font-mono-ui text-xs font-semibold text-foreground outline-none transition-colors focus:border-primary"
                  data-testid="select-growth-emotion"
                >
                  {availableEmotions.map((emotion) => (
                    <option key={emotion} value={emotion}>
                      {emotion}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Growth View Line Chart or Empty State */}
            {growthData.length === 0 ? (
              <div className="py-6" data-testid="growth-chart-empty">
                <EmptyState
                  icon={BarChart3}
                  title={`No reflections for ${selectedEmotion} yet`}
                  description={`When you write journal entries touching on ${selectedEmotion.toLowerCase()}, its intensity over time will appear here so you can notice how it eases.`}
                />
              </div>
            ) : (
              <div className="space-y-3" data-testid="container-growth-chart">
                {/* Metric Summary */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-wider">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: growthEmotionColor }}
                      aria-hidden
                    />
                    <span className="font-semibold text-foreground">{selectedEmotion}</span>
                    <span>
                      · {growthData.length} {growthData.length === 1 ? 'reflection' : 'reflections'}
                    </span>
                  </div>
                  {growthData.length > 1 && (
                    <div className="font-mono-ui text-[10px] text-accent">
                      {Math.round(growthData[0].intensity * 100)}% →{' '}
                      {Math.round(growthData[growthData.length - 1].intensity * 100)}%
                      {growthData[0].intensity > growthData[growthData.length - 1].intensity && (
                        <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-foreground font-semibold">
                          Eased{' '}
                          {Math.round(
                            (growthData[0].intensity - growthData[growthData.length - 1].intensity) * 100,
                          )}
                          %
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* SVG Line Chart */}
                <div className="relative w-full overflow-hidden rounded-2xl border border-border/60 bg-background/50 p-4">
                  <svg
                    viewBox={`0 0 ${chartW} ${chartH}`}
                    className="w-full h-auto max-h-[220px] overflow-visible"
                    data-testid="growth-line-chart"
                  >
                    <defs>
                      <linearGradient id="growthAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={growthEmotionColor} stopOpacity="0.32" />
                        <stop offset="100%" stopColor={growthEmotionColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Grid Lines & Labels */}
                    {[
                      { val: 1.0, y: padT, label: '100%' },
                      { val: 0.5, y: padT + usableH / 2, label: '50%' },
                      { val: 0.0, y: chartH - padB, label: '0%' },
                    ].map((grid) => (
                      <g key={grid.label}>
                        <line
                          x1={padL}
                          y1={grid.y}
                          x2={chartW - padR}
                          y2={grid.y}
                          stroke="currentColor"
                          className="text-border/60"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 8}
                          y={grid.y + 3}
                          textAnchor="end"
                          className="fill-muted-foreground font-mono-ui text-[9px]"
                        >
                          {grid.label}
                        </text>
                      </g>
                    ))}

                    {/* Area under line */}
                    {areaPath && <path d={areaPath} fill="url(#growthAreaGradient)" />}

                    {/* Connecting line */}
                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={growthEmotionColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data Points */}
                    {growthCoords.map((pt) => (
                      <g key={`${pt.dateStr}-${pt.rawDate}`} className="group/dot cursor-pointer">
                        {/* Outer hover ring */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={6}
                          fill="none"
                          stroke={growthEmotionColor}
                          strokeWidth="1.5"
                          className="opacity-0 transition-opacity duration-200 group-hover/dot:opacity-100"
                        />
                        {/* Main Dot */}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={4}
                          className="fill-background stroke-2 transition-transform duration-200 group-hover/dot:scale-125"
                          style={{ stroke: growthEmotionColor }}
                        />
                        <circle cx={pt.x} cy={pt.y} r={2} style={{ fill: growthEmotionColor }} />

                        {/* Interactive Tooltip on Dot Hover */}
                        <g className="pointer-events-none opacity-0 transition-opacity duration-200 group-hover/dot:opacity-100 z-30">
                          <rect
                            x={Math.max(10, Math.min(pt.x - 48, chartW - 100))}
                            y={Math.max(5, pt.y - 30)}
                            width={96}
                            height={22}
                            rx={6}
                            className="fill-popover stroke stroke-border shadow-md"
                          />
                          <text
                            x={Math.max(58, Math.min(pt.x, chartW - 52))}
                            y={Math.max(19, pt.y - 16)}
                            textAnchor="middle"
                            className="fill-popover-foreground font-mono-ui text-[9px] font-bold"
                          >
                            {Math.round(pt.intensity * 100)}% · {pt.displayDate}
                          </text>
                        </g>

                        {/* X-Axis date label */}
                        <text
                          x={pt.x}
                          y={chartH - padB + 16}
                          textAnchor="middle"
                          className="fill-muted-foreground font-mono-ui text-[9px] uppercase tracking-wider"
                        >
                          {pt.displayDate}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>

                <div className="border-t border-border/60 pt-3 font-mono-ui text-[9px] uppercase tracking-[.13em] text-muted-foreground/60">
                  {selectedEmotion} intensity over time · Hover any point to inspect date &amp; score
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

export function MemoryPage() {
  const client = useQueryClient();
  const bootstrap = useGetCompanionBootstrap();
  const [enabled, setEnabled] = useState(bootstrap.data?.memoryEnabled ?? true);
  useEffect(() => {
    if (bootstrap.data) setEnabled(bootstrap.data.memoryEnabled);
  }, [bootstrap.data]);
  const update = useUpdateMemorySettings();

  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? null;

  interface MemoryItem {
    id: number;
    fact: string;
    approved: boolean;
    userId: string | null;
    createdAt: string;
  }

  const [items, setItems] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state for approved items
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual add state
  const [isAdding, setIsAdding] = useState(false);
  const [newFact, setNewFact] = useState('');
  const [savingNewFact, setSavingNewFact] = useState(false);

  const fetchMemoryItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: any[] | null = null;
      let query = supabase
        .from('memory_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUserId) {
        query = query.eq('user_id', currentUserId);
      }

      const res = await query;
      if (res.data) {
        data = res.data;
      } else if (res.error) {
        console.warn('Supabase query failed, falling back to API server:', res.error);
        const apiRes = await fetch(
          `/api/companion/memory-items${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`,
        );
        if (apiRes.ok) {
          data = await apiRes.json();
        }
      }

      if (data) {
        setItems(
          data.map((d: any) => ({
            id: d.id,
            fact: d.fact,
            approved: Boolean(d.approved),
            userId: d.user_id ?? d.userId ?? null,
            createdAt: d.created_at ?? d.createdAt ?? new Date().toISOString(),
          })),
        );
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching memory items:', err);
      try {
        const apiRes = await fetch(
          `/api/companion/memory-items${currentUserId ? `?userId=${encodeURIComponent(currentUserId)}` : ''}`,
        );
        if (apiRes.ok) {
          const apiData = await apiRes.json();
          setItems(
            apiData.map((d: any) => ({
              id: d.id,
              fact: d.fact,
              approved: Boolean(d.approved),
              userId: d.user_id ?? d.userId ?? null,
              createdAt: d.created_at ?? d.createdAt ?? new Date().toISOString(),
            })),
          );
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
        setError('Could not load memory items. Please try refreshing.');
      }
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchMemoryItems();
  }, [fetchMemoryItems]);

  // Unapproved item action: Approve
  const handleApprove = async (id: number) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: true } : item)),
    );
    try {
      const { error: sbError } = await supabase
        .from('memory_items')
        .update({ approved: true })
        .eq('id', id);
      if (sbError) {
        await fetch(`/api/companion/memory-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approved: true }),
        });
      }
    } catch (err) {
      console.error('Failed to approve memory item:', err);
      fetchMemoryItems();
    }
  };

  // Unapproved item action: Reject
  const handleReject = async (id: number) => {
    // Optimistic delete
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      const { error: sbError } = await supabase
        .from('memory_items')
        .delete()
        .eq('id', id);
      if (sbError) {
        await fetch(`/api/companion/memory-items/${id}`, {
          method: 'DELETE',
        });
      }
    } catch (err) {
      console.error('Failed to reject memory item:', err);
      fetchMemoryItems();
    }
  };

  // Approved item action: Start editing
  const handleStartEdit = (item: MemoryItem) => {
    setEditingId(item.id);
    setEditText(item.fact);
  };

  // Approved item action: Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  // Approved item action: Save edit
  const handleSaveEdit = async (id: number) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    // Optimistic update
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, fact: trimmed } : item)),
    );
    setEditingId(null);
    try {
      const { error: sbError } = await supabase
        .from('memory_items')
        .update({ fact: trimmed })
        .eq('id', id);
      if (sbError) {
        await fetch(`/api/companion/memory-items/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fact: trimmed }),
        });
      }
    } catch (err) {
      console.error('Failed to save memory item:', err);
      fetchMemoryItems();
    } finally {
      setSavingEdit(false);
    }
  };

  // Approved item action: Delete
  const handleDelete = async (id: number) => {
    // Optimistic delete
    setItems((prev) => prev.filter((item) => item.id !== id));
    try {
      const { error: sbError } = await supabase
        .from('memory_items')
        .delete()
        .eq('id', id);
      if (sbError) {
        await fetch(`/api/companion/memory-items/${id}`, {
          method: 'DELETE',
        });
      }
    } catch (err) {
      console.error('Failed to delete memory item:', err);
      fetchMemoryItems();
    }
  };

  // Manual add memory
  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFact.trim();
    if (!trimmed) return;
    setSavingNewFact(true);
    try {
      const { data, error: sbError } = await supabase
        .from('memory_items')
        .insert({
          fact: trimmed,
          approved: true,
          user_id: currentUserId,
        })
        .select()
        .single();

      if (data) {
        setItems((prev) => [
          {
            id: data.id,
            fact: data.fact,
            approved: Boolean(data.approved),
            userId: data.user_id,
            createdAt: data.created_at,
          },
          ...prev,
        ]);
      } else {
        const apiRes = await fetch('/api/companion/memory-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fact: trimmed,
            approved: true,
            userId: currentUserId,
          }),
        });
        if (apiRes.ok) {
          const item = await apiRes.json();
          setItems((prev) => [
            {
              id: item.id,
              fact: item.fact,
              approved: Boolean(item.approved),
              userId: item.userId,
              createdAt: item.createdAt,
            },
            ...prev,
          ]);
        }
      }
      setNewFact('');
      setIsAdding(false);
    } catch (err) {
      console.error('Failed to add memory item:', err);
    } finally {
      setSavingNewFact(false);
    }
  };

  const unapprovedItems = items.filter((i) => !i.approved);
  const approvedItems = items.filter((i) => i.approved);

  return (
    <AppShell>
      <PageHeading
        eyebrow="Your memory"
        title="You are in control."
        description="Unsaid can remember the details you choose to make conversations feel more continuous. Nothing is kept without your say."
        action={
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <div>
              <p className="text-xs font-bold">Memory {enabled ? 'on' : 'off'}</p>
              <p className="text-[10px] text-muted-foreground">For your companion</p>
            </div>
            <Toggle
              enabled={enabled}
              label="memory"
              onChange={(value) => {
                setEnabled(value);
                update.mutate(
                  { data: { enabled: value } },
                  {
                    onSuccess: () =>
                      client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }),
                    onError: () => setEnabled(!value),
                  },
                );
              }}
            />
          </div>
        }
      />

      {/* Prominent Explanation Banner */}
      <div
        className="mb-8 flex items-start gap-4 rounded-[22px] border border-accent/25 bg-accent/10 p-5 shadow-sm"
        data-testid="banner-memory-explanation"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-foreground">
          <ShieldCheck size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">
            The AI will only remember approved facts in future conversations.
          </p>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            After chat conversations, Unsaid notices key details and suggests them for your review. Unapproved items remain dormant until you approve them. You have complete control to edit or delete any approved memory at any time.
          </p>
        </div>
      </div>

      {error && <ErrorNotice message={error} />}

      {loading ? (
        <LoadingBlocks count={3} />
      ) : (
        <div className="space-y-8">
          {/* Unapproved Facts Section */}
          <section className="rounded-[25px] border border-border bg-secondary/35 p-6" data-testid="section-unapproved-memories">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <h2 className="text-sm font-bold">Pending Review (Unapproved)</h2>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-mono-ui text-[9px] uppercase tracking-wider text-primary">
                {unapprovedItems.length} pending review
              </span>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              Unsaid noticed these details during recent conversations. Choose whether to carry them forward.
            </p>

            {unapprovedItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-card/50 p-6 text-center" data-testid="empty-unapproved-memories">
                <p className="text-xs text-muted-foreground">
                  No unapproved facts pending review. When Unsaid notices new details in your conversations, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unapprovedItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-4 transition-all sm:flex-row sm:items-center sm:justify-between"
                    data-testid={`unapproved-item-${item.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent/20 text-foreground">
                        <Feather size={14} />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.fact}</p>
                        <p className="mt-0.5 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
                          Suggested {formatDate(item.createdAt, true)} · Unapproved
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        data-testid={`button-reject-memory-${item.id}`}
                      >
                        <X size={13} />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                        data-testid={`button-approve-memory-${item.id}`}
                      >
                        <Check size={13} />
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Approved Facts Section */}
          <section className="rounded-[25px] border border-border bg-card p-6" data-testid="section-approved-memories">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <LockKeyhole size={16} className="text-primary" />
                  <h2 className="text-sm font-bold">Approved Memories (Active in Conversations)</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  These verified facts shape your companion’s understanding and memory continuity.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-0.5 font-mono-ui text-[9px] uppercase tracking-wider text-primary">
                  {approvedItems.length} active {approvedItems.length === 1 ? 'fact' : 'facts'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(!isAdding)}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-secondary/50 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                  data-testid="button-toggle-add-memory"
                >
                  <Plus size={13} />
                  <span>Add fact</span>
                </button>
              </div>
            </div>

            {/* Manual Add Form */}
            {isAdding && (
              <form onSubmit={handleAddFact} className="mb-5 rounded-2xl border border-border/80 bg-secondary/20 p-4" data-testid="form-add-memory">
                <label htmlFor="input-new-fact" className="block text-xs font-medium text-foreground mb-1.5">
                  What would you like Unsaid to remember?
                </label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="input-new-fact"
                    type="text"
                    value={newFact}
                    onChange={(e) => setNewFact(e.target.value)}
                    placeholder="e.g. Prefers quiet presence before jumping into advice"
                    className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-new-memory-fact"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdding(false);
                        setNewFact('');
                      }}
                      className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingNewFact || !newFact.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50 transition-opacity"
                      data-testid="button-save-new-memory"
                    >
                      <Check size={13} />
                      Save memory
                    </button>
                  </div>
                </div>
              </form>
            )}

            {approvedItems.length === 0 ? (
              <EmptyState
                icon={LockKeyhole}
                title="No approved memories yet"
                description="The AI will only remember approved facts in future conversations. Approve suggestions above or add one directly to give your companion continuity."
              />
            ) : (
              <div className="space-y-3">
                {approvedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-4 transition-all hover:border-border/90"
                    data-testid={`approved-item-${item.id}`}
                  >
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full rounded-xl border border-primary/50 bg-secondary/30 px-3.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            data-testid={`input-edit-fact-${item.id}`}
                            autoFocus
                          />
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                            data-testid={`button-cancel-fact-${item.id}`}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={savingEdit || !editText.trim()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50 transition-opacity"
                            data-testid={`button-save-fact-${item.id}`}
                          >
                            <Check size={13} />
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                            <Sparkles size={14} />
                          </span>
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.fact}</p>
                            <p className="mt-0.5 font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
                              Approved {formatDate(item.createdAt, true)} · Active
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            className="inline-flex items-center gap-1 rounded-xl p-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            aria-label={`Edit ${item.fact}`}
                            data-testid={`button-edit-memory-${item.id}`}
                          >
                            <Pencil size={14} />
                            <span className="text-xs">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="inline-flex items-center gap-1 rounded-xl p-2 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            aria-label={`Delete ${item.fact}`}
                            data-testid={`button-delete-memory-${item.id}`}
                          >
                            <Trash2 size={14} />
                            <span className="text-xs">Delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

export function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [showInsights, setShowInsights] = useState(true);
  const [saved, setSaved] = useState(false);
  return <AppShell><PageHeading eyebrow="The private details" title="Make it feel like yours." description="Small choices for the way you want Unsaid to show up." /><div className="grid gap-5 lg:grid-cols-[1fr_320px]"><div className="space-y-5"><section className="rounded-[25px] border border-border bg-card p-6"><SectionLabel>Companion presence</SectionLabel><div className="divide-y divide-border/70"><div className="flex items-center justify-between gap-6 py-5 first:pt-2"><div><h2 className="text-sm font-bold">Gentle check-in reminders</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">A soft nudge when you have asked for one.</p></div><Toggle enabled={notifications} label="gentle check-in reminders" onChange={setNotifications} /></div><div className="flex items-center justify-between gap-6 py-5"><div><h2 className="text-sm font-bold">Use reflections in Insights</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Let patterns from your conversations shape your dashboard.</p></div><Toggle enabled={showInsights} label="use reflections in insights" onChange={setShowInsights} /></div></div></section><section className="rounded-[25px] border border-border bg-card p-6"><SectionLabel>Your data</SectionLabel><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-sm font-bold">Everything can leave with you.</h2><p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Your journal, conversations, and memories belong to you. You can request a copy or clear a space whenever you need.</p></div><Button variant="outline" onClick={() => setSaved(true)} data-testid="button-export-data"><ArrowUpRight size={14} />Request export</Button></div></section><Button onClick={() => setSaved(true)} data-testid="button-save-settings"><Check size={14} />{saved ? 'Saved for now' : 'Save preferences'}</Button></div><aside className="h-fit rounded-[25px] bg-primary p-6 text-primary-foreground"><div className="mb-5 grid size-11 place-items-center rounded-2xl bg-accent text-foreground"><ShieldCheck size={20} /></div><h2 className="font-display text-2xl">No performance here.</h2><p className="mt-3 text-sm leading-6 text-primary-foreground/65">Unsaid is a room to be honest in, not a place to become a better version of yourself on schedule.</p><div className="mt-8 space-y-3 border-t border-primary-foreground/15 pt-5 font-mono-ui text-[9px] uppercase tracking-[.15em] text-primary-foreground/55"><div className="flex items-center gap-2"><Check size={12} className="text-accent" />Private by default</div><div className="flex items-center gap-2"><Check size={12} className="text-accent" />You choose what stays</div><div className="flex items-center gap-2"><Check size={12} className="text-accent" />No perfect words needed</div></div></aside></div></AppShell>;
}
