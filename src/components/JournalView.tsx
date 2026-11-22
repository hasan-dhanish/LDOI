import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  BookOpen,
  Check,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Minus,
  Plus,
  Search,
  Strikethrough,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { formatDateShort } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { JournalEntry } from '../types';
import { ConfirmModal } from './ConfirmModal';

const BOOK_COLORS = ['#0A5386', '#254454', '#133F47', '#8B1E1E', '#1B5E5A', '#2F333C'];

function getEntryBookName(entry: JournalEntry): string {
  const bookTag = entry.tags.find((t) => t.startsWith('book:'));
  return bookTag ? bookTag.slice(5) : 'Notes';
}

function getEntryBookColor(entry: JournalEntry): string | null {
  const colorTag = entry.tags.find((t) => t.startsWith('color:'));
  return colorTag ? colorTag.slice(6) : null;
}

function getDisplayTags(tags: string[]): string[] {
  return tags.filter((t) => !t.startsWith('book:') && !t.startsWith('color:'));
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
  const [showNewBookModal, setShowNewBookModal] = useState(false);
  const [newBookInput, setNewBookInput] = useState('');
  const [newBookColor, setNewBookColor] = useState(BOOK_COLORS[0]);
  const [newBookFirstPage, setNewBookFirstPage] = useState('');
  const [customBooks, setCustomBooks] = useState<{ name: string; color: string }[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [fontColor, setFontColor] = useState('#18181B');
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [deleteBookTarget, setDeleteBookTarget] = useState<{
    name: string;
    pageIds: string[];
  } | null>(null);
  const [openingBook, setOpeningBook] = useState<{
    name: string;
    color: string;
    firstPageId: string | null;
    fromRect: { left: number; top: number; width: number; height: number };
    stage: 'start' | 'center' | 'open' | 'zoom';
  } | null>(null);
  const openTimersRef = useRef<number[]>([]);

  const clearOpenTimers = () => {
    openTimersRef.current.forEach((t) => window.clearTimeout(t));
    openTimersRef.current = [];
  };

  useEffect(() => clearOpenTimers, []);

  const triggerOpenBook = (
    book: { name: string; color: string },
    firstPageId: string | null,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    clearOpenTimers();
    const r = e.currentTarget.getBoundingClientRect();
    setOpeningBook({
      name: book.name,
      color: book.color,
      firstPageId,
      fromRect: { left: r.left, top: r.top, width: r.width, height: r.height },
      stage: 'start',
    });

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setOpeningBook((prev) => (prev ? { ...prev, stage: 'center' } : null));
      });
    });

    const t1 = window.setTimeout(() => {
      setOpeningBook((prev) => (prev ? { ...prev, stage: 'open' } : null));
    }, 280);

    const t2 = window.setTimeout(() => {
      setOpeningBook((prev) => (prev ? { ...prev, stage: 'zoom' } : null));
    }, 580);

    const t3 = window.setTimeout(() => {
      setOpenBookName(book.name);
      setSelectedId(firstPageId);
      setOpeningBook(null);
    }, 860);

    openTimersRef.current = [t1, t2, t3];
  };

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const saveTimerRef = useRef<number | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const lastLocalEditRef = useRef<number>(0);
  const lastTitleEditRef = useRef<number>(0);
  const latestDraftRef = useRef<string>('');
  const latestTitleRef = useRef<string>('');
  const lastEntryIdRef = useRef<string | null>(null);

  // Books derived only from existing team entries + newly created books
  const books = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    let idx = 0;
    for (const entry of journalEntries) {
      const bName = getEntryBookName(entry);
      const taggedColor = getEntryBookColor(entry);
      if (!map.has(bName)) {
        map.set(bName, {
          name: bName,
          color: taggedColor ?? BOOK_COLORS[idx % BOOK_COLORS.length],
        });
        idx++;
      } else if (taggedColor) {
        map.get(bName)!.color = taggedColor;
      }
    }
    for (const cb of customBooks) {
      if (!map.has(cb.name)) {
        map.set(cb.name, {
          name: cb.name,
          color: cb.color,
        });
        idx++;
      }
    }
    return Array.from(map.values());
  }, [journalEntries, customBooks]);

  const bookPages = useMemo(() => {
    if (!openBookName) return [];
    return journalEntries.filter((e) => getEntryBookName(e) === openBookName);
  }, [journalEntries, openBookName]);

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
      latestDraftRef.current = activeEntry.content;
      if (editorRef.current && (switchedEntry || document.activeElement !== editorRef.current)) {
        editorRef.current.innerHTML = activeEntry.content;
      }
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
      latestDraftRef.current = incomingTyping.text;
      if (editorRef.current && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = incomingTyping.text;
      }
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
    setCustomBooks((prev) =>
      prev.some((b) => b.name === clean) ? prev : [...prev, { name: clean, color: newBookColor }]
    );
    setShowNewBookModal(false);
    setNewBookInput('');
    setOpenBookName(clean);
    const created = await createJournalEntry({
      kind: 'Idea',
      title: newBookFirstPage.trim() || 'Page 1',
      content: '',
      tags: [`book:${clean}`, `color:${newBookColor}`],
    });
    setNewBookFirstPage('');
    setSelectedId(created.id);
  };

  const handleDeleteBook = (bookName: string, pageIds: string[]) => {
    setDeleteBookTarget({ name: bookName, pageIds });
  };

  const confirmDeleteBook = async () => {
    if (!deleteBookTarget) return;
    const { name: bookName, pageIds } = deleteBookTarget;
    setDeleteBookTarget(null);
    for (const id of pageIds) {
      await deleteJournalEntry(id);
    }
    setCustomBooks((prev) => prev.filter((b) => b.name !== bookName));
    if (openBookName === bookName) {
      setOpenBookName(null);
      setSelectedId(null);
    }
  };

  const handleCreatePage = async () => {
    if (!openBookName) return;
    const pageNum = journalEntries.filter((e) => getEntryBookName(e) === openBookName).length + 1;
    const created = await createJournalEntry({
      kind: 'Idea',
      title: `Page ${pageNum}`,
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
    broadcastTyping(`journal:${activeEntry.id}`, val);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const targetId = activeEntry.id;
    saveTimerRef.current = window.setTimeout(() => {
      updateJournalEntry(targetId, { content: latestDraftRef.current });
    }, 350);
  };

  const handleAddTag = (raw: string) => {
    if (!activeEntry) return;
    const clean = raw.trim().replace(/^#+/, '');
    if (!clean || activeEntry.tags.includes(clean)) {
      setTagInput('');
      return;
    }
    updateJournalEntry(activeEntry.id, { tags: [...activeEntry.tags, clean] });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    if (!activeEntry) return;
    updateJournalEntry(activeEntry.id, {
      tags: activeEntry.tags.filter((t) => t !== tag),
    });
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const execFormat = (command: string, value?: string) => {
    editorRef.current?.focus();
    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch {
      // ignore if unsupported
    }
    document.execCommand(command, false, value);
    saveSelection();
    if (editorRef.current) {
      handleContentChange(editorRef.current.innerHTML);
    }
  };

  // BOOKSHELF VIEW (Apple Books 3D Shelf Ledges)
  if (!openBookName) {
    const visibleBooks = books.filter((b) =>
      bookSearch.trim()
        ? b.name.toLowerCase().includes(bookSearch.toLowerCase())
        : true
    );

    // Group into shelf rows of up to 5 books each
    const shelfRows: typeof books[] = [];
    for (let i = 0; i < visibleBooks.length; i += 5) {
      shelfRows.push(visibleBooks.slice(i, i + 5));
    }

    return (
      <div className="space-y-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-1">
          <div>
            <h1 className="text-xl font-semibold text-[#18181B]">
              Live Notes &amp; Idea Books
            </h1>
            <p className="text-xs text-[#71717A] mt-0.5">
              Create books and open them to add separate pages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-2" />
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search books..."
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] w-40"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setNewBookInput('');
                setNewBookFirstPage('');
                setNewBookColor(BOOK_COLORS[books.length % BOOK_COLORS.length]);
                setShowNewBookModal(true);
              }}
              className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg shrink-0"
            >
              <Plus className="w-3.5 h-3.5" /> New Book
            </button>
          </div>
        </div>

        {shelfRows.length === 0 ? (
          <div className="pt-8">
            <div className="py-12 text-center text-xs text-[#71717A]">
              No books on the shelf yet. Click <strong>New Book</strong> to create your first notebook.
            </div>
            <div className="book-shelf-ledge w-full" />
          </div>
        ) : (
          <div className="space-y-10">
            {shelfRows.map((rowBooks, rowIdx) => (
              <div key={rowIdx} className="pt-2">
                <div className="flex flex-wrap items-end gap-5 sm:gap-7 px-4 sm:px-6">
                  {rowBooks.map((book) => {
                    const pages = journalEntries.filter((e) => getEntryBookName(e) === book.name);
                    return (
                      <div key={book.name} className="group relative">
                        <div className="book-spotlight" />
                        <button
                          type="button"
                          onClick={(e) => triggerOpenBook(book, pages[0]?.id ?? null, e)}
                          className="ios-press relative text-left focus:outline-none block"
                        >
                          <div className="absolute -bottom-1 inset-x-1 h-2.5 bg-black/45 blur-[4px] rounded-full transition-all duration-200 group-hover:scale-x-90 group-hover:opacity-60" />

                          <div
                            className="relative w-32 sm:w-36 h-44 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_8px_18px_rgba(0,0,0,0.38)] overflow-hidden transition-transform duration-200 group-hover:-translate-y-2"
                            style={{ backgroundColor: book.color }}
                          >
                            <div
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                              }}
                            />
                            <div
                              className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                              style={{
                                background:
                                  'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                              }}
                            />
                            <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />
                            <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />

                            <div
                              className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                              style={{
                                clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                              }}
                            />

                            <div className="relative z-10 pl-3.5 pr-2 pt-3">
                              <h3 className="text-sm font-bold leading-snug text-white drop-shadow-2xs line-clamp-3">
                                {book.name}
                              </h3>
                            </div>

                            <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                              <span>{pages.length} {pages.length === 1 ? 'pg' : 'pgs'}</span>
                              <BookOpen className="w-3 h-3 opacity-80" />
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="book-shelf-ledge w-full relative z-10" />
              </div>
            ))}
          </div>
        )}

        {/* Upgraded Add Book Modal with Live 3D Cover Preview */}
        {showNewBookModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleCreateBook}
              className="w-full max-w-lg paper-card rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-[#E4E2DC] flex items-center justify-between">
                <div className="text-sm font-semibold text-[#18181B]">Create New Book</div>
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="p-1 text-[#71717A] hover:text-[#18181B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 grid sm:grid-cols-12 gap-5 items-center">
                {/* Live 3D Hardcover Preview */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center py-2">
                  <div
                    className="relative w-32 h-44 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_10px_22px_rgba(0,0,0,0.35)] overflow-hidden transition-colors duration-200"
                    style={{ backgroundColor: newBookColor }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                      }}
                    />
                    <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />
                    <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />
                    <div
                      className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                      }}
                    />
                    <div className="relative z-10 pl-3.5 pr-2 pt-3">
                      <div className="text-sm font-bold leading-snug text-white line-clamp-3">
                        {newBookInput.trim() || 'Book Title'}
                      </div>
                    </div>
                    <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                      <span>1 pg</span>
                      <BookOpen className="w-3 h-3 opacity-80" />
                    </div>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="sm:col-span-7 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                      Book Title *
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newBookInput}
                      onChange={(e) => setNewBookInput(e.target.value)}
                      placeholder="e.g. Hardware & R&D"
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1.5">
                      Cover Color
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {BOOK_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewBookColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform ${newBookColor === c ? 'scale-110 ring-2 ring-offset-2 ring-[#0A5386]' : 'opacity-80 hover:opacity-100'
                            }`}
                        >
                          {newBookColor === c && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}

                      <label
                        title="Custom Color Wheel"
                        className={`relative w-7 h-7 rounded-full cursor-pointer transition-transform flex items-center justify-center ${!BOOK_COLORS.includes(newBookColor)
                          ? 'scale-110 ring-2 ring-offset-2 ring-[#0A5386]'
                          : 'hover:scale-105'
                          }`}
                        style={{
                          background:
                            'conic-gradient(from 0deg, #ef4444, #f59e0b, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
                        }}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm pointer-events-none" />
                        <input
                          type="color"
                          value={newBookColor}
                          onChange={(e) => setNewBookColor(e.target.value)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                      First Page Title
                    </label>
                    <input
                      type="text"
                      value={newBookFirstPage}
                      onChange={(e) => setNewBookFirstPage(e.target.value)}
                      placeholder="Page 1"
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="px-5 py-3.5 border-t border-[#E4E2DC] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewBookModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#52525B] hover:text-[#18181B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-press px-4 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
                >
                  Add to Shelf
                </button>
              </div>
            </form>
          </div>
        )}

        <ConfirmModal
          open={Boolean(deleteBookTarget)}
          title="Delete Book"
          message={
            deleteBookTarget
              ? `Delete "${deleteBookTarget.name}" and its ${deleteBookTarget.pageIds.length === 1
                ? '1 page'
                : `${deleteBookTarget.pageIds.length} pages`
              } from the shelf?`
              : ''
          }
          confirmLabel="Delete Book"
          onConfirm={confirmDeleteBook}
          onCancel={() => setDeleteBookTarget(null)}
        />

        {/* 3D Notebook: Glide from Shelf -> Center -> Open Two-Sided Cover -> Smooth Zoom */}
        {openingBook && (() => {
          const { fromRect, stage } = openingBook;
          const dx =
            typeof window !== 'undefined'
              ? window.innerWidth / 2 - (fromRect.left + fromRect.width / 2)
              : 0;
          const dy =
            typeof window !== 'undefined'
              ? window.innerHeight / 2 - (fromRect.top + fromRect.height / 2)
              : 0;
          const scale =
            stage === 'start' ? 1 : stage === 'center' ? 1.65 : stage === 'open' ? 1.7 : 3.8;
          const tx = stage === 'start' ? 0 : dx;
          const ty = stage === 'start' ? 0 : dy;
          const isCoverOpen = stage === 'open' || stage === 'zoom';

          return (
            <div
              className="fixed inset-0 z-50 pointer-events-none transition-all duration-300"
              style={{
                backgroundColor:
                  stage === 'start'
                    ? 'rgba(0, 0, 0, 0)'
                    : stage === 'zoom'
                      ? 'rgba(0, 0, 0, 0.12)'
                      : 'rgba(0, 0, 0, 0.38)',
                backdropFilter: stage === 'start' ? 'none' : 'blur(6px)',
              }}
            >
              <div
                style={{
                  position: 'fixed',
                  left: fromRect.left,
                  top: fromRect.top,
                  width: fromRect.width,
                  height: fromRect.height,
                  perspective: '1600px',
                  transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`,
                  opacity: stage === 'zoom' ? 0 : 1,
                  transition:
                    'transform 320ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease-out',
                }}
              >
                {/* Inside Cream Ruled Page */}
                <div className="absolute inset-0 rounded-r-lg rounded-l-[3px] ruled-paper shadow-[0_18px_40px_rgba(0,0,0,0.35)] border border-[#E4E2DC] p-3.5 flex flex-col justify-between overflow-hidden">
                  {/* Spine Crease Shadow on Page */}
                  <div
                    className="absolute inset-y-0 left-0 w-4 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(0,0,0,0.16) 0%, transparent 100%)',
                    }}
                  />
                  <div className="relative z-10 pl-2 text-[11px] font-semibold text-[#18181B] truncate">
                    {openingBook.name}
                  </div>
                </div>

                {/* 3D Two-Sided Swinging Hardcover Front */}
                <div
                  className="absolute inset-0"
                  style={{
                    transformOrigin: 'left center',
                    transformStyle: 'preserve-3d',
                    transform: isCoverOpen ? 'rotateY(-138deg)' : 'rotateY(0deg)',
                    transition: 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                >
                  {/* Outer Front Cover */}
                  <div
                    className="absolute inset-0 rounded-r-lg rounded-l-[3px] p-3.5 flex flex-col justify-between text-white shadow-[4px_10px_24px_rgba(0,0,0,0.42)] overflow-hidden"
                    style={{
                      backgroundColor: openingBook.color,
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 45%, rgba(0,0,0,0.28) 100%)',
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 w-3.5 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(255,255,255,0.18) 38%, rgba(0,0,0,0.12) 78%, rgba(0,0,0,0.5) 100%)',
                      }}
                    />
                    <div className="absolute inset-y-0 left-3.5 w-[1px] bg-white/18 pointer-events-none" />
                    <div className="absolute inset-y-2.5 left-5 right-3 rounded-sm border border-white/12 pointer-events-none" />
                    <div
                      className="absolute top-0 right-4 w-3 h-7 bg-[#8B1E1E] shadow-[0_2px_4px_rgba(0,0,0,0.35)] pointer-events-none"
                      style={{
                        clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 76%, 0 100%)',
                      }}
                    />
                    <div className="relative z-10 pl-3.5 pr-2 pt-3">
                      <h3 className="text-sm font-bold leading-snug text-white line-clamp-3">
                        {openingBook.name}
                      </h3>
                    </div>
                    <div className="relative z-10 pl-3.5 pr-1 flex items-center justify-between text-[10px] font-mono-num text-white/85 pt-1.5 border-t border-white/15">
                      <span>LDOI</span>
                      <BookOpen className="w-3 h-3 opacity-80" />
                    </div>
                  </div>

                  {/* Inner Front Cover Lining (visible after swinging past 90deg) */}
                  <div
                    className="absolute inset-0 rounded-l-lg rounded-r-[3px] bg-[#EDE7DA] border border-[#D8D0C0] shadow-inner overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div
                      className="absolute inset-y-0 right-0 w-4 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(270deg, rgba(0,0,0,0.14) 0%, transparent 100%)',
                      }}
                    />
                    <div className="absolute inset-3 rounded-sm border border-[#D4CCB8]/70 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  // OPEN BOOK VIEW (Separate Pages Inside Selected Book)
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
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
            onClick={() =>
              handleDeleteBook(
                openBookName,
                journalEntries
                  .filter((e) => getEntryBookName(e) === openBookName)
                  .map((p) => p.id)
              )
            }
            title={`Delete ${openBookName}`}
            className="ios-press p-1.5 rounded-lg bg-white border border-[#E4E2DC] hover:border-[#DC2626] text-[#71717A] hover:text-[#DC2626]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleCreatePage}
            className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> New Page
          </button>
        </div>
      </div>

      {/* Realistic Physical Hardcover Ring-Bound Open Book */}
      <div className="notebook-cover-shell p-3 sm:p-4 rounded-[22px] border border-black/30">
        <div className="notebook-spread relative rounded-xl overflow-hidden grid lg:grid-cols-12 min-h-[560px] bg-[#FCFBF8]">
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
          <div className="lg:col-span-4 notebook-pages-pane border-b lg:border-b-0 lg:border-r p-5 lg:pr-8 flex flex-col shadow-[inset_-16px_0_24px_-16px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#52525B]">
                Pages ({bookPages.length})
              </span>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
              {bookPages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#71717A]">
                  This book has no pages yet. Click &ldquo;New Page&rdquo; above.
                </div>
              ) : (
                bookPages.map((entry, idx) => {
                  const selected = activeEntry?.id === entry.id;
                  const customTags = getDisplayTags(entry.tags);
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selected ? 'notebook-page-item-active shadow-2xs' : 'notebook-page-item'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider">
                        <span className="text-[#0A5386]">Page {idx + 1}</span>
                        <span className="text-[#71717A]">{entry.author}</span>
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#18181B] truncate">
                        {entry.title}
                      </div>
                      {customTags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {customTags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 text-[10px] font-medium bg-[#0A5386]/10 text-[#0A5386] rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-1 text-[11px] text-[#71717A] font-mono-num">
                        {formatDateShort(entry.updatedAt)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Page: Ruled Paper Rich-Text Live Editor */}
          <div className="lg:col-span-8 notebook-editor-pane p-6 lg:pl-10 flex flex-col shadow-[inset_16px_0_24px_-16px_rgba(0,0,0,0.16)]">
            {!activeEntry ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#71717A]">
                <BookOpen className="w-7 h-7 mb-2" />
                <p className="text-sm font-medium text-[#18181B]">No page selected</p>
                <p className="text-xs mt-1">
                  Click &ldquo;New Page&rdquo; above to start writing in {openBookName}.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-3">
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

                {/* Inline Tags Bar */}
                <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-[#E4E2DC]">
                  <span className="text-xs font-semibold text-[#52525B]">Tags:</span>
                  {getDisplayTags(activeEntry.tags).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium bg-[#0A5386]/10 text-[#0A5386] rounded-md"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-[#DC2626]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    onBlur={() => {
                      if (tagInput.trim()) handleAddTag(tagInput);
                    }}
                    placeholder="Type tag & press Enter..."
                    className="notebook-tag-input flex-1 min-w-[140px] px-1.5 py-0.5 text-xs bg-transparent text-[#18181B] border-b border-dashed border-[#D6D0C2] focus:border-[#0A5386] focus:outline-none placeholder:text-[#A1A1AA]"
                  />

                  <select
                    value={activeEntry.projectId ?? ''}
                    onChange={(e) =>
                      updateJournalEntry(activeEntry.id, {
                        projectId: e.target.value || undefined,
                      })
                    }
                    className="ml-auto px-2 py-1 text-[11px] bg-white border border-[#E4E2DC] rounded"
                  >
                    <option value="">General (No linked project)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        Project: {p.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Floating Pill Rich-Text Formatting Toolbar */}
                <div className="notebook-toolbar flex flex-wrap items-center gap-1 px-2.5 py-1.5 rounded-full w-fit max-w-full shadow-xs">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('bold');
                    }}
                    title="Bold"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('italic');
                    }}
                    title="Italic"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('underline');
                    }}
                    title="Underline"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('strikeThrough');
                    }}
                    title="Strikethrough"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('hiliteColor', '#FEF08A');
                    }}
                    title="Highlight Selection"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Highlighter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('insertHorizontalRule');
                    }}
                    title="Insert Divider Line"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('insertUnorderedList');
                    }}
                    title="Bullet List"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('insertOrderedList');
                    }}
                    title="Numbered List"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('justifyLeft');
                    }}
                    title="Align Left"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('justifyCenter');
                    }}
                    title="Align Center"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execFormat('justifyRight');
                    }}
                    title="Align Right"
                    className="notebook-tool-btn p-1.5 rounded-full"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-4 bg-current opacity-15 mx-1" />

                  <div className="flex items-center gap-1 px-1">
                    {['#F4F4F5', '#3B82F6', '#EF4444', '#10B981'].map((ink) => (
                      <button
                        key={ink}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setFontColor(ink);
                          execFormat('foreColor', ink);
                        }}
                        title={`Ink ${ink}`}
                        style={{ backgroundColor: ink }}
                        className={`w-3.5 h-3.5 rounded-full border border-white/30 ${
                          fontColor === ink ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
                        }`}
                      />
                    ))}
                    <label
                      onMouseDown={saveSelection}
                      title="Custom Text Color"
                      className="ml-0.5 inline-flex items-center p-1 rounded-full notebook-tool-btn cursor-pointer"
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/30"
                        style={{
                          background:
                            'conic-gradient(from 0deg, #ef4444, #f59e0b, #22c55e, #3b82f6, #a855f7, #ef4444)',
                        }}
                      />
                      <input
                        type="color"
                        value={fontColor}
                        onChange={(e) => {
                          setFontColor(e.target.value);
                          execFormat('foreColor', e.target.value);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {/* Ruled Rich-Text Writing Area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onMouseUp={saveSelection}
                  onKeyUp={saveSelection}
                  onInput={(e) => {
                    saveSelection();
                    handleContentChange(e.currentTarget.innerHTML);
                  }}
                  data-placeholder="Write down your thoughts, technical findings, or notes..."
                  className="notebook-editor w-full flex-1 min-h-[320px] p-3 text-sm text-[#18181B] ruled-paper border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0A5386] overflow-y-auto empty:before:content-[attr(data-placeholder)] empty:before:text-[#A1A1AA]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteBookTarget)}
        title="Delete Book"
        message={
          deleteBookTarget
            ? `Delete "${deleteBookTarget.name}" and its ${deleteBookTarget.pageIds.length === 1
              ? '1 page'
              : `${deleteBookTarget.pageIds.length} pages`
            } from the shelf?`
            : ''
        }
        confirmLabel="Delete Book"
        onConfirm={confirmDeleteBook}
        onCancel={() => setDeleteBookTarget(null)}
      />
    </div>
  );
};
