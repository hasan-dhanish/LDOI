import React, { useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  Crosshair,
  Download,
  FileSpreadsheet,
  FileText,
  GripHorizontal,
  Image as ImageIcon,
  ListChecks,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useLdoi } from '../context/LdoiContext';
import {
  loadBoardPositions,
  parseRequirementCheckpoints,
  saveBoardPositions,
  serializeRequirementCheckpoints,
  type BoardPositions,
} from '../lib/pinboard';
import type { Project, ProjectNote } from '../types';

interface ProjectPinboardProps {
  project: Project;
}

function getFileBadge(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'SHEET';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  return ext.toUpperCase().slice(0, 5) || 'FILE';
}

const FloatingPagePin: React.FC<{
  note: ProjectNote;
  pos: { x: number; y: number };
  onDragStart: (e: React.PointerEvent) => void;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}> = ({ note, pos, onDragStart, onUpdate, onDelete }) => {
  const raw = note.content.slice('[PIN_PAGE]'.length);
  const newlineIdx = raw.indexOf('\n');
  const initialHeading = newlineIdx === -1 ? raw : raw.slice(0, newlineIdx);
  const initialBody = newlineIdx === -1 ? '' : raw.slice(newlineIdx + 1);

  const [heading, setHeading] = useState(initialHeading);
  const [body, setBody] = useState(initialBody);
  const saveTimerRef = useRef<number | null>(null);

  const scheduleSave = (nextHeading: string, nextBody: string) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      onUpdate(`[PIN_PAGE]${nextHeading}\n${nextBody}`);
    }, 250);
  };

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="group absolute w-[280px] p-2 select-none"
    >
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 right-0 z-10 flex items-center gap-1">
        <div
          onPointerDown={onDragStart}
          title="Drag page"
          className="w-6 h-6 rounded-full bg-white/90 border border-[#E4E2DC] text-[#52525B] flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing"
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

      <input
        type="text"
        value={heading}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setHeading(e.target.value);
          scheduleSave(e.target.value, body);
        }}
        placeholder="Page title..."
        className="w-full text-sm font-bold text-[#18181B] bg-transparent focus:outline-none placeholder:text-[#A1A1AA]"
      />
      <textarea
        rows={5}
        value={body}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setBody(e.target.value);
          scheduleSave(heading, e.target.value);
        }}
        placeholder="Write notes..."
        className="mt-1 w-full text-xs text-[#3F3F46] leading-relaxed bg-transparent focus:outline-none resize-y placeholder:text-[#A1A1AA]"
      />
    </div>
  );
};

const FloatingChecklistPin: React.FC<{
  note: ProjectNote;
  pos: { x: number; y: number };
  onDragStart: (e: React.PointerEvent) => void;
  onUpdate: (content: string) => void;
  onDelete: () => void;
}> = ({ note, pos, onDragStart, onUpdate, onDelete }) => {
  const raw = note.content.slice('[PIN_CHECKLIST]'.length);
  const newlineIdx = raw.indexOf('\n');
  const initialHeading = newlineIdx === -1 ? raw : raw.slice(0, newlineIdx);
  const initialJson = newlineIdx === -1 ? '[]' : raw.slice(newlineIdx + 1);

  const [heading, setHeading] = useState(initialHeading);
  const [newItem, setNewItem] = useState('');
  const items = parseRequirementCheckpoints(initialJson);

  const saveAll = (nextHeading: string, nextItems: typeof items) => {
    onUpdate(`[PIN_CHECKLIST]${nextHeading}\n${serializeRequirementCheckpoints(nextItems)}`);
  };

  return (
    <div
      style={{ left: pos.x, top: pos.y }}
      className="group absolute w-[270px] p-2 select-none"
    >
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 right-0 z-10 flex items-center gap-1">
        <div
          onPointerDown={onDragStart}
          title="Drag checklist"
          className="w-6 h-6 rounded-full bg-white/90 border border-[#E4E2DC] text-[#52525B] flex items-center justify-center shadow-sm cursor-grab active:cursor-grabbing"
        >
          <GripHorizontal className="w-3.5 h-3.5" />
        </div>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          title="Delete checklist"
          className="w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-sm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        type="text"
        value={heading}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          setHeading(e.target.value);
          saveAll(e.target.value, items);
        }}
        placeholder="Checklist title..."
        className="w-full text-sm font-bold text-[#18181B] bg-transparent focus:outline-none placeholder:text-[#A1A1AA]"
      />

      <div className="mt-1.5 space-y-1">
        {items.map((cp) => (
          <div key={cp.id} className="flex items-start justify-between gap-1.5">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                saveAll(
                  heading,
                  items.map((c) => (c.id === cp.id ? { ...c, done: !c.done } : c))
                )
              }
              className="flex items-start gap-2 text-left flex-1 min-w-0"
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
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                saveAll(
                  heading,
                  items.filter((c) => c.id !== cp.id)
                )
              }
              className="opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-[#DC2626] shrink-0"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!newItem.trim()) return;
          saveAll(heading, [
            ...items,
            { id: `cp_${Date.now()}`, text: newItem.trim(), done: false },
          ]);
          setNewItem('');
        }}
        className="mt-2 flex items-center gap-1"
      >
        <input
          type="text"
          value={newItem}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="+ Add item..."
          className="flex-1 text-xs bg-transparent focus:outline-none text-[#18181B] placeholder:text-[#A1A1AA]"
        />
      </form>
    </div>
  );
};

export const ProjectPinboard: React.FC<ProjectPinboardProps> = ({ project }) => {
  const {
    projectNotes,
    documents,
    addProjectNote,
    updateProjectNote,
    deleteProjectNote,
    uploadDocument,
    deleteDocument,
  } = useLdoi();

  const [positions, setPositions] = useState<BoardPositions>(() =>
    loadBoardPositions(project.id)
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

  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const pinnedPages = projectNotes.filter(
    (n) => n.projectId === project.id && n.content.startsWith('[PIN_PAGE]')
  );
  const pinnedChecklists = projectNotes.filter(
    (n) => n.projectId === project.id && n.content.startsWith('[PIN_CHECKLIST]')
  );

  const getViewportCenterWorld = () => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const vw = rect ? rect.width : window.innerWidth;
    const vh = rect ? rect.height : window.innerHeight;
    return {
      x: Math.round((-panRef.current.x + vw / 2 - 130) / zoomRef.current),
      y: Math.round((-panRef.current.y + vh / 2 - 80) / zoomRef.current),
    };
  };

  const getPos = (cardId: string, fallbackIndex = 0): { x: number; y: number } => {
    if (positions[cardId]) return positions[cardId];
    const col = fallbackIndex % 4;
    const row = Math.floor(fallbackIndex / 4);
    return { x: 80 + col * 300, y: 100 + row * 260 };
  };

  const startDrag = (cardId: string, e: React.PointerEvent, fallbackIdx = 0) => {
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
    await addProjectNote(project.id, '[PIN_PAGE]\n');
  };

  const handleInstantAddChecklist = async () => {
    await addProjectNote(project.id, '[PIN_CHECKLIST]Checklist\n[]');
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

  const totalPins = projectDocs.length + pinnedPages.length + pinnedChecklists.length;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
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
          onClick={handleInstantAddChecklist}
          className="ios-press shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#133F47] text-white rounded-full"
        >
          <ListChecks className="w-3.5 h-3.5" />
          Add Checklist
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

      {/* Empty Canvas Subtle Hint */}
      {totalPins === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4">
            <p className="text-sm font-medium text-[#71717A]">
              Blank infinite board for {project.title}
            </p>
            <p className="text-xs text-[#A1A1AA] mt-1">
              Use the floating pill below to drop pages, checklists, design inspo, or files anywhere.
            </p>
          </div>
        </div>
      )}

      {/* True Infinite Pan & Zoom Matrix Canvas (Dotted Matrix, No Scrollbars) */}
      <div
        ref={viewportRef}
        onPointerDown={startCanvasPan}
        className={`flex-1 overflow-hidden relative select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
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
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute top-0 left-0 will-change-transform select-text"
        >
          {/* Pinned Design Inspo Images & Uploaded Files (Borderless Floating Pins) */}
          {projectDocs.map((doc, idx) => {
            const cardId = `doc_${doc.id}`;
            const pos = getPos(cardId, idx);
            const isImage = doc.mimeType.startsWith('image/');
            const badge = getFileBadge(doc.name);

            if (isImage) {
              return (
                <div
                  key={doc.id}
                  style={{ left: pos.x, top: pos.y }}
                  onPointerDown={(e) => startDrag(cardId, e, idx)}
                  className="group absolute w-[240px] cursor-grab active:cursor-grabbing select-none"
                >
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => deleteDocument(doc.id)}
                    title="Delete pin"
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2.5 -right-2.5 z-10 w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
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
                style={{ left: pos.x, top: pos.y }}
                onPointerDown={(e) => startDrag(cardId, e, idx)}
                className="group absolute w-[150px] flex flex-col items-center cursor-grab active:cursor-grabbing select-none"
              >
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
                    onClick={() => deleteDocument(doc.id)}
                    title="Delete pin"
                    className="w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-sm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

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

          {/* Borderless Floating Pages (Editable In-Place) */}
          {pinnedPages.map((note, idx) => {
            const cardId = `page_${note.id}`;
            const fallbackPos = getPos(cardId, projectDocs.length + idx);
            return (
              <FloatingPagePin
                key={note.id}
                note={note}
                pos={positions[cardId] ?? fallbackPos ?? getViewportCenterWorld()}
                onDragStart={(e) => startDrag(cardId, e, projectDocs.length + idx)}
                onUpdate={(content) => updateProjectNote(note.id, content)}
                onDelete={() => deleteProjectNote(note.id)}
              />
            );
          })}

          {/* Borderless Floating Checklists (Interactive In-Place) */}
          {pinnedChecklists.map((note, idx) => {
            const cardId = `chk_${note.id}`;
            const fallbackPos = getPos(cardId, projectDocs.length + pinnedPages.length + idx);
            return (
              <FloatingChecklistPin
                key={note.id}
                note={note}
                pos={positions[cardId] ?? fallbackPos ?? getViewportCenterWorld()}
                onDragStart={(e) =>
                  startDrag(cardId, e, projectDocs.length + pinnedPages.length + idx)
                }
                onUpdate={(content) => updateProjectNote(note.id, content)}
                onDelete={() => deleteProjectNote(note.id)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
