import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bold,
  CheckSquare,
  Download,
  Eraser,
  FileSpreadsheet,
  FileText,
  Frame,
  GripHorizontal,
  Image as ImageIcon,
  Italic,
  Layers,
  List,
  ListChecks,
  Maximize2,
  Minus,
  Pen,
  Plus,
  Redo2,
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
  loadBoardStrokes,
  loadBoardZones,
  parsePinPageContent,
  saveBoardConnectors,
  saveBoardPositions,
  saveBoardStrokes,
  saveBoardZones,
  serializePinPageContent,
  type AnchorSide,
  type BoardConnector,
  type BoardPositions,
  type BoardStroke,
  type BoardZone,
  type ConnectorStyle,
  type PinPageData,
} from '../lib/pinboard';
import type { MemberName, Project, ProjectNote } from '../types';

interface ProjectPinboardProps {
  project: Project;
}

interface BoardSnapshot {
  positions: BoardPositions;
  connectors: BoardConnector[];
  zones: BoardZone[];
  strokes: BoardStroke[];
  hiddenIds: string[];
}

export interface FloatingPageHandle {
  execFormat: (cmd: string, val?: string) => void;
  openChecklist: () => void;
  setPaperColor: (hex: string) => void;
  getPaperColor: () => string;
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

function isLightHex(hex: string): boolean {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return true;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
}

const ColorWheelButton: React.FC<{
  value: string;
  isCustom: boolean;
  onChange: (hex: string) => void;
  title?: string;
  sizeClass?: string;
}> = ({ value, isCustom, onChange, title = 'Custom Color Wheel', sizeClass = 'w-4 h-4' }) => (
  <label
    title={title}
    onPointerDown={(e) => e.stopPropagation()}
    className={`relative ${sizeClass} rounded-full cursor-pointer shrink-0 transition-transform flex items-center justify-center ${
      isCustom ? 'ring-2 ring-offset-1 ring-[#0A5386] scale-110' : 'hover:scale-110'
    }`}
    style={{
      background:
        'conic-gradient(#EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6, #EC4899, #EF4444)',
    }}
  >
    <span
      className="w-1.5 h-1.5 rounded-full border border-white/80 shadow-xs"
      style={{ backgroundColor: value || '#FFFFFF' }}
    />
    <input
      type="color"
      value={value && value.startsWith('#') && value.length === 7 ? value : '#0A5386'}
      onChange={(e) => onChange(e.target.value)}
      className="sr-only"
    />
  </label>
);

function getConnectorPolylinePoints(
  from: { x: number; y: number },
  fromSide: AnchorSide,
  to: { x: number; y: number },
  toSide: AnchorSide,
  segOffsets?: Record<number, number>
): { x: number; y: number }[] {
  const stub = 28;
  const dir = (side: AnchorSide) =>
    side === 'left'
      ? { x: -1, y: 0 }
      : side === 'right'
      ? { x: 1, y: 0 }
      : side === 'top'
      ? { x: 0, y: -1 }
      : { x: 0, y: 1 };

  const d1 = dir(fromSide);
  const d2 = dir(toSide);
  const p1 = { x: from.x + d1.x * stub, y: from.y + d1.y * stub };
  const p2 = { x: to.x + d2.x * stub, y: to.y + d2.y * stub };

  const rawPts: { x: number; y: number }[] = [from, p1];
  const exitHoriz = fromSide === 'left' || fromSide === 'right';
  const enterHoriz = toSide === 'left' || toSide === 'right';

  if (exitHoriz && enterHoriz) {
    const midX = (p1.x + p2.x) / 2;
    rawPts.push({ x: midX, y: p1.y }, { x: midX, y: p2.y });
  } else if (!exitHoriz && !enterHoriz) {
    const midY = (p1.y + p2.y) / 2;
    rawPts.push({ x: p1.x, y: midY }, { x: p2.x, y: midY });
  } else if (exitHoriz && !enterHoriz) {
    rawPts.push({ x: p2.x, y: p1.y });
  } else {
    rawPts.push({ x: p1.x, y: p2.y });
  }
  rawPts.push(p2, to);

  // Deduplicate identical points
  const deduped: { x: number; y: number }[] = [];
  for (const pt of rawPts) {
    const prev = deduped[deduped.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.5) {
      deduped.push({ x: pt.x, y: pt.y });
    }
  }

  // Merge collinear consecutive segments so only true 90-degree corners remain
  const pts: { x: number; y: number }[] = [];
  for (const pt of deduped) {
    if (pts.length >= 2) {
      const a = pts[pts.length - 2];
      const b = pts[pts.length - 1];
      const sameX = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - pt.x) < 0.5;
      const sameY = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - pt.y) < 0.5;
      if (sameX || sameY) {
        pts[pts.length - 1] = pt;
        continue;
      }
    }
    pts.push(pt);
  }

  // Apply user's perpendicular length-adjustment offsets to inner segments
  if (segOffsets) {
    for (let segIdx = 1; segIdx <= pts.length - 3; segIdx++) {
      const offset = segOffsets[segIdx];
      if (!offset) continue;
      const a = pts[segIdx];
      const b = pts[segIdx + 1];
      const isVertical = Math.abs(a.x - b.x) < 0.5;
      if (isVertical) {
        a.x += offset;
        b.x += offset;
      } else {
        a.y += offset;
        b.y += offset;
      }
    }
  }

  return pts;
}

function buildRoundedPathFromPoints(pts: { x: number; y: number }[], radius = 14): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    const len1 = Math.hypot(b.x - a.x, b.y - a.y);
    const len2 = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) {
      path += ` L ${b.x} ${b.y}`;
      continue;
    }
    const u1x = (b.x - a.x) / len1;
    const u1y = (b.y - a.y) / len1;
    const u2x = (c.x - b.x) / len2;
    const u2y = (c.y - b.y) / len2;
    const startX = b.x - u1x * r;
    const startY = b.y - u1y * r;
    const endX = b.x + u2x * r;
    const endY = b.y + u2y * r;
    path += ` L ${startX} ${startY} Q ${b.x} ${b.y} ${endX} ${endY}`;
  }
  const last = pts[pts.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
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

const FloatingPagePin = React.forwardRef<
  FloatingPageHandle,
  {
    note: ProjectNote;
    pos: { x: number; y: number };
    connectActive: boolean;
    isFocusedCard: boolean;
    activeAnchorSide: AnchorSide | null;
    onFocusCard: () => void;
    onSelectAnchor: (side: AnchorSide) => void;
    onMeasure: (el: HTMLDivElement | null) => void;
    onDragStart: (e: React.PointerEvent) => void;
    onUpdate: (content: string) => void;
    onDelete: () => void;
  }
>(
  (
    {
      note,
      pos,
      connectActive,
      isFocusedCard,
      activeAnchorSide,
      onFocusCard,
      onSelectAnchor,
      onMeasure,
      onDragStart,
      onUpdate,
      onDelete,
    },
    ref
  ) => {
    const initialData = parsePinPageContent(note.content);
    const [title, setTitle] = useState(initialData.title);
    const [checklist, setChecklist] = useState(initialData.checklist);
    const [bgColor, setBgColor] = useState(initialData.bgColor ?? '');
    const [showChecklistInput, setShowChecklistInput] = useState(
      initialData.checklist.length > 0
    );
    const [newCheckItem, setNewCheckItem] = useState('');

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

    useImperativeHandle(ref, () => ({
      execFormat,
      openChecklist: () => setShowChecklistInput(true),
      setPaperColor: (hex: string) => {
        setBgColor(hex);
        flushSave({ bgColor: hex || undefined });
      },
      getPaperColor: () => bgColor,
    }));

    const hasCustomTint = Boolean(bgColor);
    const useDarkInk = hasCustomTint && isLightHex(bgColor);
    const useLightInk = hasCustomTint && !isLightHex(bgColor);

    return (
      <div
        ref={onMeasure}
        style={{
          left: pos.x,
          top: pos.y,
          backgroundColor: hasCustomTint ? bgColor : undefined,
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onFocusCard();
        }}
        onFocus={onFocusCard}
        className={`group absolute w-[300px] rounded-xl p-4 select-none transition-shadow ${
          hasCustomTint
            ? `shadow-[0_14px_34px_rgba(24,24,27,0.14)] ${useLightInk ? 'text-[#F4F4F5]' : 'text-[#18181B]'}`
            : 'floating-sheet'
        } ${
          activeAnchorSide || isFocusedCard
            ? 'ring-2 ring-[#0A5386]/70 z-20'
            : 'hover:z-20'
        }`}
      >
        {/* 4 Edge Snap Dots */}
        <AnchorDots
          visible={connectActive}
          activeSide={activeAnchorSide}
          onSelectSide={onSelectAnchor}
        />

        {/* Compact Top-Right Corner Drag & Delete */}
        {!connectActive && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 right-0 z-30 flex items-center gap-1">
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
        )}

        {/* Editable Page Title */}
        <input
          type="text"
          value={title}
          disabled={connectActive}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave({ title: e.target.value });
          }}
          placeholder="Page title..."
          className={`w-full text-sm font-bold bg-transparent focus:outline-none placeholder:text-[#A1A1AA] ${
            useDarkInk
              ? 'pinboard-tinted-input !text-[#18181B]'
              : useLightInk
              ? '!text-[#F4F4F5]'
              : 'text-[#18181B]'
          }`}
          style={
            hasCustomTint
              ? { backgroundColor: 'transparent', color: useLightInk ? '#F4F4F5' : '#18181B' }
              : undefined
          }
        />

        {/* Rich-Text Body */}
        <div
          ref={editorRef}
          contentEditable={!connectActive}
          suppressContentEditableWarning
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onInput={(e) => {
            saveSelection();
            scheduleSave({ bodyHtml: e.currentTarget.innerHTML });
          }}
          data-placeholder="Write notes..."
          className={`notebook-editor mt-1.5 w-full min-h-[76px] text-xs leading-relaxed bg-transparent focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#A1A1AA] select-text ${
            useLightInk ? 'text-[#E4E4E7]' : hasCustomTint ? 'text-[#27272A]' : 'text-[#3F3F46]'
          }`}
        />

        {/* Built-In Checklist Inside the Page */}
        {(showChecklistInput || checklist.length > 0) && (
          <div className="mt-2.5 pt-2 border-t border-black/10 space-y-1">
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
                      cp.done
                        ? 'line-through text-[#71717A]'
                        : useLightInk
                        ? '!text-[#F4F4F5]'
                        : useDarkInk
                        ? '!text-[#18181B]'
                        : 'text-[#18181B]'
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
                  className={`w-full text-[11px] bg-transparent focus:outline-none placeholder:text-[#A1A1AA] ${
                    useDarkInk ? 'pinboard-tinted-input' : useLightInk ? '!text-[#F4F4F5]' : ''
                  }`}
                  style={
                    hasCustomTint
                      ? { backgroundColor: 'transparent', color: useLightInk ? '#F4F4F5' : '#18181B' }
                      : undefined
                  }
                />
              </form>
            )}
          </div>
        )}
      </div>
    );
  }
);

export const ProjectPinboard: React.FC<ProjectPinboardProps> = ({ project }) => {
  const {
    currentUser,
    onlineMembers,
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
  const [zones, setZones] = useState<BoardZone[]>(() => loadBoardZones(project.id));
  const [strokes, setStrokes] = useState<BoardStroke[]>(() => loadBoardStrokes(project.id));
  const [hiddenPinIds, setHiddenPinIds] = useState<string[]>([]);

  // Unified Undo / Redo Stacks for ALL workspace actions
  const undoStackRef = useRef<BoardSnapshot[]>([]);
  const redoStackRef = useRef<BoardSnapshot[]>([]);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });
  const pendingDeleteTimersRef = useRef<Record<string, { kind: 'doc' | 'note'; timer: number }>>(
    {}
  );

  const [activeStroke, setActiveStroke] = useState<BoardStroke | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [penColor, setPenColor] = useState('#0A5386');
  const [penWidth, setPenWidth] = useState(3);
  const [showElementsMenu, setShowElementsMenu] = useState(false);
  const [followingMember, setFollowingMember] = useState<MemberName | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectStyle, setConnectStyle] = useState<ConnectorStyle>('arrow');
  const [connectColor, setConnectColor] = useState('#0A5386');
  const [connectFrom, setConnectFrom] = useState<{ cardId: string; side: AnchorSide } | null>(
    null
  );
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [focusedPageId, setFocusedPageId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const pageHandlesRef = useRef<Record<string, FloatingPageHandle | null>>({});
  const [cardSizes, setCardSizes] = useState<Record<string, { w: number; h: number }>>({});

  const registerCardRef = useCallback(
    (cardId: string) => (el: HTMLDivElement | null) => {
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
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    cardId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

    const snapshotNow = useCallback(
    (): BoardSnapshot => ({
      positions: { ...positions },
      connectors: connectors.map((c) => ({
        ...c,
        segOffsets: c.segOffsets ? { ...c.segOffsets } : undefined,
      })),
      zones: zones.map((z) => ({ ...z })),
      strokes: strokes.map((s) => ({ ...s, points: [...s.points] })),
      hiddenIds: [...hiddenPinIds],
    }),
    [positions, connectors, zones, strokes, hiddenPinIds]
  );

  const pushHistory = useCallback(
    (snap?: BoardSnapshot) => {
      undoStackRef.current.push(snap ?? snapshotNow());
      if (undoStackRef.current.length > 60) undoStackRef.current.shift();
      redoStackRef.current = [];
      setHistoryCounts({
        undo: undoStackRef.current.length,
        redo: 0,
      });
    },
    [snapshotNow]
  );

  const applySnapshot = useCallback(
    (snap: BoardSnapshot) => {
      setPositions(snap.positions);
      saveBoardPositions(project.id, snap.positions);
      setConnectors(snap.connectors);
      saveBoardConnectors(project.id, snap.connectors);
      setZones(snap.zones);
      saveBoardZones(project.id, snap.zones);
      setStrokes(snap.strokes);
      saveBoardStrokes(project.id, snap.strokes);

      // Cancel pending permanent delete timers if restoring a deleted pin
      for (const id of Object.keys(pendingDeleteTimersRef.current)) {
        if (!snap.hiddenIds.includes(id)) {
          window.clearTimeout(pendingDeleteTimersRef.current[id].timer);
          delete pendingDeleteTimersRef.current[id];
        }
      }
      setHiddenPinIds(snap.hiddenIds);
    },
    [project.id]
  );

  const handleWorkspaceUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current.pop()!;
    redoStackRef.current.push(snapshotNow());
    applySnapshot(prev);
    setHistoryCounts({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, [snapshotNow, applySnapshot]);

  const handleWorkspaceRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(snapshotNow());
    applySnapshot(next);
    setHistoryCounts({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
  }, [snapshotNow, applySnapshot]);

  // Follow selected teammate's live pointer
  const followedCursor = followingMember
    ? liveCursorsMap[`${project.id}:${followingMember}`]
    : undefined;
  useEffect(() => {
    if (!followingMember || !followedCursor) return;
    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect ? rect.width : window.innerWidth;
    const vh = rect ? rect.height : window.innerHeight;
    setPan({
      x: Math.round(vw / 2 - followedCursor.x * zoomRef.current),
      y: Math.round(vh / 2 - followedCursor.y * zoomRef.current),
    });
  }, [followingMember, followedCursor?.x, followedCursor?.y, followedCursor]);

  const queueDelete = (kind: 'doc' | 'note', id: string) => {
    pushHistory();
    const timer = window.setTimeout(() => {
      if (kind === 'doc') deleteDocument(id);
      else deleteProjectNote(id);
      delete pendingDeleteTimersRef.current[id];
    }, 10000);
    pendingDeleteTimersRef.current[id] = { kind, timer };
    setHiddenPinIds((prev) => [...prev, id]);
    if (focusedPageId === id) setFocusedPageId(null);
  };

  useEffect(() => {
    if (!confirmClearAll) return;
    const t = window.setTimeout(() => setConfirmClearAll(false), 3500);
    return () => window.clearTimeout(t);
  }, [confirmClearAll]);

  const handleClearAllBoard = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    setConfirmClearAll(false);
    pushHistory();

    const newHiddenIds: string[] = [];
    for (const doc of projectDocs) {
      if (!pendingDeleteTimersRef.current[doc.id]) {
        const timer = window.setTimeout(() => {
          deleteDocument(doc.id);
          delete pendingDeleteTimersRef.current[doc.id];
        }, 10000);
        pendingDeleteTimersRef.current[doc.id] = { kind: 'doc', timer };
      }
      newHiddenIds.push(doc.id);
    }
    for (const note of pinnedPages) {
      if (!pendingDeleteTimersRef.current[note.id]) {
        const timer = window.setTimeout(() => {
          deleteProjectNote(note.id);
          delete pendingDeleteTimersRef.current[note.id];
        }, 10000);
        pendingDeleteTimersRef.current[note.id] = { kind: 'note', timer };
      }
      newHiddenIds.push(note.id);
    }

    setHiddenPinIds((prev) => Array.from(new Set([...prev, ...newHiddenIds])));
    setConnectors([]);
    saveBoardConnectors(project.id, []);
    setZones([]);
    saveBoardZones(project.id, []);
    setStrokes([]);
    saveBoardStrokes(project.id, []);
    setSelectedConnId(null);
    setSelectedZoneId(null);
    setFocusedPageId(null);
    setConnectFrom(null);
    setConnectMode(false);
    setDrawMode(false);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConnectMode(false);
        setDrawMode(false);
        setConnectFrom(null);
        setSelectedConnId(null);
        setSelectedZoneId(null);
        setFocusedPageId(null);
        setFollowingMember(null);
        return;
      }
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if (isTyping) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnId) {
        pushHistory();
        setConnectors((prev) => {
          const next = prev.filter((c) => c.id !== selectedConnId);
          saveBoardConnectors(project.id, next);
          return next;
        });
        setSelectedConnId(null);
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleWorkspaceRedo();
        else handleWorkspaceUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleWorkspaceRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      Object.entries(pendingDeleteTimersRef.current).forEach(([id, info]) => {
        window.clearTimeout(info.timer);
        if (info.kind === 'doc') deleteDocument(id);
        else deleteProjectNote(id);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnId, project.id, handleWorkspaceUndo, handleWorkspaceRedo]);

  const hiddenSet = new Set(hiddenPinIds);
  const projectDocs = documents.filter(
    (d) => d.projectId === project.id && !hiddenSet.has(d.id)
  );
  const pinnedPages = projectNotes.filter(
    (n) => n.projectId === project.id && n.content.startsWith('[PIN_PAGE]') && !hiddenSet.has(n.id)
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
    pushHistory();
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
    pushHistory();
    setConnectors((prev) => {
      const next = prev.map((c) => (c.id === connId ? { ...c, ...patch } : c));
      saveBoardConnectors(project.id, next);
      return next;
    });
  };

  const handleDeleteConnector = (connId: string) => {
    pushHistory();
    const next = connectors.filter((c) => c.id !== connId);
    setConnectors(next);
    saveBoardConnectors(project.id, next);
    if (selectedConnId === connId) setSelectedConnId(null);
  };

  const startSegmentSlide = (
    conn: BoardConnector,
    segIdx: number,
    isVertical: boolean,
    e: React.PointerEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startSnap = snapshotNow();
    let moved = false;
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const origOffset = conn.segOffsets?.[segIdx] ?? 0;

    const onMove = (ev: PointerEvent) => {
      if (!moved) {
        moved = true;
        pushHistory(startSnap);
      }
      const delta = isVertical
        ? Math.round((ev.clientX - startClientX) / zoomRef.current)
        : Math.round((ev.clientY - startClientY) / zoomRef.current);
      const nextOffsets = { ...(conn.segOffsets ?? {}), [segIdx]: origOffset + delta };
      setConnectors((prev) => {
        const next = prev.map((c) => (c.id === conn.id ? { ...c, segOffsets: nextOffsets } : c));
        saveBoardConnectors(project.id, next);
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startDrag = (cardId: string, e: React.PointerEvent, fallbackIdx = 0) => {
    if (connectMode || drawMode) return;
    e.preventDefault();
    e.stopPropagation();
    const startSnap = snapshotNow();
    const pos = getPos(cardId, fallbackIdx);
    let moved = false;
    dragRef.current = {
      cardId,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      if (!moved) {
        moved = true;
        pushHistory(startSnap);
      }
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

  const handleFitAll = () => {
    setFollowingMember(null);
    const rects: { x1: number; y1: number; x2: number; y2: number }[] = [];

    zones.forEach((z) => rects.push({ x1: z.x, y1: z.y, x2: z.x + z.w, y2: z.y + z.h }));
    pinnedPages.forEach((n, idx) => {
      const r = getCardRect(`page_${n.id}`) ?? {
        ...getPos(`page_${n.id}`, projectDocs.length + idx),
        w: 300,
        h: 165,
      };
      rects.push({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y + r.h });
    });
    projectDocs.forEach((d, idx) => {
      const r = getCardRect(`doc_${d.id}`) ?? {
        ...getPos(`doc_${d.id}`, idx),
        w: 240,
        h: 190,
      };
      rects.push({ x1: r.x, y1: r.y, x2: r.x + r.w, y2: r.y + r.h });
    });
    strokes.forEach((s) => {
      s.points.forEach(([x, y]) => rects.push({ x1: x, y1: y, x2: x, y2: y }));
    });

    if (rects.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const minX = Math.min(...rects.map((r) => r.x1));
    const minY = Math.min(...rects.map((r) => r.y1));
    const maxX = Math.max(...rects.map((r) => r.x2));
    const maxY = Math.max(...rects.map((r) => r.y2));

    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect ? rect.width : window.innerWidth;
    const vh = rect ? rect.height : window.innerHeight;
    const pad = 110;
    const bw = Math.max(100, maxX - minX);
    const bh = Math.max(100, maxY - minY);
    const nextZoom = Math.min(
      1.1,
      Math.max(0.08, Number(Math.min((vw - pad * 2) / bw, (vh - pad * 2) / bh).toFixed(3)))
    );
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    setZoom(nextZoom);
    setPan({
      x: Math.round(vw / 2 - centerX * nextZoom),
      y: Math.round(vh / 2 - centerY * nextZoom),
    });
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
    if (drawMode && e.button === 0) {
      e.preventDefault();
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) return;
      const startSnap = snapshotNow();
      const startWx = Math.round((e.clientX - rect.left - panRef.current.x) / zoomRef.current);
      const startWy = Math.round((e.clientY - rect.top - panRef.current.y) / zoomRef.current);
      let current: BoardStroke = {
        id: `stk_${Date.now()}`,
        points: [[startWx, startWy]],
        color: penColor,
        width: penWidth,
      };
      setActiveStroke(current);

      const onMove = (ev: PointerEvent) => {
        const wx = Math.round((ev.clientX - rect.left - panRef.current.x) / zoomRef.current);
        const wy = Math.round((ev.clientY - rect.top - panRef.current.y) / zoomRef.current);
        current = { ...current, points: [...current.points, [wx, wy]] };
        setActiveStroke(current);
      };

      const onUp = () => {
        if (current.points.length > 1) {
          pushHistory(startSnap);
          setStrokes((prev) => {
            const next = [...prev, current];
            saveBoardStrokes(project.id, next);
            return next;
          });
        }
        setActiveStroke(null);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      return;
    }

    if (e.target !== e.currentTarget && e.button !== 1) return;
    if (e.target === e.currentTarget) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setShowElementsMenu(false);
      setSelectedConnId(null);
      setSelectedZoneId(null);
      setFocusedPageId(null);
      if (connectMode) setConnectFrom(null);
    }
    setFollowingMember(null);
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

  const jumpToWorldPoint = (wx: number, wy: number) => {
    setFollowingMember(null);
    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect ? rect.width : window.innerWidth;
    const vh = rect ? rect.height : window.innerHeight;
    setPan({
      x: Math.round(vw / 2 - wx * zoomRef.current),
      y: Math.round(vh / 2 - wy * zoomRef.current),
    });
    setShowElementsMenu(false);
  };

  const handleAddZone = () => {
    pushHistory();
    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect ? rect.width : window.innerWidth;
    const vh = rect ? rect.height : window.innerHeight;
    const cx = Math.round((-panRef.current.x + vw / 2 - 210) / zoomRef.current);
    const cy = Math.round((-panRef.current.y + vh / 2 - 150) / zoomRef.current);
    const newZone: BoardZone = {
      id: `zone_${Date.now()}`,
      title: 'Discussion Zone',
      x: cx,
      y: cy,
      w: 420,
      h: 300,
      color: '#0A5386',
    };
    const next = [...zones, newZone];
    setZones(next);
    saveBoardZones(project.id, next);
    setSelectedZoneId(newZone.id);
    setFocusedPageId(null);
    setSelectedConnId(null);
  };

  const updateZone = (zoneId: string, patch: Partial<BoardZone>, recordHistory = false) => {
    if (recordHistory) pushHistory();
    setZones((prev) => {
      const next = prev.map((z) => (z.id === zoneId ? { ...z, ...patch } : z));
      saveBoardZones(project.id, next);
      return next;
    });
  };

  const deleteZone = (zoneId: string) => {
    pushHistory();
    setZones((prev) => {
      const next = prev.filter((z) => z.id !== zoneId);
      saveBoardZones(project.id, next);
      return next;
    });
    if (selectedZoneId === zoneId) setSelectedZoneId(null);
  };

  const startZoneDrag = (zone: BoardZone, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startSnap = snapshotNow();
    let moved = false;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = zone.x;
    const origY = zone.y;

    const onMove = (ev: PointerEvent) => {
      if (!moved) {
        moved = true;
        pushHistory(startSnap);
      }
      const dx = (ev.clientX - startX) / zoomRef.current;
      const dy = (ev.clientY - startY) / zoomRef.current;
      updateZone(zone.id, { x: Math.round(origX + dx), y: Math.round(origY + dy) });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startZoneResize = (zone: BoardZone, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startSnap = snapshotNow();
    let resized = false;
    const startX = e.clientX;
    const startY = e.clientY;
    const origW = zone.w;
    const origH = zone.h;

    const onMove = (ev: PointerEvent) => {
      if (!resized) {
        resized = true;
        pushHistory(startSnap);
      }
      const dx = (ev.clientX - startX) / zoomRef.current;
      const dy = (ev.clientY - startY) / zoomRef.current;
      updateZone(zone.id, {
        w: Math.max(220, Math.round(origW + dx)),
        h: Math.max(160, Math.round(origH + dy)),
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const strokeToPath = (pts: [number, number][]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]} l 0.1 0.1`;
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i][0]} ${pts[i][1]}`;
    }
    return d;
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
  const focusedPage = pinnedPages.find((n) => n.id === focusedPageId) ?? null;
  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;
  const totalPins = projectDocs.length + pinnedPages.length;

  const getStrokeDash = (style: ConnectorStyle) => {
    if (style === 'dashed') return '8 6';
    if (style === 'dotted') return '2 6';
    return undefined;
  };

  const renderStyleIcon = (st: ConnectorStyle) => {
    if (st === 'arrow') return <ArrowUpRight className="w-3.5 h-3.5" />;
    if (st === 'line') {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    }
    if (st === 'dashed') {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line
            x1="2"
            y1="7"
            x2="12"
            y2="7"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="3 2.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <line
          x1="2"
          y1="7"
          x2="12"
          y2="7"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="0.5 3.5"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Top-Center Horizontal Online Members & Follow Pointer Pill */}
      {onlineMembers.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-2 py-1 shadow-lg border border-[#E4E2DC] flex items-center gap-1 max-w-[90vw] overflow-x-auto backdrop-blur-md">
          {onlineMembers.map((member) => {
            const color = getMemberColor(member);
            const isMe = member === currentUser?.name;
            const isFollowing = followingMember === member;
            return (
              <button
                key={member}
                type="button"
                disabled={isMe}
                onClick={() => setFollowingMember((prev) => (prev === member ? null : member))}
                title={
                  isMe
                    ? `${member} (You)`
                    : isFollowing
                    ? `Stop following ${member}`
                    : `Click to follow ${member}'s pointer`
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  isFollowing
                    ? 'bg-[#0A5386] text-white shadow-sm'
                    : isMe
                    ? 'text-[#52525B] cursor-default'
                    : 'text-[#18181B] hover:bg-black/5 cursor-pointer'
                }`}
              >
                <svg width="11" height="12" viewBox="0 0 20 22" fill="none" className="shrink-0">
                  <path
                    d="M2.5 1.5L17.5 10.5L10.2 12.6L6.8 19.5L2.5 1.5Z"
                    fill={isFollowing ? '#FFFFFF' : color}
                    stroke={isFollowing ? color : '#FFFFFF'}
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{isMe ? `${member} (You)` : member}</span>
                {isFollowing && <span className="text-[9px] opacity-85">· Following</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Top-Left Collapsible Elements Index Menu */}
      <div className="fixed top-16 left-4 z-40">
        <button
          type="button"
          onClick={() => setShowElementsMenu((v) => !v)}
          className="ios-press paper-card rounded-full px-3 py-1.5 shadow-lg border border-[#E4E2DC] inline-flex items-center gap-1.5 text-xs font-semibold text-[#18181B] backdrop-blur-md"
        >
          <Layers className="w-3.5 h-3.5 text-[#0A5386]" />
          <span>Elements ({totalPins + zones.length})</span>
        </button>

        {showElementsMenu && (
          <div className="mt-2 w-60 max-h-72 overflow-y-auto paper-card rounded-2xl p-2 shadow-2xl border border-[#E4E2DC] space-y-1 backdrop-blur-md">
            {totalPins + zones.length === 0 ? (
              <div className="py-4 text-center text-[11px] text-[#71717A]">
                No elements on board yet.
              </div>
            ) : (
              <>
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => jumpToWorldPoint(z.x + z.w / 2, z.y + z.h / 2)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-black/5 text-[#18181B]"
                  >
                    <Frame className="w-3.5 h-3.5 shrink-0" style={{ color: z.color }} />
                    <span className="truncate font-medium">{z.title || 'Zone'}</span>
                  </button>
                ))}
                {pinnedPages.map((note, idx) => {
                  const cardId = `page_${note.id}`;
                  const p = positions[cardId] ?? getPos(cardId, projectDocs.length + idx);
                  const parsed = parsePinPageContent(note.content);
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => jumpToWorldPoint(p.x + 150, p.y + 90)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-black/5 text-[#18181B]"
                    >
                      <StickyNote className="w-3.5 h-3.5 text-[#0A5386] shrink-0" />
                      <span className="truncate font-medium">
                        {parsed.title || 'Untitled Page'}
                      </span>
                    </button>
                  );
                })}
                {projectDocs.map((doc, idx) => {
                  const cardId = `doc_${doc.id}`;
                  const p = positions[cardId] ?? getPos(cardId, idx);
                  const isImg = doc.mimeType.startsWith('image/');
                  return (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => jumpToWorldPoint(p.x + 100, p.y + 80)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-black/5 text-[#18181B]"
                    >
                      {isImg ? (
                        <ImageIcon className="w-3.5 h-3.5 text-[#254454] shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-[#133F47] shrink-0" />
                      )}
                      <span className="truncate font-medium">{doc.name}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Contextual Floating Edit Tab: Line / Page / Zone / Connect / Pen */}
      {selectedConn && !connectMode && !drawMode && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-2.5 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-1.5 backdrop-blur-md">
          {(['arrow', 'line', 'dashed', 'dotted'] as ConnectorStyle[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => updateConnector(selectedConn.id, { style: st })}
              title={st}
              className={`p-1.5 rounded-full ${
                selectedConn.style === st
                  ? 'bg-[#0A5386] text-white'
                  : 'text-[#52525B] hover:bg-black/5'
              }`}
            >
              {renderStyleIcon(st)}
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
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
          <ColorWheelButton
            value={selectedConn.color}
            isCustom={!CONNECTOR_COLORS.includes(selectedConn.color)}
            onChange={(hex) => updateConnector(selectedConn.id, { color: hex })}
            title="Line Color Wheel"
          />
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
          {selectedConn.segOffsets && Object.keys(selectedConn.segOffsets).length > 0 && (
            <button
              type="button"
              onClick={() => updateConnector(selectedConn.id, { segOffsets: undefined })}
              title="Reset Line Lengths"
              className="p-1.5 rounded-full text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() =>
              updateConnector(selectedConn.id, {
                fromId: selectedConn.toId,
                toId: selectedConn.fromId,
                fromAnchor: selectedConn.toAnchor ?? 'left',
                toAnchor: selectedConn.fromAnchor ?? 'right',
                segOffsets: undefined,
              })
            }
            title="Reverse Arrow Direction"
            className="p-1.5 rounded-full text-[#52525B] hover:text-[#18181B] hover:bg-black/5"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteConnector(selectedConn.id)}
            title="Delete Line"
            className="p-1.5 rounded-full text-[#DC2626] hover:bg-[#DC2626]/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {focusedPage && !connectMode && !drawMode && !selectedConn && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-2.5 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-1 backdrop-blur-md"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pageHandlesRef.current[focusedPage.id]?.execFormat('bold');
            }}
            title="Bold"
            className="p-1.5 rounded-full hover:bg-black/5 text-[#18181B]"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pageHandlesRef.current[focusedPage.id]?.execFormat('italic');
            }}
            title="Italic"
            className="p-1.5 rounded-full hover:bg-black/5 text-[#18181B]"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pageHandlesRef.current[focusedPage.id]?.execFormat('underline');
            }}
            title="Underline"
            className="p-1.5 rounded-full hover:bg-black/5 text-[#18181B]"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pageHandlesRef.current[focusedPage.id]?.execFormat('insertUnorderedList');
            }}
            title="Bullet List"
            className="p-1.5 rounded-full hover:bg-black/5 text-[#18181B]"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              pageHandlesRef.current[focusedPage.id]?.openChecklist();
            }}
            title="Add Checklist Inside Page"
            className="p-1.5 rounded-full hover:bg-black/5 text-[#0A5386]"
          >
            <ListChecks className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
          {PAGE_PAPER_COLORS.map((c) => {
            const activeColor = parsePinPageContent(focusedPage.content).bgColor ?? '';
            return (
              <button
                key={c.label}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pushHistory();
                  pageHandlesRef.current[focusedPage.id]?.setPaperColor(c.hex);
                }}
                title={c.label}
                style={{ backgroundColor: c.hex || '#FCFBF8' }}
                className={`w-3.5 h-3.5 rounded-full border border-black/20 ${
                  activeColor === c.hex ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
                }`}
              />
            );
          })}
          {(() => {
            const activeColor = parsePinPageContent(focusedPage.content).bgColor ?? '';
            const isPreset = PAGE_PAPER_COLORS.some((c) => c.hex === activeColor);
            return (
              <ColorWheelButton
                value={activeColor || '#FCFBF8'}
                isCustom={Boolean(activeColor) && !isPreset}
                onChange={(hex) => {
                  pushHistory();
                  pageHandlesRef.current[focusedPage.id]?.setPaperColor(hex);
                }}
                title="Page Paper Color Wheel"
              />
            );
          })()}
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
          <button
            type="button"
            onClick={() => queueDelete('note', focusedPage.id)}
            title="Delete Page"
            className="p-1.5 rounded-full text-[#DC2626] hover:bg-[#DC2626]/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedZone && !connectMode && !drawMode && !selectedConn && !focusedPage && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-3 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-2 backdrop-blur-md"
        >
          <Frame className="w-3.5 h-3.5 shrink-0" style={{ color: selectedZone.color }} />
          <input
            type="text"
            value={selectedZone.title}
            onChange={(e) => updateZone(selectedZone.id, { title: e.target.value })}
            placeholder="Zone name..."
            className="w-32 text-xs font-semibold bg-transparent focus:outline-none text-[#18181B]"
          />
          <div className="w-px h-4 bg-[#E4E2DC]" />
          {CONNECTOR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => updateZone(selectedZone.id, { color: c }, true)}
              style={{ backgroundColor: c }}
              className={`w-3.5 h-3.5 rounded-full border border-white/40 ${
                selectedZone.color === c ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
              }`}
            />
          ))}
          <ColorWheelButton
            value={selectedZone.color}
            isCustom={!CONNECTOR_COLORS.includes(selectedZone.color)}
            onChange={(hex) => updateZone(selectedZone.id, { color: hex }, true)}
            title="Zone Color Wheel"
          />
          <div className="w-px h-4 bg-[#E4E2DC]" />
          <button
            type="button"
            onClick={() => deleteZone(selectedZone.id)}
            title="Delete Zone"
            className="p-1 rounded-full text-[#DC2626] hover:bg-[#DC2626]/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {connectMode && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-2.5 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-1.5 backdrop-blur-md">
          {(['arrow', 'line', 'dashed', 'dotted'] as ConnectorStyle[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setConnectStyle(st)}
              title={st}
              className={`p-1.5 rounded-full ${
                connectStyle === st
                  ? 'bg-[#0A5386] text-white'
                  : 'text-[#52525B] hover:bg-black/5'
              }`}
            >
              {renderStyleIcon(st)}
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
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
          <ColorWheelButton
            value={connectColor}
            isCustom={!CONNECTOR_COLORS.includes(connectColor)}
            onChange={(hex) => setConnectColor(hex)}
            title="Connector Color Wheel"
          />
        </div>
      )}

      {drawMode && (
        <div className="fixed bottom-18 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-3 py-1.5 shadow-xl border border-[#E4E2DC] flex items-center gap-2 backdrop-blur-md">
          {['#18181B', '#0A5386', '#8B1E1E', '#133F47', '#F4F4F5'].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setPenColor(c)}
              style={{ backgroundColor: c }}
              className={`w-4 h-4 rounded-full border border-black/20 ${
                penColor === c ? 'ring-2 ring-offset-1 ring-[#0A5386]' : ''
              }`}
            />
          ))}
          <ColorWheelButton
            value={penColor}
            isCustom={!['#18181B', '#0A5386', '#8B1E1E', '#133F47', '#F4F4F5'].includes(penColor)}
            onChange={(hex) => setPenColor(hex)}
            title="Pen Color Wheel"
          />
          <div className="w-px h-4 bg-[#E4E2DC]" />
          {[2, 4, 7].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setPenWidth(w)}
              title={`${w}px stroke`}
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                penWidth === w ? 'bg-[#0A5386]/15 ring-1 ring-[#0A5386]' : 'hover:bg-black/5'
              }`}
            >
              <span
                className="rounded-full bg-current text-[#18181B]"
                style={{ width: w + 3, height: w + 3 }}
              />
            </button>
          ))}
          <div className="w-px h-4 bg-[#E4E2DC]" />
          <button
            type="button"
            onClick={() => {
              pushHistory();
              setStrokes([]);
              saveBoardStrokes(project.id, []);
            }}
            title="Clear All Sketches"
            className="p-1.5 rounded-full text-[#DC2626] hover:bg-[#DC2626]/10"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
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
          onClick={handleAddZone}
          className="ios-press shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#254454] text-white rounded-full"
        >
          <Frame className="w-3.5 h-3.5" />
          Add Zone
        </button>

        <button
          type="button"
          onClick={() => {
            setConnectMode((v) => !v);
            setDrawMode(false);
            setConnectFrom(null);
            setSelectedConnId(null);
          }}
          title={connectMode ? 'Exit Connect Mode' : 'Connect Elements'}
          className={`ios-press shrink-0 inline-flex items-center justify-center p-2 rounded-full ${
            connectMode ? 'bg-[#8B1E1E] text-white' : 'bg-[#133F47] text-white'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setDrawMode((v) => !v);
            setConnectMode(false);
            setConnectFrom(null);
            setSelectedConnId(null);
          }}
          title={drawMode ? 'Exit Freehand Pen' : 'Freehand Sketch Pen'}
          className={`ios-press shrink-0 inline-flex items-center justify-center p-2 rounded-full ${
            drawMode
              ? 'bg-[#8B1E1E] text-white'
              : 'bg-white/80 border border-[#E4E2DC] text-[#18181B]'
          }`}
        >
          <Pen className="w-3.5 h-3.5" />
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
          disabled={historyCounts.undo === 0}
          onClick={handleWorkspaceUndo}
          title="Undo (Ctrl+Z)"
          className="ios-press shrink-0 p-2 rounded-full text-[#18181B] disabled:opacity-35 hover:bg-black/5"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={historyCounts.redo === 0}
          onClick={handleWorkspaceRedo}
          title="Redo (Ctrl+Y)"
          className="ios-press shrink-0 p-2 rounded-full text-[#18181B] disabled:opacity-35 hover:bg-black/5"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-[#E4E2DC] mx-0.5 shrink-0" />

        <button
          type="button"
          disabled={totalPins + zones.length + connectors.length + strokes.length === 0}
          onClick={handleClearAllBoard}
          title="Clear entire canvas (Undo restores everything)"
          className={`ios-press shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-full disabled:opacity-35 transition-colors ${
            confirmClearAll
              ? 'bg-[#DC2626] text-white'
              : 'text-[#DC2626] hover:bg-[#DC2626]/10'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirmClearAll ? 'Confirm?' : 'Clear All'}
        </button>
      </div>

      {/* Fixed Floating Zoom + Fit All Pill (Bottom-Right) */}
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
        <div className="w-px h-4 bg-[#E4E2DC] mx-0.5" />
        <button
          type="button"
          onClick={handleFitAll}
          title="Fit All Elements & Connections"
          className="ios-press inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-[#0A5386] text-white rounded-full"
        >
          <Maximize2 className="w-3 h-3" />
          Fit All
        </button>
      </div>

      {/* Empty Canvas Subtle Hint */}
      {totalPins + zones.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-sm font-medium text-[#71717A]">
              Blank infinite board for {project.title}
            </p>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Use the floating pill below to add pages, zones, sketches, arrows, or pin images &amp; files.
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
          connectMode || drawMode
            ? 'cursor-crosshair'
            : isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
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
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute top-0 left-0 select-text"
        >
          {/* Resizable Discussion Zones (z-0, behind pins) */}
          {zones.map((zone) => {
            const isZoneSelected = selectedZoneId === zone.id;
            return (
              <div
                key={zone.id}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedZoneId(zone.id);
                  setFocusedPageId(null);
                  setSelectedConnId(null);
                }}
                style={{
                  left: zone.x,
                  top: zone.y,
                  width: zone.w,
                  height: zone.h,
                  backgroundColor: `${zone.color}12`,
                  borderColor: isZoneSelected ? zone.color : `${zone.color}55`,
                }}
                className={`group absolute rounded-2xl border-2 border-dashed z-0 select-none ${
                  isZoneSelected ? 'ring-2 ring-offset-2 ring-[#0A5386]/40' : ''
                }`}
              >
                <div
                  onPointerDown={(e) => startZoneDrag(zone, e)}
                  className="px-3.5 py-2 flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing"
                >
                  <input
                    type="text"
                    value={zone.title}
                    onChange={(e) => updateZone(zone.id, { title: e.target.value })}
                    className="text-xs font-bold bg-transparent focus:outline-none w-full"
                    style={{ color: zone.color, backgroundColor: 'transparent' }}
                  />
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => deleteZone(zone.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-[#71717A] hover:text-[#DC2626] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom-Right Resize Handle */}
                <div
                  onPointerDown={(e) => startZoneResize(zone, e)}
                  title="Drag to resize zone"
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1 right-1 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5"
                >
                  <span
                    className="w-2.5 h-2.5 border-r-2 border-b-2 rounded-br-xs"
                    style={{ borderColor: zone.color }}
                  />
                </div>
              </div>
            );
          })}

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
                      onClick={() => queueDelete('doc', doc.id)}
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
                      onClick={() => queueDelete('doc', doc.id)}
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
            const activeSide = connectFrom?.cardId === cardId ? connectFrom.side : null;
            return (
              <FloatingPagePin
                key={note.id}
                ref={(h) => {
                  pageHandlesRef.current[note.id] = h;
                }}
                note={note}
                pos={positions[cardId] ?? fallbackPos}
                connectActive={connectMode}
                isFocusedCard={focusedPageId === note.id}
                activeAnchorSide={activeSide}
                onFocusCard={() => {
                  setFocusedPageId(note.id);
                  setSelectedZoneId(null);
                  setSelectedConnId(null);
                }}
                onSelectAnchor={(side) => handleSelectAnchor(cardId, side)}
                onMeasure={registerCardRef(cardId)}
                onDragStart={(e) => startDrag(cardId, e, projectDocs.length + idx)}
                onUpdate={(content) => updateProjectNote(note.id, content)}
                onDelete={() => queueDelete('note', note.id)}
              />
            );
          })}

          {/* Orthogonal Rounded-Corner SVG Connectors & Freehand Pen Layer */}
          <svg className="pointer-events-none overflow-visible absolute top-0 left-0 w-px h-px z-10">
            <defs>
              {Array.from(
                new Set([...CONNECTOR_COLORS, connectColor, ...connectors.map((c) => c.color)])
              ).map((c) => {
                const key = c.replace('#', '');
                return (
                  <marker
                    key={key}
                    id={`arrow-${key}`}
                    viewBox="0 0 12 12"
                    refX="10.5"
                    refY="6"
                    markerWidth="6"
                    markerHeight="6"
                    markerUnits="strokeWidth"
                    orient="auto-start-reverse"
                  >
                    <path d="M 1 1.5 L 11.5 6 L 1 10.5 z" fill={c} />
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
              const pts = getConnectorPolylinePoints(
                from,
                fromSide,
                to,
                toSide,
                conn.segOffsets
              );
              const d = buildRoundedPathFromPoints(pts, 14);

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
                    setFocusedPageId(null);
                    setSelectedZoneId(null);
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
                  {isSelected &&
                    pts.slice(1, -2).map((a, i) => {
                      const segIdx = i + 1;
                      const b = pts[segIdx + 1];
                      if (!b || Math.hypot(b.x - a.x, b.y - a.y) < 16) return null;
                      const isVertical = Math.abs(a.x - b.x) < 0.5;
                      const mx = (a.x + b.x) / 2;
                      const my = (a.y + b.y) / 2;
                      const w = isVertical ? 8 : 20;
                      const h = isVertical ? 20 : 8;
                      return (
                        <rect
                          key={`slide-${segIdx}`}
                          x={mx - w / 2}
                          y={my - h / 2}
                          width={w}
                          height={h}
                          rx={4}
                          fill="#FFFFFF"
                          stroke={conn.color}
                          strokeWidth={2}
                          onPointerDown={(e) => startSegmentSlide(conn, segIdx, isVertical, e)}
                          className={isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                        />
                      );
                    })}
                </g>
              );
            })}

            {strokes.map((stk) => (
              <path
                key={stk.id}
                d={strokeToPath(stk.points)}
                fill="none"
                stroke={stk.color}
                strokeWidth={stk.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {activeStroke && (
              <path
                d={strokeToPath(activeStroke.points)}
                fill="none"
                stroke={activeStroke.color}
                strokeWidth={activeStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

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
