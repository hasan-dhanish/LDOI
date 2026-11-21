import React, { useRef, useState } from 'react';
import {
  CheckSquare,
  Download,
  FileSpreadsheet,
  FileText,
  GripHorizontal,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
  Upload,
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
  checkpoints: { x: 24, y: 24 },
  spec: { x: 380, y: 24 },
  workflow: { x: 736, y: 24 },
  controls: { x: 24, y: 360 },
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
    uploadDocument,
    deleteDocument,
  } = useLdoi();

  const [positions, setPositions] = useState<BoardPositions>(() =>
    loadBoardPositions(project.id)
  );
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
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const nx = Math.max(12, Math.round(dragRef.current.origX + dx));
      const ny = Math.max(12, Math.round(dragRef.current.origY + dy));
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
  };

  const cpDone = checkpoints.filter((c) => c.done).length;

  return (
    <div className="space-y-3">
      {/* Pinboard Matrix Toolbar */}
      <div className="paper-card rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAddPage((v) => !v)}
            className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0A5386] text-white rounded-lg"
          >
            <StickyNote className="w-3.5 h-3.5" />
            Add Spec / Page
          </button>

          <label className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#254454] text-white rounded-lg cursor-pointer">
            <ImageIcon className="w-3.5 h-3.5" />
            Pin Design Inspo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleUploadInspoOrFile(e, 'Spec')}
            />
          </label>

          <label className="ios-press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#E4E2DC] text-[#18181B] rounded-lg cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Pin File (PDF / Excel / Doc)
            <input
              type="file"
              className="hidden"
              onChange={(e) => handleUploadInspoOrFile(e, 'Other')}
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[#71717A] hidden sm:inline">
            Drag any card header to arrange on the matrix
          </span>
          <button
            type="button"
            onClick={handleResetLayout}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-white border border-[#E4E2DC] rounded-lg text-[#52525B] hover:text-[#18181B]"
          >
            <RotateCcw className="w-3 h-3" /> Reset Layout
          </button>
        </div>
      </div>

      {/* Inline Add Page Drawer */}
      {showAddPage && (
        <form
          onSubmit={handleAddPinnedPage}
          className="paper-card rounded-xl p-4 space-y-2.5 max-w-lg"
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

      {/* Open Pannable Matrix Canvas */}
      <div className="paper-card rounded-2xl overflow-auto h-[680px] relative">
        <div
          className="relative min-w-[1200px] min-h-[960px]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(140, 128, 110, 0.25) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* 1. Requirement Checkpoints Card */}
          <div
            style={{
              left: getPos('checkpoints').x,
              top: getPos('checkpoints').y,
            }}
            className="absolute w-[332px] paper-card rounded-xl shadow-lg overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('checkpoints', e)}
              className="px-3.5 py-2.5 bg-[#0A5386] text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <span className="text-xs font-bold">
                Requirements ({cpDone}/{checkpoints.length})
              </span>
              <GripHorizontal className="w-4 h-4 opacity-75" />
            </div>

            <div className="p-3.5 space-y-2.5">
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {checkpoints.length === 0 ? (
                  <div className="text-[11px] text-[#71717A] py-3 text-center">
                    No requirement checkpoints yet.
                  </div>
                ) : (
                  checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-lg border border-[#E4E2DC] bg-[#FAF9F6]"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCheckpoint(cp.id)}
                        className="flex items-start gap-2 text-left flex-1 min-w-0"
                      >
                        {cp.done ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#133F47] shrink-0 mt-0.5" />
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
                        onClick={() => handleRemoveCheckpoint(cp.id)}
                        className="text-[#71717A] hover:text-[#DC2626] shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddCheckpoint} className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={newCp}
                  onChange={(e) => setNewCp(e.target.value)}
                  placeholder="Add requirement checkpoint..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 text-xs font-semibold bg-[#0A5386] text-white rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* 2. Spec & Team Idea Page Card */}
          <div
            style={{ left: getPos('spec').x, top: getPos('spec').y }}
            className="absolute w-[332px] paper-card rounded-xl shadow-lg overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('spec', e)}
              className="px-3.5 py-2.5 bg-[#254454] text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <span className="text-xs font-bold">Spec &amp; Team Idea</span>
              <GripHorizontal className="w-4 h-4 opacity-75" />
            </div>
            <div className="p-3.5">
              <textarea
                rows={9}
                value={project.teamIdea}
                onChange={(e) => updateProject(project.id, { teamIdea: e.target.value })}
                placeholder="Write architecture, hardware specs, and team approach..."
                className="w-full p-2.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg resize-y"
              />
            </div>
          </div>

          {/* 3. Workflow Steps Card */}
          <div
            style={{ left: getPos('workflow').x, top: getPos('workflow').y }}
            className="absolute w-[332px] paper-card rounded-xl shadow-lg overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('workflow', e)}
              className="px-3.5 py-2.5 bg-[#133F47] text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <span className="text-xs font-bold">
                Workflow ({steps.filter((s) => s.completed).length}/{steps.length})
              </span>
              <GripHorizontal className="w-4 h-4 opacity-75" />
            </div>
            <div className="p-3.5 space-y-2.5">
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {steps.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleWorkflowStep(s.id)}
                    className="w-full flex items-center justify-between gap-2 p-2 rounded-lg border border-[#E4E2DC] bg-[#FAF9F6] text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {s.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#133F47] shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          s.completed ? 'line-through text-[#71717A]' : 'text-[#18181B]'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white border border-[#E4E2DC] shrink-0">
                      {s.assignee}
                    </span>
                  </button>
                ))}
              </div>
              <form onSubmit={handleAddStep} className="grid grid-cols-12 gap-1.5">
                <input
                  type="text"
                  value={newStep}
                  onChange={(e) => setNewStep(e.target.value)}
                  placeholder="Add workflow step..."
                  className="col-span-6 px-2 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
                <select
                  value={newStepAssignee}
                  onChange={(e) => setNewStepAssignee(e.target.value as MemberName)}
                  className="col-span-4 px-1.5 py-1.5 text-[11px] bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                >
                  {MEMBER_NAMES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="col-span-2 flex items-center justify-center bg-[#133F47] text-white rounded-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* 4. Project Controls Card */}
          <div
            style={{ left: getPos('controls').x, top: getPos('controls').y }}
            className="absolute w-[332px] paper-card rounded-xl shadow-lg overflow-hidden"
          >
            <div
              onPointerDown={(e) => startDrag('controls', e)}
              className="px-3.5 py-2.5 bg-[#2F333C] text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
            >
              <span className="text-xs font-bold">Project Details</span>
              <GripHorizontal className="w-4 h-4 opacity-75" />
            </div>
            <div className="p-3.5 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={project.title}
                  onChange={(e) => updateProject(project.id, { title: e.target.value })}
                  placeholder="Project Name"
                  className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
                <input
                  type="text"
                  value={project.clientName}
                  onChange={(e) => updateProject(project.id, { clientName: e.target.value })}
                  placeholder="Client Name"
                  className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={project.status}
                  onChange={(e) =>
                    updateProject(project.id, { status: e.target.value as ProjectStatus })
                  }
                  className="px-2 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                >
                  {(['Planning', 'Active', 'Review', 'Completed', 'Archived'] as ProjectStatus[]).map(
                    (s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    )
                  )}
                </select>
                <select
                  value={project.category}
                  onChange={(e) =>
                    updateProject(project.id, { category: e.target.value as ProjectCategory })
                  }
                  className="px-2 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                >
                  {PROJECT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={project.deadline}
                  onChange={(e) => updateProject(project.id, { deadline: e.target.value })}
                  className="px-1.5 py-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
              </div>
            </div>
          </div>

          {/* 5. Pinned Design Inspo Images & Uploaded Documents (PDF / Excel / Word) */}
          {projectDocs.map((doc, idx) => {
            const cardId = `doc_${doc.id}`;
            const pos = getPos(cardId, idx);
            const isImage = doc.mimeType.startsWith('image/');
            const badge = getFileBadge(doc.name);
            return (
              <div
                key={doc.id}
                style={{ left: pos.x, top: pos.y }}
                className="absolute w-[280px] paper-card rounded-xl shadow-lg overflow-hidden"
              >
                <div
                  onPointerDown={(e) => startDrag(cardId, e, idx)}
                  className="px-3 py-2 bg-[#1F242D] text-white flex items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none"
                >
                  <span className="text-[11px] font-semibold truncate">
                    {isImage ? 'Design Inspo' : badge} · {doc.name}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => deleteDocument(doc.id)}
                      className="text-zinc-400 hover:text-[#FCA5A5]"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    <GripHorizontal className="w-3.5 h-3.5 opacity-70" />
                  </div>
                </div>

                {isImage ? (
                  <div className="p-2 bg-[#FAF9F6]">
                    <img
                      src={doc.url}
                      alt={doc.name}
                      className="w-full h-40 object-cover rounded-lg border border-[#E4E2DC]"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {badge === 'SHEET' ? (
                        <FileSpreadsheet className="w-6 h-6 text-[#133F47] shrink-0" />
                      ) : (
                        <FileText className="w-6 h-6 text-[#0A5386] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#18181B] truncate">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-[#71717A]">
                          {doc.docType} · {doc.uploadedBy}
                        </div>
                      </div>
                    </div>
                    <a
                      href={doc.url}
                      download={doc.name}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-md text-[#18181B] hover:border-[#0A5386]"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            );
          })}

          {/* 6. Custom Pinned Pages / Spec Notes */}
          {pinnedPages.map((note, idx) => {
            const cardId = `page_${note.id}`;
            const pos = getPos(cardId, projectDocs.length + idx);
            const raw = note.content.slice('[PIN_PAGE]'.length);
            const [heading, ...rest] = raw.split('\n');
            return (
              <div
                key={note.id}
                style={{ left: pos.x, top: pos.y }}
                className="absolute w-[300px] paper-card rounded-xl shadow-lg overflow-hidden"
              >
                <div
                  onPointerDown={(e) => startDrag(cardId, e, projectDocs.length + idx)}
                  className="px-3.5 py-2 bg-[#8B1E1E] text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
                >
                  <span className="text-xs font-bold truncate">{heading || 'Pinned Page'}</span>
                  <GripHorizontal className="w-4 h-4 opacity-75 shrink-0" />
                </div>
                <div className="p-3.5 text-xs text-[#18181B] whitespace-pre-wrap leading-relaxed max-h-52 overflow-y-auto">
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
