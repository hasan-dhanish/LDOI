import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Search, Trash2 } from 'lucide-react';
import { JOURNAL_TAGS, formatDateShort } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { JournalEntry, JournalKind } from '../types';

const DEFAULT_BOOKS: { name: string; color: string; subtitle: string }[] = [
  { name: 'General Ideas', color: '#0A5386', subtitle: 'Team brainstorms & scratch notes' },
  { name: 'ERP & POS Notes', color: '#254454', subtitle: 'Architecture, billing & retail flows' },
  { name: 'Hardware & R&D', color: '#133F47', subtitle: 'Circuits, printers & device specs' },
  { name: 'Sales & Clients', color: '#8B1E1E', subtitle: 'Pitches, pricing & client learnings' },
];

const EXTRA_BOOK_COLORS = ['#1B5E5A', '#2F333C', '#0A5386', '#254454', '#8B1E1E'];

function getEntryBookName(entry: JournalEntry): string {
  const bookTag = entry.tags.find((t) => t.startsWith('book:'));
  return bookTag ? bookTag.slice(5) : 'General Ideas';
}

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

  const [openBookName, setOpenBookName] = useState<string | null>(null);
  const [bookSearch, setBookSearch] = useState('');
  const [newBookInput, setNewBookInput] = useState('');
  const [customBooks, setCustomBooks] = useState<string[]>([]);

  const [kindFilter, setKindFilter] = useState<'All' | JournalKind>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const lastLocalEditRef = useRef<number>(0);
  const lastTitleEditRef = useRef<number>(0);
  const latestDraftRef = useRef<string>('');
  const latestTitleRef = useRef<string>('');
  const lastEntryIdRef = useRef<string | null>(null);

  // Combine default books + any custom books found in existing notes
  const books = useMemo(() => {
    const map = new Map<string, { name: string; color: string; subtitle: string }>();
    DEFAULT_BOOKS.forEach((b) => map.set(b.name, b));
    let extraIdx = 0;
    for (const entry of journalEntries) {
      const bName = getEntryBookName(entry);
      if (!map.has(bName)) {
        map.set(bName, {
          name: bName,
          color: EXTRA_BOOK_COLORS[extraIdx % EXTRA_BOOK_COLORS.length],
          subtitle: 'Custom team notebook',
        });
        extraIdx++;
      }
    }
    for (const bName of customBooks) {
      if (!map.has(bName)) {
        map.set(bName, {
          name: bName,
          color: EXTRA_BOOK_COLORS[extraIdx % EXTRA_BOOK_COLORS.length],
          subtitle: 'Custom team notebook',
        });
        extraIdx++;
      }
    }
    return Array.from(map.values());
  }, [journalEntries, customBooks]);

  const bookPages = useMemo(() => {
    if (!openBookName) return [];
    return journalEntries.filter((e) => {
      if (getEntryBookName(e) !== openBookName) return false;
      if (kindFilter !== 'All' && e.kind !== kindFilter) return false;
      return true;
    });
  }, [journalEntries, openBookName, kindFilter]);

  const activeEntry =
    bookPages.find((e) => e.id === selectedId) ?? bookPages[0] ?? null;

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

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBookInput.trim();
    if (!clean) return;
    setCustomBooks((prev) => (prev.includes(clean) ? prev : [...prev, clean]));
    setNewBookInput('');
    setOpenBookName(clean);
    const created = await createJournalEntry({
      kind: 'Idea',
      title: 'Page 1',
      content: '',
      tags: [`book:${clean}`],
    });
    setSelectedId(created.id);
  };

  const handleCreatePage = async (kind: JournalKind) => {
    if (!openBookName) return;
    const pageNum = journalEntries.filter((e) => getEntryBookName(e) === openBookName).length + 1;
    const created = await createJournalEntry({
      kind,
      title: `Page ${pageNum}: ${kind === 'Idea' ? 'New Idea' : 'New Learning'}`,
      content: '',
      tags: [`book:${openBookName}`],
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

  // BOOKSHELF VIEW (Apple Books 3D Shelf Ledges)
  if (!openBookName) {
    const visibleBooks = books.filter((b) =>
      bookSearch.trim()
        ? b.name.toLowerCase().includes(bookSearch.toLowerCase()) ||
          b.subtitle.toLowerCase().includes(bookSearch.toLowerCase())
        : true
    );
    const coreShelf = visibleBooks.filter((b) =>
      DEFAULT_BOOKS.some((d) => d.name === b.name)
    );
    const customShelf = visibleBooks.filter(
      (b) => !DEFAULT_BOOKS.some((d) => d.name === b.name)
    );

    const renderBookShelfRow = (shelfTitle: string, shelfBooks: typeof books) => {
      if (shelfBooks.length === 0) return null;
      return (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#71717A]">
              {shelfTitle}
            </h2>
            <span className="text-[11px] font-mono-num text-[#71717A]">
              {shelfBooks.length} {shelfBooks.length === 1 ? 'book' : 'books'}
            </span>
          </div>

          <div className="pt-2">
            {/* Upright Books standing directly on the shelf ledge */}
            <div className="flex flex-wrap items-end gap-5 sm:gap-7 px-4 sm:px-6">
              {shelfBooks.map((book) => {
                const pages = journalEntries.filter((e) => getEntryBookName(e) === book.name);
                return (
                  <button
                    key={book.name}
                    type="button"
                    onClick={() => {
                      setOpenBookName(book.name);
                      setSelectedId(pages[0]?.id ?? null);
                    }}
                    className="ios-press group relative text-left focus:outline-none"
                  >
                    {/* Contact shadow resting on the shelf */}
                    <div className="absolute -bottom-1 inset-x-1 h-2.5 bg-black/45 blur-[4px] rounded-full transition-all duration-200 group-hover:scale-x-90 group-hover:opacity-60" />

                    <div
                      className="relative w-32 sm:w-36 h-46 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_8px_18px_rgba(0,0,0,0.38)] overflow-hidden transition-transform duration-200 group-hover:-translate-y-2"
                      style={{ backgroundColor: book.color }}
                    >
                      {/* Studio Cover Sheen & Vignette */}
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                        }}
                      />

                      {/* Realistic 3D Curved Spine + Hinge Groove */}
                      <div
                        className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                        style={{
                          background:
                            'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                        }}
                      />
                      <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />

                      {/* Subtle Debossed Cover Frame */}
                      <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />

                      {/* V-Notched Bookmark Ribbon */}
                      <div
                        className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                        style={{
                          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                        }}
                      />

                      <div className="relative z-10 pl-3.5 pr-1 pt-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-white/65">
                          LDOI Book
                        </span>
                        <h3 className="mt-1 text-xs font-bold leading-snug text-white drop-shadow-2xs line-clamp-2">
                          {book.name}
                        </h3>
                        <p className="mt-1 text-[10px] text-white/75 line-clamp-2 leading-tight">
                          {book.subtitle}
                        </p>
                      </div>

                      <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                        <span>{pages.length} {pages.length === 1 ? 'pg' : 'pgs'}</span>
                        <BookOpen className="w-3 h-3 opacity-80" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 3D Physical Shelf Ledge */}
            <div className="book-shelf-ledge w-full relative z-10" />
          </div>
        </section>
      );
    };

    return (
      <div className="space-y-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E4E2DC]">
          <div>
            <h1 className="text-xl font-semibold text-[#18181B]">
              Live Notes &amp; Idea Books
            </h1>
            <p className="text-xs text-[#71717A] mt-0.5">
              Select a book from the shelf to view or add pages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-2" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search in library..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] w-44"
              />
            </div>

            <form onSubmit={handleCreateBook} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newBookInput}
                onChange={(e) => setNewBookInput(e.target.value)}
                placeholder="New book name..."
                className="px-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] w-36"
              />
              <button
                type="submit"
                className="ios-press inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> New Book
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-8">
          {renderBookShelfRow('Studio Notebooks', coreShelf)}
          {renderBookShelfRow('Custom Notebooks', customShelf)}
        </div>
      </div>
    );
  }

  // OPEN BOOK VIEW (Separate Pages Inside Selected Book)
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E2DC]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpenBookName(null)}
            className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E4E2DC] hover:border-[#0A5386] rounded-lg text-[#18181B]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All Books
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#18181B]">{openBookName}</h1>
            <p className="text-[11px] text-[#71717A]">
              {bookPages.length} {bookPages.length === 1 ? 'page' : 'pages'} inside this book
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleCreatePage('Idea')}
            className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> New Idea Page
          </button>
          <button
            type="button"
            onClick={() => handleCreatePage('Learning')}
            className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#254454] hover:bg-[#2E5468] text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> New Learning Page
          </button>
        </div>
      </div>

      {/* Realistic Physical Hardcover Ring-Bound Open Book */}
      <div className="p-2.5 sm:p-3 rounded-[22px] bg-[#2C2925] shadow-[0_18px_44px_rgba(0,0,0,0.28)] border border-black/30">
        <div className="relative rounded-xl overflow-hidden grid lg:grid-cols-12 min-h-[560px] bg-[#FCFBF8] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]">
          {/* Realistic Metallic Twin-Loop Binder Rings + Punched Holes (Desktop) */}
          <div className="hidden lg:flex flex-col justify-evenly items-center absolute left-1/3 -translate-x-1/2 inset-y-4 z-20 pointer-events-none">
            {[0, 1, 2, 3, 4].map((ring) => (
              <div key={ring} className="relative flex items-center justify-center w-11 h-4">
                <span className="absolute left-0.5 w-3 h-3 rounded-full bg-[#1C1B19] border border-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                <span className="absolute right-0.5 w-3 h-3 rounded-full bg-[#1C1B19] border border-black/40 shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]" />
                <span className="relative z-10 w-8 h-2 rounded-full bg-gradient-to-b from-[#F3F4F6] via-[#9CA3AF] to-[#374151] border border-black/35 shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
              </div>
            ))}
          </div>

          {/* Left Page: Pages Index Inside This Book */}
          <div className="lg:col-span-4 bg-[#F7F4EC] border-b lg:border-b-0 lg:border-r border-[#D6D0C2] p-5 lg:pr-8 flex flex-col shadow-[inset_-16px_0_24px_-16px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52525B]">
                Pages
              </span>
              <div className="flex gap-1">
                {(['All', 'Idea', 'Learning'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKindFilter(k)}
                    className={`px-2 py-1 text-[11px] font-medium rounded border ${
                      kindFilter === k
                        ? 'bg-[#0A5386] text-white border-[#0A5386]'
                        : 'bg-white text-[#52525B] border-[#E4E2DC]'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {bookPages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#71717A]">
                  This book has no pages yet. Click &ldquo;New Idea Page&rdquo; or &ldquo;New Learning Page&rdquo; above.
                </div>
              ) : (
                bookPages.map((entry, idx) => {
                  const selected = activeEntry?.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selected
                          ? 'bg-white border-[#0A5386] shadow-2xs'
                          : 'bg-white/70 border-[#E4E2DC] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                        <span
                          className={
                            entry.kind === 'Idea' ? 'text-[#5FA8E0]' : 'text-[#4D8B6F]'
                          }
                        >
                          Page {idx + 1} · {entry.kind}
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

          {/* Right Page: Ruled Paper Live Editor */}
          <div className="lg:col-span-8 bg-[#FCFBF8] p-6 lg:pl-10 flex flex-col shadow-[inset_16px_0_24px_-16px_rgba(0,0,0,0.16)]">
            {!activeEntry ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#71717A]">
                <BookOpen className="w-7 h-7 mb-2" />
                <p className="text-sm font-medium text-[#18181B]">No page selected</p>
                <p className="text-xs mt-1">
                  Create a new page above to start writing notes in {openBookName}.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-4">
                <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-[#E4E2DC]">
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Page title..."
                    className="notebook-title-input flex-1 text-lg font-semibold text-[#18181B] bg-transparent border-0 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {((incomingTyping && incomingTyping.author !== currentUser?.name) ||
                      (incomingTitleTyping && incomingTitleTyping.author !== currentUser?.name)) && (
                      <span className="px-2 py-1 text-[11px] font-medium bg-[#0A5386]/15 text-[#5FA8E0] rounded">
                        {(incomingTyping?.author || incomingTitleTyping?.author)} is typing...
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
                              ? 'bg-[#0A5386] text-white border-[#0A5386]'
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
                  className="w-full flex-1 min-h-[340px] p-3 text-sm text-[#18181B] ruled-paper border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
