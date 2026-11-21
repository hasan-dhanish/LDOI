import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { JOURNAL_TAGS, formatDateShort } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { JournalKind } from '../types';

export const JournalView: React.FC = () => {
  const {
    journalEntries,
    projects,
    currentUser,
    liveTypingMap,
    createJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    broadcastTyping,
  } = useLdoi();

  const [kindFilter, setKindFilter] = useState<'All' | JournalKind>('All');
  const [selectedId, setSelectedId] = useState<string | null>(journalEntries[0]?.id ?? null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const lastLocalEditRef = useRef<number>(0);
  const lastTitleEditRef = useRef<number>(0);
  const latestDraftRef = useRef<string>('');
  const latestTitleRef = useRef<string>('');
  const lastEntryIdRef = useRef<string | null>(null);

  const filtered = journalEntries.filter((e) =>
    kindFilter === 'All' ? true : e.kind === kindFilter
  );

  const activeEntry =
    journalEntries.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  const typingKey = activeEntry ? `journal:${activeEntry.id}` : '';
  const titleTypingKey = activeEntry ? `journal-title:${activeEntry.id}` : '';
  const incomingTyping = typingKey ? liveTypingMap[typingKey] : undefined;
  const incomingTitleTyping = titleTypingKey ? liveTypingMap[titleTypingKey] : undefined;

  useEffect(() => {
    if (!activeEntry) return;
    const switchedEntry = lastEntryIdRef.current !== activeEntry.id;
    if (switchedEntry) {
      lastEntryIdRef.current = activeEntry.id;
      lastLocalEditRef.current = 0;
      lastTitleEditRef.current = 0;
    }
    const now = Date.now();
    const recentlyEditedContent = now - lastLocalEditRef.current < 1800;
    if (
      (switchedEntry || !recentlyEditedContent) &&
      (!incomingTyping || incomingTyping.author === currentUser?.name)
    ) {
      setDraftContent(activeEntry.content);
      latestDraftRef.current = activeEntry.content;
    }
    const recentlyEditedTitle = now - lastTitleEditRef.current < 1800;
    if (
      (switchedEntry || !recentlyEditedTitle) &&
      (!incomingTitleTyping || incomingTitleTyping.author === currentUser?.name)
    ) {
      setDraftTitle(activeEntry.title);
      latestTitleRef.current = activeEntry.title;
    }
  }, [
    activeEntry?.id,
    activeEntry?.content,
    activeEntry?.title,
    incomingTyping,
    incomingTitleTyping,
    currentUser?.name,
    activeEntry,
  ]);

  useEffect(() => {
    if (incomingTyping && incomingTyping.author !== currentUser?.name) {
      setDraftContent(incomingTyping.text);
      latestDraftRef.current = incomingTyping.text;
    }
  }, [incomingTyping, currentUser?.name]);

  useEffect(() => {
    if (incomingTitleTyping && incomingTitleTyping.author !== currentUser?.name) {
      setDraftTitle(incomingTitleTyping.text);
      latestTitleRef.current = incomingTitleTyping.text;
    }
  }, [incomingTitleTyping, currentUser?.name]);

  const handleCreate = async (kind: JournalKind) => {
    const created = await createJournalEntry({
      kind,
      title: kind === 'Idea' ? 'Untitled Idea' : 'New Learning Note',
      content: '',
      tags: [],
    });
    setSelectedId(created.id);
  };

  const handleTitleChange = (val: string) => {
    if (!activeEntry) return;
    lastTitleEditRef.current = Date.now();
    latestTitleRef.current = val;
    setDraftTitle(val);
    broadcastTyping(`journal-title:${activeEntry.id}`, val);
    if (titleSaveTimerRef.current) window.clearTimeout(titleSaveTimerRef.current);
    const targetId = activeEntry.id;
    titleSaveTimerRef.current = window.setTimeout(() => {
      updateJournalEntry(targetId, { title: latestTitleRef.current });
    }, 350);
  };

  const handleContentChange = (val: string) => {
    if (!activeEntry) return;
    lastLocalEditRef.current = Date.now();
    latestDraftRef.current = val;
    setDraftContent(val);
    broadcastTyping(`journal:${activeEntry.id}`, val);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const targetId = activeEntry.id;
    saveTimerRef.current = window.setTimeout(() => {
      updateJournalEntry(targetId, { content: latestDraftRef.current });
    }, 350);
  };

  const toggleTag = (tag: string) => {
    if (!activeEntry) return;
    const has = activeEntry.tags.includes(tag);
    const next = has
      ? activeEntry.tags.filter((t) => t !== tag)
      : [...activeEntry.tags, tag];
    updateJournalEntry(activeEntry.id, { tags: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E2DC]">
        <div>
          <h1 className="text-xl font-semibold text-[#18181B]">Ideas &amp; Learnings Notebook</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Two-page team journal for pitching ideas and recording what we learn on projects.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCreate('Idea')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md"
          >
            <Plus className="w-3.5 h-3.5" /> New Idea
          </button>
          <button
            type="button"
            onClick={() => handleCreate('Learning')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-white rounded-md"
          >
            <Plus className="w-3.5 h-3.5" /> New Learning
          </button>
        </div>
      </div>

      {/* Realistic Physical Hardcover Ring-Bound Open Notebook */}
      <div className="p-2.5 sm:p-3 rounded-[22px] bg-[#2C2925] shadow-[0_18px_44px_rgba(0,0,0,0.28)] border border-black/30">
        <div className="relative rounded-xl overflow-hidden grid lg:grid-cols-12 min-h-[560px] bg-[#FCFBF8] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
          {/* Realistic Metallic Twin-Loop Binder Rings + Punched Holes (Desktop) */}
          <div className="hidden lg:flex flex-col justify-evenly items-center absolute left-1/3 -translate-x-1/2 inset-y-4 z-20 pointer-events-none">
            {[0, 1, 2, 3, 4].map((ring) => (
              <div key={ring} className="relative flex items-center justify-center w-11 h-4">
                {/* Left & Right Punched Holes */}
                <span className="absolute left-0.5 w-3 h-3 rounded-full bg-[#1C1B19] border border-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                <span className="absolute right-0.5 w-3 h-3 rounded-full bg-[#1C1B19] border border-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                {/* Metallic Ring Looping Into Both Holes */}
                <span className="relative z-10 w-8 h-2 rounded-full bg-gradient-to-b from-[#F3F4F6] via-[#9CA3AF] to-[#374151] border border-black/35 shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
              </div>
            ))}
          </div>

          {/* Left Page: Index of Ideas & Learnings with Spine Shadow */}
          <div className="lg:col-span-4 bg-[#F7F4EC] border-b lg:border-b-0 lg:border-r border-[#D6D0C2] p-5 lg:pr-8 flex flex-col shadow-[inset_-16px_0_24px_-16px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#52525B]">
              Notebook Index
            </span>
            <div className="flex gap-1">
              {(['All', 'Idea', 'Learning'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKindFilter(k)}
                  className={`px-2 py-1 text-[11px] font-medium rounded border ${
                    kindFilter === k
                      ? 'bg-[#18181B] text-white border-[#18181B]'
                      : 'bg-white text-[#52525B] border-[#E4E2DC]'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto flex-1 pr-1">
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#71717A]">
                No entries yet. Click &ldquo;New Idea&rdquo; or &ldquo;New Learning&rdquo; above.
              </div>
            ) : (
              filtered.map((entry) => {
                const selected = activeEntry?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId(entry.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-white border-[#0071E3] shadow-2xs'
                        : 'bg-white/70 border-[#E4E2DC] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                      <span
                        className={
                          entry.kind === 'Idea' ? 'text-[#0071E3]' : 'text-[#0F766E]'
                        }
                      >
                        {entry.kind}
                      </span>
                      <span className="text-[#71717A]">{entry.author}</span>
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[#18181B] truncate">
                      {entry.title}
                    </div>
                    <div className="mt-1 text-[11px] text-[#71717A] font-mono-num">
                      {formatDateShort(entry.updatedAt)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Page: Ruled Paper Live Editor with Spine Gutter Shadow */}
        <div className="lg:col-span-8 bg-[#FCFBF8] p-6 lg:pl-10 flex flex-col shadow-[inset_16px_0_24px_-16px_rgba(0,0,0,0.16)]">
          {!activeEntry ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-[#71717A]">
              <BookOpen className="w-7 h-7 mb-2" />
              <p className="text-sm font-medium text-[#18181B]">Open a page or create a note</p>
              <p className="text-xs mt-1">
                Everything typed here syncs in real time across Hasan, Aathavan, Allen, and Harsath.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex items-start justify-between gap-3">
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="flex-1 text-lg font-semibold text-[#18181B] bg-transparent border-b border-transparent focus:border-[#0071E3] focus:outline-none pb-1"
                />
                <div className="flex items-center gap-2 shrink-0">
                  {incomingTyping && incomingTyping.author !== currentUser?.name && (
                    <span className="px-2 py-1 text-[11px] font-medium bg-[#0071E3]/10 text-[#0071E3] rounded">
                      {incomingTyping.author} is typing...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteJournalEntry(activeEntry.id)}
                    className="p-1.5 text-[#71717A] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Metadata & Tags */}
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#E4E2DC]">
                <select
                  value={activeEntry.kind}
                  onChange={(e) =>
                    updateJournalEntry(activeEntry.id, { kind: e.target.value as JournalKind })
                  }
                  className="px-2 py-1 text-[11px] font-medium bg-white border border-[#E4E2DC] rounded"
                >
                  <option value="Idea">Idea</option>
                  <option value="Learning">Learning</option>
                </select>

                <select
                  value={activeEntry.projectId ?? ''}
                  onChange={(e) =>
                    updateJournalEntry(activeEntry.id, {
                      projectId: e.target.value || undefined,
                    })
                  }
                  className="px-2 py-1 text-[11px] bg-white border border-[#E4E2DC] rounded"
                >
                  <option value="">General (No linked project)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      Project: {p.title}
                    </option>
                  ))}
                </select>

                <div className="flex flex-wrap gap-1 ml-auto">
                  {JOURNAL_TAGS.map((tag) => {
                    const active = activeEntry.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2 py-0.5 text-[10px] font-medium rounded border ${
                          active
                            ? 'bg-[#0071E3] text-white border-[#0071E3]'
                            : 'bg-white text-[#52525B] border-[#E4E2DC]'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ruled Writing Area */}
              <textarea
                value={draftContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write down your thoughts, technical findings, or business ideas..."
                className="w-full flex-1 min-h-[340px] p-3 text-sm text-[#18181B] ruled-paper border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0071E3] resize-none"
              />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};
