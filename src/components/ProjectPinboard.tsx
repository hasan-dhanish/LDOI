import React, { useEffect, useRef, useState } from 'react';
import {
  CheckSquare,
  Crosshair,
  Download,
  FileSpreadsheet,
  FileText,
  GripHorizontal,
  Image as ImageIcon,
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
import { MEMBER_NAMES, PROJECT_CATEGORIES } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import {
  loadBoardPositions,
  parseRequirementCheckpoints,
  saveBoardPositions,
  serializeRequirementCheckpoints,
  type BoardPositions,
} from '../lib/pinboard';
import type { MemberName, Project, ProjectCategory, ProjectStatus } from '../types';

interface ProjectPinboardProps {
  project: Project;
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  checkpoints: { x: 24, y: 72 },
  spec: { x: 380, y: 72 },
  workflow: { x: 736, y: 72 },
  controls: { x: 24, y: 408 },
};

function getFileBadge(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'SHEET';
  if (['doc', 'docx'].includes(ext)) return 'DOC';
  return ext.toUpperCase().slice(0, 5) || 'FILE';
}

export const ProjectPinboard: React.FC<ProjectPinboardProps> = ({ project }) => {
  const {
    workflowSteps,
    projectNotes,
    documents,
    updateProject,
    addWorkflowStep,
    toggleWorkflowStep,
    addProjectNote,
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
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const dragRef = useRef<{
    cardId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [newCp, setNewCp] = useState('');
  const [newStep, setNewStep] = useState('');
  const [newStepAssignee, setNewStepAssignee] = useState<MemberName>('Hasan');
  const [showAddPage, setShowAddPage] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [pageBody, setPageBody] = useState('');

  const checkpoints = parseRequirementCheckpoints(project.requirements);
  const steps = workflowSteps
    .filter((s) => s.projectId === project.id)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const pinnedPages = projectNotes.filter(
    (n) => n.projectId === project.id && n.content.startsWith('[PIN_PAGE]')
  );

  const getPos = (cardId: string, fallbackIndex = 0): { x: number; y: number } => {
    if (positions[cardId]) return positions[cardId];
    if (DEFAULT_POSITIONS[cardId]) return DEFAULT_POSITIONS[cardId];
    const col = (fallbackIndex % 3) + 1;
    const row = Math.floor(fallbackIndex / 3);
    return { x: 24 + col * 356, y: 360 + row * 260 };
  };

  const startDrag = (cardId: string, e: React.PointerEvent, fallbackIdx = 0) => {
    e.preventDefault();
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
      const dx = (ev.clientX - dragRef.current.startX) / zoom;
      const dy = (ev.clientY - dragRef.current.startY) / zoom;
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

  const handleToggleCheckpoint = (cpId: string) => {
    const next = checkpoints.map((c) => (c.id === cpId ? { ...c, done: !c.done } : c));
    updateProject(project.id, { requirements: serializeRequirementCheckpoints(next) });
  };

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCp.trim()) return;
    const next = [
      ...checkpoints,
      { id: `cp_${Date.now()}`, text: newCp.trim(), done: false },
    ];
    updateProject(project.id, { requirements: serializeRequirementCheckpoints(next) });
    setNewCp('');
  };

  const handleRemoveCheckpoint = (cpId: string) => {
    const next = checkpoints.filter((c) => c.id !== cpId);
    updateProject(project.id, { requirements: serializeRequirementCheckpoints(next) });
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    await addWorkflowStep({
      projectId: project.id,
      stepOrder: steps.length + 1,
      title: newStep.trim(),
      assignee: newStepAssignee,
      dueDate: '',
      completed: false,
    });
    setNewStep('');
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

  const handleAddPinnedPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageTitle.trim()) return;
    await addProjectNote(project.id, `[PIN_PAGE]${pageTitle.trim()}\n${pageBody.trim()}`);
    setPageTitle('');
    setPageBody('');
    setShowAddPage(false);
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
      const worldX = (cx - prevPan.x) / zoom;
      const worldY = (cy - prevPan.y) / zoom;
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
      // Non-passive listener blocks browser history back/forward swipe & browser pinch-zoom
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

  const cpDone = checkpoints.filter((c) => c.done).length;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {/* Fixed Floating Pill Bar */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 paper-card rounded-full px-2 py-1.5 shadow-2xl border border-[#E4E2DC] flex items-center gap-1.5 max-w-[95vw] overflow-x-auto backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowAddPage((v) => !v)}
          className="ios-press shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#0A5386] text-white rounded-full"
        >
          <StickyNote className="w-3.5 h-3.5" />
          Add Spec / Page
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

      {/* Floating Add Page Drawer */}
      {showAddPage && (
        <form
          onSubmit={handleAddPinnedPage}
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[min(420px,calc(100vw-2rem))] paper-card rounded-2xl p-4 space-y-2.5 shadow-2xl"
        >
          <div className="text-xs font-semibold text-[#18181B]">Pin a New Page / Note</div>
          <input
            type="text"
            required
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Page title (e.g. Hardware Wiring, API Spec)"
            className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
          />
          <textarea
            rows={3}
            value={pageBody}
            onChange={(e) => setPageBody(e.target.value)}
            placeholder="Write page content..."
            className="w-full px-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddPage(false)}
              className="px-3 py-1 text-xs text-[#52525B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 text-xs font-semibold bg-[#0A5386] text-white rounded-lg"
            >
              Pin to Board
            </button>
          </div>
        </form>
      )}

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
          {/* 1. Requirement Checkpoints Card */}
          <div
            style={{
              left: getPos('checkpoints').x,
              top: getPos('checkpoints').y,
            }}
            className="absolute w-[340px] paper-card rounded-2xl border-t-[3px] border-t-[#0A5386] shadow-[0_14px_34px_rgba(24,24,27,0.08),0_2px_6px_rgba(24,24,27,0.04)] overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('checkpoints', e)}
              className="px-4 py-3 border-b border-[#E4E2DC]/80 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0A5386] ring-2 ring-[#0A5386]/20 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#71717A]">
                    01 · Checklist
                  </div>
                  <div className="text-xs font-bold text-[#18181B]">
                    Requirements ({cpDone}/{checkpoints.length})
                  </div>
                </div>
              </div>
              <GripHorizontal className="w-4 h-4 text-[#A1A1AA]" />
            </div>

            <div className="p-4 space-y-3">
              <div className="max-h-52 overflow-y-auto space-y-1.5">
                {checkpoints.length === 0 ? (
                  <div className="text-[11px] text-[#71717A] py-4 text-center">
                    No requirement checkpoints yet.
                  </div>
                ) : (
                  checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-start justify-between gap-2 px-2.5 py-2 rounded-xl border border-[#E4E2DC]/70 bg-[#FAF9F6]/70"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCheckpoint(cp.id)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0"
                      >
                        {cp.done ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#0A5386] shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0 mt-0.5" />
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
                        onClick={() => handleRemoveCheckpoint(cp.id)}
                        className="text-[#A1A1AA] hover:text-[#DC2626] shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddCheckpoint} className="flex gap-1.5 pt-1 border-t border-[#E4E2DC]/60">
                <input
                  type="text"
                  value={newCp}
                  onChange={(e) => setNewCp(e.target.value)}
                  placeholder="Add requirement..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-transparent focus:outline-none placeholder:text-[#A1A1AA]"
                />
                <button
                  type="submit"
                  className="ios-press p-1.5 bg-[#0A5386] text-white rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* 2. Spec & Team Idea Page Card */}
          <div
            style={{ left: getPos('spec').x, top: getPos('spec').y }}
            className="absolute w-[340px] paper-card rounded-2xl border-t-[3px] border-t-[#254454] shadow-[0_14px_34px_rgba(24,24,27,0.08),0_2px_6px_rgba(24,24,27,0.04)] overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('spec', e)}
              className="px-4 py-3 border-b border-[#E4E2DC]/80 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#254454] ring-2 ring-[#254454]/20 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#71717A]">
                    02 · Spec Sheet
                  </div>
                  <div className="text-xs font-bold text-[#18181B]">Spec &amp; Team Idea</div>
                </div>
              </div>
              <GripHorizontal className="w-4 h-4 text-[#A1A1AA]" />
            </div>
            <div className="p-4">
              <textarea
                rows={9}
                value={project.teamIdea}
                onChange={(e) => updateProject(project.id, { teamIdea: e.target.value })}
                placeholder="Write architecture, hardware specs, and team approach..."
                className="w-full text-xs leading-relaxed bg-transparent focus:outline-none resize-y placeholder:text-[#A1A1AA]"
              />
            </div>
          </div>

          {/* 3. Workflow Steps Card */}
          <div
            style={{ left: getPos('workflow').x, top: getPos('workflow').y }}
            className="absolute w-[340px] paper-card rounded-2xl border-t-[3px] border-t-[#133F47] shadow-[0_14px_34px_rgba(24,24,27,0.08),0_2px_6px_rgba(24,24,27,0.04)] overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('workflow', e)}
              className="px-4 py-3 border-b border-[#E4E2DC]/80 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#133F47] ring-2 ring-[#133F47]/20 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#71717A]">
                    03 · Execution
                  </div>
                  <div className="text-xs font-bold text-[#18181B]">
                    Workflow ({steps.filter((s) => s.completed).length}/{steps.length})
                  </div>
                </div>
              </div>
              <GripHorizontal className="w-4 h-4 text-[#A1A1AA]" />
            </div>
            <div className="p-4 space-y-3">
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {steps.length === 0 ? (
                  <div className="text-[11px] text-[#71717A] py-3 text-center">
                    No workflow steps yet.
                  </div>
                ) : (
                  steps.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleWorkflowStep(s.id)}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl border border-[#E4E2DC]/70 bg-[#FAF9F6]/70 text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {s.completed ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#133F47] shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                        )}
                        <span
                          className={`text-xs truncate ${
                            s.completed ? 'line-through text-[#71717A]' : 'text-[#18181B]'
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-[#E4E2DC] shrink-0">
                        {s.assignee}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <form onSubmit={handleAddStep} className="grid grid-cols-12 gap-1.5 pt-1 border-t border-[#E4E2DC]/60">
                <input
                  type="text"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="Add workflow step..."
                  className="col-span-6 px-2 py-1.5 text-xs bg-transparent focus:outline-none placeholder:text-[#A1A1AA]"
                />
                <select
                  value={newStepAssignee}
                  onChange={(e) => setNewStepAssignee(e.target.value as MemberName)}
                  className="col-span-4 px-1.5 py-1.5 text-[11px] bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                >
                  {MEMBER_NAMES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="ios-press col-span-2 flex items-center justify-center bg-[#133F47] text-white rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* 4. Project Controls Card */}
          <div
            style={{ left: getPos('controls').x, top: getPos('controls').y }}
            className="absolute w-[340px] paper-card rounded-2xl border-t-[3px] border-t-[#3F3F46] shadow-[0_14px_34px_rgba(24,24,27,0.08),0_2px_6px_rgba(24,24,27,0.04)] overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('controls', e)}
              className="px-4 py-3 border-b border-[#E4E2DC]/80 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3F3F46] ring-2 ring-[#3F3F46]/20 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono-num uppercase tracking-wider text-[#71717A]">
                    04 · Brief
                  </div>
                  <div className="text-xs font-bold text-[#18181B]">Project Details</div>
                </div>
              </div>
              <GripHorizontal className="w-4 h-4 text-[#A1A1AA]" />
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">
                    Project
                  </div>
                  <input
                    type="text"
                    value={project.title}
                    onChange={(e) => updateProject(project.id, { title: e.target.value })}
                    placeholder="Project Name"
                    className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                  />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">
                    Client
                  </div>
                  <input
                    type="text"
                    value={project.clientName}
                    onChange={(e) => updateProject(project.id, { clientName: e.target.value })}
                    placeholder="Client Name"
                    className="w-full px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">
                    Status
                  </div>
                  <select
                    value={project.status}
                    onChange={(e) =>
                      updateProject(project.id, { status: e.target.value as ProjectStatus })
                    }
                    className="w-full px-2 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                  >
                    {(['Planning', 'Active', 'Review', 'Completed', 'Archived'] as ProjectStatus[]).map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">
                    Category
                  </div>
                  <select
                    value={project.category}
                    onChange={(e) =>
                      updateProject(project.id, { category: e.target.value as ProjectCategory })
                    }
                    className="w-full px-2 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                  >
                    {PROJECT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[#71717A] mb-1">
                    Deadline
                  </div>
                  <input
                    type="date"
                    value={project.deadline}
                    onChange={(e) => updateProject(project.id, { deadline: e.target.value })}
                    className="w-full px-1.5 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Pinned Design Inspo Images & Uploaded Documents (Borderless Floating Pins) */}
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

          {/* 6. Custom Pinned Pages (Borderless Floating Pages) */}
          {pinnedPages.map((note, idx) => {
            const cardId = `page_${note.id}`;
            const pos = getPos(cardId, projectDocs.length + idx);
            const raw = note.content.slice('[PIN_PAGE]'.length);
            const [heading, ...rest] = raw.split('\n');
            return (
              <div
                key={note.id}
                style={{ left: pos.x, top: pos.y }}
                onPointerDown={(e) => startDrag(cardId, e, projectDocs.length + idx)}
                className="group absolute w-[260px] cursor-grab active:cursor-grabbing select-none p-2"
              >
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => deleteProjectNote(note.id)}
                  title="Delete page"
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-[#18181B]/85 hover:bg-[#DC2626] text-white flex items-center justify-center shadow-md"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="text-sm font-bold text-[#18181B] leading-snug">
                  {heading || 'Pinned Page'}
                </div>
                <div className="mt-1.5 text-xs text-[#3F3F46] whitespace-pre-wrap leading-relaxed select-text">
                  {rest.join('\n') || 'Empty page'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
