import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bold,
  CheckSquare,
  Crosshair,
  Download,
  FileSpreadsheet,
  FileText,
  GripHorizontal,
  Image as ImageIcon,
  Italic,
  List,
  ListChecks,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
  Underline,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import { getMemberColor } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import {
  loadBoardConnectors,
  loadBoardPositions,
  parsePinPageContent,
  saveBoardConnectors,
  saveBoardPositions,
  serializePinPageContent,
  type AnchorSide,
  type BoardConnector,
  type BoardPositions,
  type ConnectorStyle,
  type PinPageData,
} from '../lib/pinboard';
import type { Project, ProjectNote } from '../types';

interface ProjectPinboardProps {
  project: Project;
}

const PAGE_PAPER_COLORS = [
  { label: 'Default', hex: '' },
  { label: 'Warm Cream', hex: '#FEF3C7' },
  { label: 'Sky Tint', hex: '#E0F2FE' },
  { label: 'Mint Tint', hex: '#DCFCE7' },
  { label: 'Rose Tint', hex: '#FCE7F3' },
];

const CONNECTOR_COLORS = ['#0A5386', '#18181B', '#8B1E1E', '#133F47'];
const ANCHOR_SIDES: AnchorSide[] = ['top', 'right', 'bottom', 'left'];

function getFileBadge(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'SHEET';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  return ext.toUpperCase().slice(0, 5) || 'FILE';
}

const AnchorDots: React.FC<{
  visible: boolean;
  activeSide: AnchorSide | null;
  onSelectSide: (side: AnchorSide) => void;
}> = ({ visible, activeSide, onSelectSide }) => {
  if (!visible) return null;
  const posClasses: Record<AnchorSide, string> = {
    top: '-top-2 left-1/2 -translate-x-1/2',
    right: '-right-2 top-1/2 -translate-y-1/2',
    bottom: '-bottom-2 left-1/2 -translate-x-1/2',
    left: '-left-2 top-1/2 -translate-y-1/2',
  };

  return (
    <>
      {ANCHOR_SIDES.map((side) => {
        const isActive = activeSide === side;
        return (
          <button
            key={side}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSelectSide(side);
            }}
            title={`Connect ${side} edge`}
            className={`absolute z-30 w-4 h-4 rounded-full border-2 border-white shadow-md transition-transform cursor-crosshair ${
              posClasses[side]
            } ${
              isActive
                ? 'bg-[#8B1E1E] scale-125 ring-2 ring-[#8B1E1E]/40'
                : 'bg-[#0A5386] hover:scale-125'
            }`}
          />
        );
      })}
    </>
  );
};

const FloatingPagePin: React.FC<{
  note: ProjectNote;
  pos: { x: number; y: number };
  connectActive: boolean;
  activeAnchorSide: AnchorSide | null;
  onSelectAnchor: (side: AnchorSide) => void;
  onMeasure: (el: HTMLDivElement | null) => void;
  onDragStart: (e: React.PointerEvent) => void;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}> = ({
  note,
  pos,
  connectActive,
  activeAnchorSide,
  onSelectAnchor,
  onMeasure,
  onDragStart,
  onUpdate,
  onDelete,
}) => {
  const initialData = parsePinPageContent(note.content);
  const [title, setTitle] = useState(initialData.title);
  const [checklist, setChecklist] = useState(initialData.checklist);
  const [bgColor, setBgColor] = useState(initialData.bgColor ?? '');
  const [showChecklistInput, setShowChecklistInput] = useState(initialData.checklist.length > 0);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = initialData.bodyHtml;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  const flushSave = (nextPatch?: Partial<PinPageData>) => {
    const payload: PinPageData = {
      title: nextPatch?.title ?? title,
      bodyHtml: nextPatch?.bodyHtml ?? editorRef.current?.innerHTML ?? initialData.bodyHtml,
      checklist: nextPatch?.checklist ?? checklist,
      bgColor: nextPatch?.bgColor !== undefined ? nextPatch.bgColor : bgColor || undefined,
    };
    onUpdate(serializePinPageContent(payload));
  };

  const scheduleSave = (nextPatch?: Partial<PinPageData>) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      flushSave(nextPatch);
    }, 220);
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
      // ignore
    }
    document.execCommand(command, false, value);
    saveSelection();
    if (editorRef.current) {
      scheduleSave({ bodyHtml: editorRef.current.innerHTML });
    }
  };

  const hasCustomTint = Boolean(bgColor);

  return (
    <div
      ref={onMeasure}
      style={{
        left: pos.x,
        top: pos.y,
        backgroundColor: hasCustomTint ? bgColor : undefined,
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocused(false);
        }
      }}
      className={`group absolute w-[300px] rounded-xl p-4 select-none transition-shadow ${
        hasCustomTint
          ? 'shadow-[0_14px_34px_rgba(24,24,27,0.14)] text-[#18181B]'
          : 'floating-sheet'
      } ${activeAnchorSide ? 'ring-2 ring-[#0A5386]/70' : ''}`}
    >
      {/* 4 Edge Snap Dots */}
      <AnchorDots
        visible={connectActive}
        activeSide={activeAnchorSide}
        onSelectSide={onSelectAnchor}
      />

      {/* Hover / Focus Rich-Text & Color Mini-Toolbar */}
      {!connectActive && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={`transition-opacity absolute -top-9 left-0 right-0 z-20 flex items-center justify-between gap-1 ${
            isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <div className="paper-card rounded-full px-2 py-1 shadow-lg border border-[#E4E2DC] flex items-center gap-0.5 backdrop-blur-md">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execFormat('bold');
              }}
              title="Bold"
              className="p-1 rounded-full hover:bg-black/5 text-[#18181B]"
            >
              <Bold className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execFormat('italic');
              }}
              title="Italic"
              className="p-1 rounded-full hover:bg-black/5 text-[#18181B]"
            >
              <Italic className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execFormat('underline');
              }}
              title="Underline"
              className="p-1 rounded-full hover:bg-black/5 text-[#18181B]"
            >
              <Underline className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                execFormat('insertUnorderedList');
              }}
              title="Bullet List"
              className="p-1 rounded-full hover:bg-black/5 text-[#18181B]"
            >
              <List className="w-3 h-3" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setShowChecklistInput(true);
              }}
              title="Add Checklist Inside Page"
              className="p-1 rounded-full hover:bg-black/5 text-[#0A5386]"
            >
              <ListChecks className="w-3 h-3" />
            </button>

            <div className="w-px h-3.5 bg-[#D6D0C2] mx-0.5" />

            {PAGE_PAPER_COLORS.map((c) => (
              <button
                key={c.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setBgColor(c.hex);
                  flushSave({ bgColor: c.hex || undefined });
                }}
                title={c.label}
                style={{ backgroundColor: c.hex || '#FCFBF8' }}
                className={`w-3 h-3 rounded-full border border-black/20 ${
                  bgColor === c.hex ? 'ring-1 ring-offset-1 ring-[#0A5386]' : ''
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1">
            <div
              onPointerDown={onDragStart}
              title="Drag page"
              className="w-6 h-6 rounded-full bg-white/95 border border-[#E4E2DC] text-[#52525B] flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing"
            >
              <GripHorizontal className="w-3.5 h-3.5" />
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onDelete}
              title="Delete page"
              className="w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Editable Page Title */}
      <input
        type="text"
        value={title}
        disabled={connectActive}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave({ title: e.target.value });
        }}
        placeholder="Page title..."
        className={`w-full text-sm font-bold bg-transparent focus:outline-none placeholder:text-[#A1A1AA] ${
          hasCustomTint ? '!text-[#18181B]' : 'text-[#18181B]'
        }`}
        style={hasCustomTint ? { backgroundColor: 'transparent', color: '#18181B' } : undefined}
      />

      {/* Rich-Text Body */}
      <div
        ref={editorRef}
        contentEditable={!connectActive}
        suppressContentEditableWarning
        onPointerDown={(e) => {
          if (!connectActive) e.stopPropagation();
        }}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        onInput={(e) => {
          saveSelection();
          scheduleSave({ bodyHtml: e.currentTarget.innerHTML });
        }}
        data-placeholder="Write notes..."
        className={`notebook-editor mt-1.5 w-full min-h-[76px] text-xs leading-relaxed bg-transparent focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#A1A1AA] select-text ${
          hasCustomTint ? 'text-[#27272A]' : 'text-[#3F3F46]'
        }`}
      />

      {/* Built-In Checklist Inside the Page */}
      {(showChecklistInput || checklist.length > 0) && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-2.5 pt-2 border-t border-black/10 space-y-1"
        >
          {checklist.map((cp) => (
            <div key={cp.id} className="flex items-start justify-between gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = checklist.map((c) =>
                    c.id === cp.id ? { ...c, done: !c.done } : c
                  );
                  setChecklist(next);
                  flushSave({ checklist: next });
                }}
                className="flex items-start gap-1.5 text-left flex-1 min-w-0"
              >
                {cp.done ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#0A5386] shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-[#71717A] shrink-0 mt-0.5" />
                )}
                <span
                  className={`text-xs leading-snug ${
                    cp.done ? 'line-through text-[#71717A]' : 'text-[#18181B]'
                  }`}
                >
                  {cp.text}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = checklist.filter((c) => c.id !== cp.id);
                  setChecklist(next);
                  flushSave({ checklist: next });
                }}
                className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-[#DC2626] shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}

          {!connectActive && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCheckItem.trim()) return;
                const next = [
                  ...checklist,
                  { id: `cp_${Date.now()}`, text: newCheckItem.trim(), done: false },
                ];
                setChecklist(next);
                setNewCheckItem('');
                flushSave({ checklist: next });
              }}
              className="pt-0.5"
            >
              <input
                type="text"
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                placeholder="+ Add checklist item..."
                className="w-full text-[11px] bg-transparent focus:outline-none placeholder:text-[#A1A1AA]"
                style={hasCustomTint ? { backgroundColor: 'transparent', color: '#18181B' } : undefined}
              />
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export const ProjectPinboard: React.FC<ProjectPinboardProps> = ({ project }) => {
  const {
    currentUser,
    liveCursorsMap,
    broadcastCursor,
    projectNotes,
    documents,
    addProjectNote,
    updateProjectNote,
    deleteProjectNote,
    uploadDocument,
    deleteDocument,
  } = useLdoi();
  const lastCursorSentRef = useRef<number>(0);

  const [positions, setPositions] = useState<BoardPositions>(() =>
    loadBoardPositions(project.id)
  );
  const [connectors, setConnectors] = useState<BoardConnector[]>(() =>
    loadBoardConnectors(project.id)
  );
  const [connectMode, setConnectMode] = useState(false);
  const [connectStyle, setConnectStyle] = useState<ConnectorStyle>('arrow');
  const [connectColor, setConnectColor] = useState('#0A5386');
  const [connectFrom, setConnectFrom] = useState<{ cardId: string; side: AnchorSide } | null>(
    null
  );
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);

  // Measure actual rendered dimensions of each pin so edge dots & arrows snap cleanly to surfaces
  const [cardSizes, setCardSizes] = useState<Record<string, { w: number; h: number }>>({});
  const cardNodesRef = useRef<Record<string, HTMLDivElement | null>>({});

  const registerCardRef = useCallback(
    (cardId: string) => (el: HTMLDivElement | null) => {
      cardNodesRef.current[cardId] = el;
      if (el) {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        setCardSizes((prev) => {
          if (prev[cardId]?.w === w && prev[cardId]?.h === h) return prev;
          return { ...prev, [cardId]: { w, h } };
        });
      }
    },
    []
  );

  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [pendingDeletes, setPendingDeletes] = useState<
    { id: string; kind: 'doc' | 'note'; label: string; timer: number }[]
  >([]);
  const pendingDeletesRef = useRef(pendingDeletes);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    cardId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    pendingDeletesRef.current = pendingDeletes;
  }, [pendingDeletes]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const queueDelete = (kind: 'doc' | 'note', id: string, label: string) => {
    const timer = window.setTimeout(() => {
      if (kind === 'doc') {
        deleteDocument(id);
      } else {
        deleteProjectNote(id);
      }
      setPendingDeletes((prev) => prev.filter((item) => item.id !== id));
    }, 7000);

    setPendingDeletes((prev) => [...prev, { id, kind, label, timer }]);
  };

  const handleUndoDelete = (targetId?: string) => {
    setPendingDeletes((prev) => {
      if (prev.length === 0) return prev;
      const item = targetId ? prev.find((p) => p.id === targetId) : prev[prev.length - 1];
      if (!item) return prev;
      window.clearTimeout(item.timer);
      return prev.filter((p) => p.id !== item.id);
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectMode(false);
        setConnectFrom(null);
        setSelectedConnId(null);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnId) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(e.target as HTMLElement)?.isContentEditable) {
          setConnectors((prev) => {
            const next = prev.filter((c) => c.id !== selectedConnId);
            saveBoardConnectors(project.id, next);
            return next;
          });
          setSelectedConnId(null);
        }
      }
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (pendingDeletesRef.current.length > 0) {
        e.preventDefault();
        handleUndoDelete();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      pendingDeletesRef.current.forEach((item) => {
        window.clearTimeout(item.timer);
        if (item.kind === 'doc') {
          deleteDocument(item.id);
        } else {
          deleteProjectNote(item.id);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnId, project.id]);

  const hiddenIds = new Set(pendingDeletes.map((p) => p.id));
  const projectDocs = documents.filter(
    (d) => d.projectId === project.id && !hiddenIds.has(d.id)
  );
  const pinnedPages = projectNotes.filter(
    (n) => n.projectId === project.id && n.content.startsWith('[PIN_PAGE]') && !hiddenIds.has(n.id)
  );

  const getPos = (cardId: string, fallbackIndex = 0): { x: number; y: number } => {
    if (positions[cardId]) return positions[cardId];
    const col = fallbackIndex % 4;
    const row = Math.floor(fallbackIndex / 4);
    return { x: 80 + col * 320, y: 100 + row * 260 };
  };

  const getCardRect = (
    cardId: string
  ): { x: number; y: number; w: number; h: number } | null => {
    const docIdx = projectDocs.findIndex((d) => `doc_${d.id}` === cardId);
    if (docIdx !== -1) {
      const doc = projectDocs[docIdx];
      const p = getPos(cardId, docIdx);
      const isImg = doc.mimeType.startsWith('image/');
      const size = cardSizes[cardId] ?? { w: isImg ? 240 : 150, h: isImg ? 190 : 110 };
      return { x: p.x, y: p.y, w: size.w, h: size.h };
    }
    const pageIdx = pinnedPages.findIndex((n) => `page_${n.id}` === cardId);
    if (pageIdx !== -1) {
      const p = getPos(cardId, projectDocs.length + pageIdx);
      const size = cardSizes[cardId] ?? { w: 300, h: 165 };
      return { x: p.x, y: p.y, w: size.w, h: size.h };
    }
    return null;
  };

  const getAnchorPoint = (
    rect: { x: number; y: number; w: number; h: number },
    side: AnchorSide
  ): { x: number; y: number } => {
    switch (side) {
      case 'top':
        return { x: rect.x + rect.w / 2, y: rect.y };
      case 'right':
        return { x: rect.x + rect.w, y: rect.y + rect.h / 2 };
      case 'bottom':
        return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
      case 'left':
        return { x: rect.x, y: rect.y + rect.h / 2 };
    }
  };

  const getDirectionalOffset = (side: AnchorSide, dist: number): { dx: number; dy: number } => {
    switch (side) {
      case 'top':
        return { dx: 0, dy: -dist };
      case 'right':
        return { dx: dist, dy: 0 };
      case 'bottom':
        return { dx: 0, dy: dist };
      case 'left':
        return { dx: -dist, dy: 0 };
    }
  };

  const handleSelectAnchor = (cardId: string, side: AnchorSide) => {
    if (!connectMode) return;
    if (!connectFrom) {
      setConnectFrom({ cardId, side });
      return;
    }
    if (connectFrom.cardId === cardId && connectFrom.side === side) {
      setConnectFrom(null);
      return;
    }
    const nextConn: BoardConnector = {
      id: `conn_${Date.now()}`,
      fromId: connectFrom.cardId,
      toId: cardId,
      fromAnchor: connectFrom.side,
      toAnchor: side,
      style: connectStyle,
      color: connectColor,
    };
    const next = [...connectors, nextConn];
    setConnectors(next);
    saveBoardConnectors(project.id, next);
    setConnectFrom(null);
    setSelectedConnId(nextConn.id);
  };

  const updateConnector = (connId: string, patch: Partial<BoardConnector>) => {
    setConnectors((prev) => {
      const next = prev.map((c) => (c.id === connId ? { ...c, ...patch } : c));
      saveBoardConnectors(project.id, next);
      return next;
    });
  };

  const handleDeleteConnector = (connId: string) => {
    const next = connectors.filter((c) => c.id !== connId);
    setConnectors(next);
    saveBoardConnectors(project.id, next);
    if (selectedConnId === connId) setSelectedConnId(null);
  };

  const startDrag = (cardId: string, e: React.PointerEvent, fallbackIdx = 0) => {
    if (connectMode) return;
    e.preventDefault();
    e.stopPropagation();
    const pos = getPos(cardId, fallbackIdx);
    dragRef.current = {
      cardId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const dx = (ev.clientX - dragRef.current.startX) / zoomRef.current;
      const dy = (ev.clientY - dragRef.current.startY) / zoomRef.current;
      const nx = Math.round(dragRef.current.origX + dx);
      const ny = Math.round(dragRef.current.origY + dy);
      setPositions((prev) => {
        const next = { ...prev, [dragRef.current!.cardId]: { x: nx, y: ny } };
        saveBoardPositions(project.id, next);
        return next;
      });
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleUploadInspoOrFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: 'Spec' | 'Other'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocument(file, { projectId: project.id, docType });
    e.target.value = '';
  };

  const handleInstantAddPage = async () => {
    await addProjectNote(
      project.id,
      serializePinPageContent({ title: '', bodyHtml: '', checklist: [] })
    );
  };

  const handleResetLayout = () => {
    setPositions({});
    saveBoardPositions(project.id, {});
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const clampZoom = (z: number) => Math.min(2.5, Math.max(0.05, Number(z.toFixed(3))));

  const zoomAtPoint = (nextZoomRaw: number, clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = rect ? clientX - rect.left : clientX;
    const cy = rect ? clientY - rect.top : clientY;
    const nextZoom = clampZoom(nextZoomRaw);
    setPan((prevPan) => {
      const worldX = (cx - prevPan.x) / zoomRef.current;
      const worldY = (cy - prevPan.y) / zoomRef.current;
      return {
        x: cx - worldX * nextZoom,
        y: cy - worldY * nextZoom,
      };
    });
    setZoom(nextZoom);
  };

  const zoomCentered = (nextZoomRaw: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const cy = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    zoomAtPoint(nextZoomRaw, cx, cy);
  };

  useEffect(() => {
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehaviorX;
    const prevBodyOverscroll = document.body.style.overscrollBehaviorX;
    document.documentElement.style.overscrollBehaviorX = 'none';
    document.body.style.overscrollBehaviorX = 'none';

    const el = viewportRef.current;
    if (!el) {
      return () => {
        document.documentElement.style.overscrollBehaviorX = prevHtmlOverscroll;
        document.body.style.overscrollBehaviorX = prevBodyOverscroll;
      };
    }

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const currentZoom = zoomRef.current;
        const factor = Math.exp(-e.deltaY * 0.0028);
        const nextZoom = Math.min(2.5, Math.max(0.05, Number((currentZoom * factor).toFixed(3))));
        const rect = el.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        setPan((prevPan) => {
          const worldX = (cx - prevPan.x) / currentZoom;
          const worldY = (cy - prevPan.y) / currentZoom;
          return {
            x: cx - worldX * nextZoom,
            y: cy - worldY * nextZoom,
          };
        });
        zoomRef.current = nextZoom;
        setZoom(nextZoom);
        return;
      }

      setPan((prev) => ({
        x: prev.x - (e.shiftKey ? e.deltaY : e.deltaX),
        y: prev.y - (e.shiftKey ? 0 : e.deltaY),
      }));
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
      document.documentElement.style.overscrollBehaviorX = prevHtmlOverscroll;
      document.body.style.overscrollBehaviorX = prevBodyOverscroll;
    };
  }, []);

  const startCanvasPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && e.button !== 1) return;
    if (e.target === e.currentTarget) {
      setSelectedConnId(null);
      if (connectMode) setConnectFrom(null);
    }
    e.preventDefault();
    setIsPanning(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const origPan = { ...pan };

    const onMove = (ev: PointerEvent) => {
      setPan({
        x: origPan.x + (ev.clientX - startX),
        y: origPan.y + (ev.clientY - startY),
      });
    };

    const onUp = () => {
      setIsPanning(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleBackToCenter = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    const wx = Math.round((e.clientX - rect.left - panRef.current.x) / zoomRef.current);
    const wy = Math.round((e.clientY - rect.top - panRef.current.y) / zoomRef.current);
    if (connectMode && connectFrom) {
      setMouseWorld({ x: wx, y: wy });
    }
    const now = Date.now();
    if (now - lastCursorSentRef.current < 45) return;
    lastCursorSentRef.current = now;
    broadcastCursor(project.id, wx, wy);
  };

  const remoteCursors = Object.values(liveCursorsMap).filter(
    (c) => c.projectId === project.id && c.member !== currentUser?.name
  );

  const selectedConn = connectors.find((c) => c.id === selectedConnId) ?? null;
  const totalPins = projectDocs.length + pinnedPages.length;

  const getStrokeDash = (style: ConnectorStyle) => {
    if (style === 'dashed') return '8 6';
    if (style === 'dotted') return '2 6';
    return undefined;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Edit Existing Connector Pill OR New Connector Picker Pill */}
      {selectedConn && !connectMode && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-3 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-2 backdrop-blur-md">
          <span className="text-[11px] font-semibold text-[#52525B] whitespace-nowrap">
            Edit Line
          </span>
          <div className="w-px h-4 bg-[#E4E2DC]" />
          {(['arrow', 'line', 'dashed', 'dotted'] as ConnectorStyle[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => updateConnector(selectedConn.id, { style: st })}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                selectedConn.style === st
                  ? 'bg-[#0A5386] text-white'
                  : 'text-[#52525B] hover:bg-black/5'
              }`}
            >
              {st}
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E2DC]" />
          {CONNECTOR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => updateConnector(selectedConn.id, { color: c })}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full border border-white/40 ${
                selectedConn.color === c ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
              }`}
            />
          ))}
          <div className="w-px h-4 bg-[#E4E2DC]" />
          <button
            type="button"
            onClick={() =>
              updateConnector(selectedConn.id, {
                fromId: selectedConn.toId,
                toId: selectedConn.fromId,
                fromAnchor: selectedConn.toAnchor ?? 'left',
                toAnchor: selectedConn.fromAnchor ?? 'right',
              })
            }
            title="Reverse Arrow Direction"
            className="p-1 rounded-full text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteConnector(selectedConn.id)}
            title="Delete Line"
            className="p-1 rounded-full text-[#DC2626] hover:bg-[#DC2626]/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {connectMode && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-3 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-2 backdrop-blur-md">
          <span className="text-[11px] font-semibold text-[#52525B] whitespace-nowrap">
            {connectFrom ? 'Click target edge dot' : 'Click any edge dot'}
          </span>
          <div className="w-px h-4 bg-[#E4E2DC]" />
          {(['arrow', 'line', 'dashed', 'dotted'] as ConnectorStyle[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setConnectStyle(st)}
              className={`px-2 py-0.5 text-[11px] font-medium rounded-full capitalize ${
                connectStyle === st
                  ? 'bg-[#0A5386] text-white'
                  : 'text-[#52525B] hover:bg-black/5'
              }`}
            >
              {st}
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E2DC]" />
          {CONNECTOR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setConnectColor(c)}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full border border-white/40 ${
                connectColor === c ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
              }`}
            />
          ))}
        </div>
      )}

      {/* Fixed Floating Pill Bar (Bottom-Center) */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-2 py-1.5 shadow-2xl border border-[#E4E2DC] flex items-center gap-1.5 max-w-[95vw] overflow-x-auto backdrop-blur-md">
        <button
          type="button"
          onClick={handleInstantAddPage}
          className="ios-press shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0A5386] text-white rounded-full"
        >
          <StickyNote className="w-3.5 h-3.5" />
          Add Page
        </button>

        <button
          type="button"
          onClick={() => {
            setConnectMode((v) => !v);
            setConnectFrom(null);
            setSelectedConnId(null);
          }}
          className={`ios-press shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full ${
            connectMode ? 'bg-[#8B1E1E] text-white' : 'bg-[#133F47] text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          {connectMode ? 'Done Connecting' : 'Connect'}
        </button>

        <label className="ios-press shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#254454] text-white rounded-full cursor-pointer">
          <ImageIcon className="w-3.5 h-3.5" />
          Pin Design Inspo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUploadInspoOrFile(e, 'Spec')}
          />
        </label>

        <label className="ios-press shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-white/80 border border-[#E4E2DC] text-[#18181B] rounded-full cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          Pin File
          <input
            type="file"
            className="hidden"
            onChange={(e) => handleUploadInspoOrFile(e, 'Other')}
          />
        </label>

        <div className="w-px h-5 bg-[#E4E2DC] mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={handleResetLayout}
          title="Reset Layout"
          className="ios-press shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#52525B] hover:text-[#18181B] rounded-full"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      {/* Fixed Floating Zoom + Back to Center Pill (Bottom-Right) */}
      <div className="fixed bottom-16 right-4 sm:bottom-5 sm:right-5 z-40 paper-card rounded-full px-2.5 py-1.5 shadow-2xl border border-[#E4E2DC] flex items-center gap-1.5 backdrop-blur-md">
        <button
          type="button"
          onClick={() => zoomCentered(zoom * 0.72)}
          title="Zoom Out"
          className="ios-press p-1 rounded-full text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <input
          type="range"
          min={5}
          max={250}
          value={Math.round(zoom * 100)}
          onChange={(e) => zoomCentered(Number(e.target.value) / 100)}
          title="Zoom Level (5% - 250%)"
          className="w-16 sm:w-20 accent-[#0A5386] cursor-pointer h-1"
        />
        <span className="px-1 text-[11px] font-mono-num font-semibold text-[#18181B] min-w-[38px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomCentered(zoom * 1.35)}
          title="Zoom In"
          className="ios-press p-1 rounded-full text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setZoom(0.28);
            setPan({ x: 80, y: 80 });
          }}
          title="Bird's-Eye Overview"
          className="ios-press p-1 rounded-full text-[#0A5386] hover:bg-[#0A5386]/10"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
        <button
          type="button"
          onClick={handleBackToCenter}
          title="Back to Center"
          className="ios-press inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#0A5386] text-white rounded-full"
        >
          <Crosshair className="w-3 h-3" />
          Back to Center
        </button>
      </div>

      {/* Floating Undo Toast */}
      {pendingDeletes.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 paper-card rounded-full pl-3.5 pr-1.5 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-2.5 backdrop-blur-md">
          <span className="text-xs font-medium text-[#18181B] max-w-[200px] truncate">
            Removed {pendingDeletes[pendingDeletes.length - 1].label}
          </span>
          <button
            type="button"
            onClick={() => handleUndoDelete(pendingDeletes[pendingDeletes.length - 1].id)}
            className="ios-press inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#0A5386] text-white rounded-full"
          >
            <Undo2 className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}

      {/* Empty Canvas Subtle Hint */}
      {totalPins === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-sm font-medium text-[#71717A]">
              Blank infinite board for {project.title}
            </p>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Use the floating pill below to add pages (with checklists &amp; colors), connect elements with arrows, or pin images &amp; files.
            </p>
          </div>
        </div>
      )}

      {/* True Infinite Pan & Zoom Matrix Canvas */}
      <div
        ref={viewportRef}
        onPointerDown={startCanvasPan}
        onPointerMove={handleCanvasPointerMove}
        className={`flex-1 overflow-hidden relative select-none ${
          connectMode ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          overscrollBehavior: 'none',
          touchAction: 'none',
          backgroundImage: `radial-gradient(rgba(140, 128, 110, ${Math.min(
            0.35,
            Math.max(0.12, 0.28 * zoom)
          )}) ${Math.max(0.75, 1.2 * Math.min(1, zoom))}px, transparent 1px)`,
          backgroundSize: `${Math.max(6, 22 * zoom)}px ${Math.max(6, 22 * zoom)}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* NOTE: No will-change-transform so text & SVG re-rasterize crisply when zoomed in */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute top-0 left-0 select-text"
        >
          {/* Pinned Design Inspo Images & Uploaded Files */}
          {projectDocs.map((doc, idx) => {
            const cardId = `doc_${doc.id}`;
            const pos = getPos(cardId, idx);
            const isImage = doc.mimeType.startsWith('image/');
            const badge = getFileBadge(doc.name);
            const activeSide = connectFrom?.cardId === cardId ? connectFrom.side : null;

            if (isImage) {
              return (
                <div
                  key={doc.id}
                  ref={registerCardRef(cardId)}
                  style={{ left: pos.x, top: pos.y }}
                  onPointerDown={(e) => startDrag(cardId, e, idx)}
                  className={`group absolute w-[240px] select-none rounded-xl ${
                    connectMode ? '' : 'cursor-grab active:cursor-grabbing'
                  } ${activeSide ? 'ring-2 ring-[#0A5386]/70' : ''}`}
                >
                  <AnchorDots
                    visible={connectMode}
                    activeSide={activeSide}
                    onSelectSide={(side) => handleSelectAnchor(cardId, side)}
                  />
                  {!connectMode && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => queueDelete('doc', doc.id, doc.name)}
                      title="Delete pin"
                      className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 -right-2.5 z-10 w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <img
                    src={doc.url}
                    alt={doc.name}
                    draggable={false}
                    className="w-full max-h-[260px] object-cover rounded-xl shadow-[0_14px_34px_rgba(24,24,27,0.16)]"
                  />
                  <div className="mt-1.5 px-1 text-[11px] font-medium text-[#52525B] truncate text-center">
                    {doc.name}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={doc.id}
                ref={registerCardRef(cardId)}
                style={{ left: pos.x, top: pos.y }}
                onPointerDown={(e) => startDrag(cardId, e, idx)}
                className={`group absolute w-[150px] flex flex-col items-center select-none rounded-xl ${
                  connectMode ? '' : 'cursor-grab active:cursor-grabbing'
                } ${activeSide ? 'ring-2 ring-[#0A5386]/70' : ''}`}
              >
                <AnchorDots
                  visible={connectMode}
                  activeSide={activeSide}
                  onSelectSide={(side) => handleSelectAnchor(cardId, side)}
                />
                {!connectMode && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 right-1 z-10 flex items-center gap-1">
                    <a
                      href={doc.url}
                      download={doc.name}
                      target="_blank"
                      rel="noreferrer"
                      onPointerDown={(e) => e.stopPropagation()}
                      title="Download file"
                      className="w-6 h-6 rounded-full bg-white/95 border border-[#E4E2DC] text-[#18181B] hover:border-[#0A5386] flex items-center justify-center shadow-sm"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => queueDelete('doc', doc.id, doc.name)}
                      title="Delete pin"
                      className="w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative p-3">
                  {badge === 'SHEET' ? (
                    <FileSpreadsheet className="w-12 h-12 text-[#133F47] drop-shadow-sm" />
                  ) : (
                    <FileText className="w-12 h-12 text-[#0A5386] drop-shadow-sm" />
                  )}
                  <span className="absolute bottom-2 right-1.5 px-1.5 py-0.5 text-[9px] font-bold tracking-wider bg-[#18181B] text-white rounded">
                    {badge}
                  </span>
                </div>
                <div className="w-full px-1 text-[11px] font-medium text-[#18181B] truncate text-center">
                  {doc.name}
                </div>
              </div>
            );
          })}

          {/* Customizable Floating Pages */}
          {pinnedPages.map((note, idx) => {
            const cardId = `page_${note.id}`;
            const fallbackPos = getPos(cardId, projectDocs.length + idx);
            const parsed = parsePinPageContent(note.content);
            const activeSide = connectFrom?.cardId === cardId ? connectFrom.side : null;
            return (
              <FloatingPagePin
                key={note.id}
                note={note}
                pos={positions[cardId] ?? fallbackPos}
                connectActive={connectMode}
                activeAnchorSide={activeSide}
                onSelectAnchor={(side) => handleSelectAnchor(cardId, side)}
                onMeasure={registerCardRef(cardId)}
                onDragStart={(e) => startDrag(cardId, e, projectDocs.length + idx)}
                onUpdate={(content) => updateProjectNote(note.id, content)}
                onDelete={() => queueDelete('note', note.id, parsed.title || 'Page')}
              />
            );
          })}

          {/* Surface-Attached SVG Flow Arrows & Line Connectors (z-20 so arrowheads sit cleanly ON element edges!) */}
          <svg className="pointer-events-none overflow-visible absolute top-0 left-0 w-px h-px z-20">
            <defs>
              {CONNECTOR_COLORS.map((c) => {
                const key = c.replace('#', '');
                return (
                  <marker
                    key={key}
                    id={`arrow-${key}`}
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6.5"
                    markerHeight="6.5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.2 L 9 5 L 0 8.8 z" fill={c} />
                  </marker>
                );
              })}
            </defs>

            {connectors.map((conn) => {
              const rFrom = getCardRect(conn.fromId);
              const rTo = getCardRect(conn.toId);
              if (!rFrom || !rTo) return null;

              const fromSide: AnchorSide = conn.fromAnchor ?? 'right';
              const toSide: AnchorSide = conn.toAnchor ?? 'left';
              const from = getAnchorPoint(rFrom, fromSide);
              const to = getAnchorPoint(rTo, toSide);

              const dist = Math.max(40, Math.hypot(to.x - from.x, to.y - from.y) * 0.35);
              const off1 = getDirectionalOffset(fromSide, dist);
              const off2 = getDirectionalOffset(toSide, dist);
              const d = `M ${from.x} ${from.y} C ${from.x + off1.dx} ${from.y + off1.dy}, ${
                to.x + off2.dx
              } ${to.y + off2.dy}, ${to.x} ${to.y}`;

              const colorKey = conn.color.replace('#', '');
              const hasArrow = conn.style === 'arrow' || conn.style === 'dashed';
              const isSelected = selectedConnId === conn.id;

              return (
                <g
                  key={conn.id}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedConnId(conn.id);
                    setConnectMode(false);
                  }}
                  className="pointer-events-auto cursor-pointer"
                >
                  <path d={d} fill="none" stroke="transparent" strokeWidth={18} />
                  {isSelected && (
                    <path
                      d={d}
                      fill="none"
                      stroke={conn.color}
                      strokeOpacity={0.25}
                      strokeWidth={8}
                      strokeLinecap="round"
                    />
                  )}
                  <path
                    d={d}
                    fill="none"
                    stroke={conn.color}
                    strokeWidth={isSelected ? 3 : 2.5}
                    strokeDasharray={getStrokeDash(conn.style)}
                    markerEnd={hasArrow ? `url(#arrow-${colorKey})` : undefined}
                  />
                  {/* Snap endpoint dots when selected */}
                  {isSelected && (
                    <>
                      <circle cx={from.x} cy={from.y} r={4.5} fill="#FFFFFF" stroke={conn.color} strokeWidth={2} />
                      <circle cx={to.x} cy={to.y} r={4.5} fill="#FFFFFF" stroke={conn.color} strokeWidth={2} />
                    </>
                  )}
                </g>
              );
            })}

            {/* Live Rubber-Band Preview While Connecting */}
            {connectMode && connectFrom && mouseWorld && (() => {
              const rFrom = getCardRect(connectFrom.cardId);
              if (!rFrom) return null;
              const from = getAnchorPoint(rFrom, connectFrom.side);
              const colorKey = connectColor.replace('#', '');
              return (
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={mouseWorld.x}
                  y2={mouseWorld.y}
                  stroke={connectColor}
                  strokeWidth={2.5}
                  strokeDasharray="6 5"
                  markerEnd={
                    connectStyle === 'arrow' || connectStyle === 'dashed'
                      ? `url(#arrow-${colorKey})`
                      : undefined
                  }
                />
              );
            })()}
          </svg>

          {/* Real-Time Multiplayer Cursors */}
          {remoteCursors.map((cursor) => {
            const color = getMemberColor(cursor.member);
            return (
              <div
                key={cursor.member}
                style={{
                  left: cursor.x,
                  top: cursor.y,
                  transform: `scale(${1 / zoom})`,
                  transformOrigin: '0 0',
                  transition: 'left 80ms linear, top 80ms linear',
                }}
                className="pointer-events-none absolute z-50"
              >
                <svg
                  width="20"
                  height="22"
                  viewBox="0 0 20 22"
                  fill="none"
                  className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.28)]"
                >
                  <path
                    d="M2.5 1.5L17.5 10.5L10.2 12.6L6.8 19.5L2.5 1.5Z"
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  style={{ backgroundColor: color }}
                  className="ml-3.5 -mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white whitespace-nowrap shadow-md"
                >
                  {cursor.member}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
