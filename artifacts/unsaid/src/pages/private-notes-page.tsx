import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Clock3, LockKeyhole, Mail, Plus, ShieldCheck, Sparkles, Trash2, Timer } from 'lucide-react';
import {
  getListPrivateNotesQueryKey,
  useCreatePrivateNote,
  useDeletePrivateNote,
  useListPrivateNotes,
} from '@workspace/api-client-react';
import type { PrivateNote } from '@workspace/api-client-react';
import { AppShell, Button, EmptyState, ErrorNotice, formatDate, LoadingBlocks, PageHeading } from '@/components/unsaid-ui';

export function PrivateNotesPage() {
  const client = useQueryClient();
  const query = useListPrivateNotes({ query: { queryKey: getListPrivateNotesQueryKey() } });
  const rawNotes = query.data;
  const allNotes: PrivateNote[] = Array.isArray(rawNotes) ? rawNotes : [];
  
  // Filter out any entries that have passed their expiration date
  const notes = allNotes.filter((note) => !note.expiresAt || new Date(note.expiresAt) > new Date());

  const [content, setContent] = useState('');
  const [isLetter, setIsLetter] = useState(false);
  const [expiryDays, setExpiryDays] = useState<'never' | '7' | '30'>('never');
  const [notice, setNotice] = useState('');

  const createNote = useCreatePrivateNote();
  const deleteNote = useDeletePrivateNote();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || createNote.isPending) return;

    let expiresAt: string | undefined = undefined;
    if (expiryDays === '7') {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiryDays === '30') {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    createNote.mutate(
      { data: { content: content.trim(), isLetter, expiresAt } },
      {
        onSuccess: () => {
          setContent('');
          setIsLetter(false);
          setExpiryDays('never');
          setNotice('');
          client.invalidateQueries({ queryKey: getListPrivateNotesQueryKey() });
        },
        onError: () => setNotice('Could not save your private note right now. Please try again.'),
      }
    );
  };

  const remove = (id: number) => {
    if (window.confirm('Permanently delete this private entry?')) {
      deleteNote.mutate({ noteId: id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListPrivateNotesQueryKey() }) });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl animate-rise">
        {/* Header with Muted Dark Aesthetic */}
        <div className="relative mb-8 overflow-hidden rounded-[28px] border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-zinc-100 shadow-xl md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-[11px] font-semibold text-amber-300">
              <LockKeyhole size={14} className="text-amber-400" />
              <span>Isolated Vault • Zero AI Access</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Encrypted & Private</span>
            </div>
          </div>
          <h1 className="font-display text-[clamp(2.2rem,5vw,3.6rem)] leading-none tracking-[-.05em] text-zinc-50">
            Something I can’t tell anyone.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
            A quiet container for raw thoughts, unsaid feelings, or letters you will never send.
            Nothing written here is ever read, processed, or remembered by the AI.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={submit} className="mb-10 rounded-[28px] border border-zinc-800/80 bg-zinc-900/90 p-5 shadow-lg md:p-7">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write whatever you need to get off your chest..."
            rows={5}
            className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-amber-500/60"
            data-testid="input-private-note-content"
          />

          <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isLetter}
                onChange={(e) => setIsLetter(e.target.checked)}
                className="mt-1 size-4 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500/40"
                data-testid="checkbox-is-letter"
              />
              <div>
                <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-200">
                  <Mail size={13} className="text-amber-400" />
                  Mark as a letter I’ll never send
                </span>
                <span className="block text-[11px] text-zinc-400">
                  For writing to a person, situation, or past self with no intention of sending it.
                </span>
              </div>
            </label>

            {/* Expiry Selector Dropdown */}
            <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <Timer size={13} className="text-zinc-400" />
              <label htmlFor="expiry-select" className="text-xs font-medium text-zinc-400">Delete after:</label>
              <select
                id="expiry-select"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value as 'never' | '7' | '30')}
                className="bg-transparent text-xs font-bold text-amber-300 outline-none cursor-pointer"
                data-testid="select-expiry-days"
              >
                <option value="never" className="bg-zinc-900 text-zinc-100">Never</option>
                <option value="7" className="bg-zinc-900 text-zinc-100">7 days</option>
                <option value="30" className="bg-zinc-900 text-zinc-100">30 days</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!content.trim() || createNote.isPending}
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-xs font-bold text-zinc-950 transition-all hover:bg-amber-400 disabled:opacity-40"
              data-testid="button-save-private-note"
            >
              <LockKeyhole size={14} />
              {createNote.isPending ? 'Locking away...' : 'Lock in private vault'}
            </button>
          </div>

          <p className="mt-3 text-[11px] text-zinc-500 italic">
            Note: Entries past their expiry date will automatically be hidden and cleaned up.
          </p>

          {notice && <p className="mt-2 text-xs text-rose-400">{notice}</p>}
        </form>

        {/* Past Entries List (Newest First) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-zinc-400">
              Private Entries ({notes.length})
            </h2>
            <span className="text-[10px] text-zinc-500">Sorted newest first</span>
          </div>

          {query.isLoading && <LoadingBlocks count={3} />}
          {query.isError && !notes.length && <ErrorNotice message="Private vault is locked or unreachable right now." />}
          {!query.isLoading && notes.length === 0 && (
            <EmptyState
              icon={LockKeyhole}
              title="Your private vault is empty"
              description="Write down the thoughts you need to release without anyone reading them."
            />
          )}

          {notes.map((note) => (
            <article
              key={note.id}
              className="group relative flex flex-col rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-6 text-zinc-100 transition-all hover:border-zinc-700"
              data-testid={`card-private-note-${note.id}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  {note.isLetter ? (
                    <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-amber-300">
                      <Mail size={12} className="text-amber-400" />
                      Unsent Letter
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 font-mono-ui text-[9px] uppercase tracking-wider text-zinc-400">
                      <LockKeyhole size={11} className="text-zinc-400" />
                      Private Note
                    </span>
                  )}

                  {note.expiresAt && (
                    <span className="flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 font-mono-ui text-[8px] uppercase tracking-wider text-rose-300">
                      <Timer size={11} className="text-rose-400" />
                      Auto-deletes {formatDate(note.expiresAt, true)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => remove(note.id)}
                  className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label="Delete entry"
                  data-testid={`button-delete-note-${note.id}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <p className="whitespace-pre-wrap text-sm leading-6 text-zinc-200">{note.content}</p>

              <div className="mt-6 flex items-center gap-1.5 pt-4 border-t border-zinc-800/80 font-mono-ui text-[9px] uppercase tracking-wider text-zinc-500">
                <Clock3 size={11} />
                Saved {formatDate(note.createdAt, true)}
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
