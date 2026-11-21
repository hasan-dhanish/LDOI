import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CheckSquare,
  Download,
  FileText,
  IndianRupee,
  Plus,
  Send,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  MEMBER_NAMES,
  PROJECT_CATEGORIES,
  formatDateShort,
  formatInr,
  getDeadlineUrgency,
} from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type {
  DocType,
  ExpenseCategory,
  MemberName,
  ProjectCategory,
  ProjectStatus,
  QuotationDoc,
} from '../types';
import { QuotationBuilderModal } from './QuotationBuilderModal';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

type DetailTab = 'overview' | 'workflow' | 'notebook' | 'budget' | 'docs';

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
}) => {
  const {
    projects,
    workflowSteps,
    projectNotes,
    expenses,
    quotations,
    documents,
    liveTypingMap,
    currentUser,
    updateProject,
    deleteProject,
    addWorkflowStep,
    toggleWorkflowStep,
    deleteWorkflowStep,
    addProjectNote,
    addExpense,
    deleteExpense,
    deleteQuotation,
    uploadDocument,
    deleteDocument,
    broadcastTyping,
  } = useLdoi();

  const project = projects.find((p) => p.id === projectId);
  const [tab, setTab] = useState<DetailTab>('overview');

  // Workflow form
  const [stepTitle, setStepTitle] = useState('');
  const [stepAssignee, setStepAssignee] = useState<MemberName>(currentUser?.name ?? 'Hasan');
  const [stepDueDate, setStepDueDate] = useState('');

  // Discussion note
  const [noteInput, setNoteInput] = useState('');

  // Live Notebook local state + debounced save
  const [notebookDraft, setNotebookDraft] = useState(project?.liveNotebookText ?? '');
  const saveTimerRef = useRef<number | null>(null);

  // Expense form
  const [expLabel, setExpLabel] = useState('');
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Development');
  const [expAmount, setExpAmount] = useState('');
  const expDate = new Date().toISOString().slice(0, 10);

  // Docs & Quotations
  const [docType, setDocType] = useState<DocType>('Quotation');
  const [builderDoc, setBuilderDoc] = useState<Partial<QuotationDoc> | null>(null);

  const notebookKey = `project-notebook:${projectId}`;
  const incomingTyping = liveTypingMap[notebookKey];
  const lastNotebookEditRef = useRef<number>(0);
  const latestNotebookRef = useRef<string>(project?.liveNotebookText ?? '');

  useEffect(() => {
    const recentlyEdited = Date.now() - lastNotebookEditRef.current < 1800;
    if (
      project &&
      !recentlyEdited &&
      (!incomingTyping || incomingTyping.author === currentUser?.name)
    ) {
      setNotebookDraft(project.liveNotebookText);
      latestNotebookRef.current = project.liveNotebookText;
    }
  }, [project?.liveNotebookText, incomingTyping, currentUser?.name, project]);

  useEffect(() => {
    if (incomingTyping && incomingTyping.author !== currentUser?.name) {
      setNotebookDraft(incomingTyping.text);
      latestNotebookRef.current = incomingTyping.text;
    }
  }, [incomingTyping, currentUser?.name]);

  if (!project) {
    return (
      <div className="paper-card rounded-xl p-8 text-center">
        <p className="text-sm font-medium text-[#18181B]">Project not found</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-3 px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  const steps = workflowSteps
    .filter((s) => s.projectId === project.id)
    .sort((a, b) => a.stepOrder - b.stepOrder);
  const completedSteps = steps.filter((s) => s.completed).length;
  const progress = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  const notes = projectNotes.filter((n) => n.projectId === project.id);
  const projectExpenses = expenses.filter((e) => e.projectId === project.id);
  const totalCost = projectExpenses.reduce((sum, e) => sum + e.amountInr, 0);
  const expectedReturns = project.quotedAmountInr - totalCost;
  const marginPct =
    project.quotedAmountInr > 0
      ? Math.round((expectedReturns / project.quotedAmountInr) * 100)
      : 0;

  const projectQuotations = quotations.filter((q) => q.projectId === project.id);
  const projectDocs = documents.filter((d) => d.projectId === project.id);
  const urgency = getDeadlineUrgency(project.deadline);

  const handleNotebookChange = (val: string) => {
    lastNotebookEditRef.current = Date.now();
    latestNotebookRef.current = val;
    setNotebookDraft(val);
    broadcastTyping(notebookKey, val);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    const pid = project.id;
    saveTimerRef.current = window.setTimeout(() => {
      updateProject(pid, { liveNotebookText: latestNotebookRef.current });
    }, 350);
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepTitle.trim()) return;
    await addWorkflowStep({
      projectId: project.id,
      stepOrder: steps.length + 1,
      title: stepTitle.trim(),
      assignee: stepAssignee,
      dueDate: stepDueDate,
      completed: false,
    });
    setStepTitle('');
    setStepDueDate('');
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim()) return;
    await addProjectNote(project.id, noteInput.trim());
    setNoteInput('');
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expLabel.trim()) return;
    await addExpense({
      projectId: project.id,
      label: expLabel.trim(),
      category: expCategory,
      amountInr: Number(expAmount) || 0,
      date: expDate,
    });
    setExpLabel('');
    setExpAmount('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocument(file, { projectId: project.id, docType });
    e.target.value = '';
  };

  const handleEndProject = async () => {
    await updateProject(project.id, { status: 'Completed' });
  };

  const handleDeleteProject = async () => {
    if (window.confirm(`Delete "${project.title}" and all its tasks/notes?`)) {
      await deleteProject(project.id);
      onBack();
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#E4E2DC]">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 p-1.5 rounded-md bg-white border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-[#18181B]">{project.title}</h1>
              <span className="px-2 py-0.5 text-[11px] font-medium bg-white border border-[#E4E2DC] rounded">
                {project.category}
              </span>
              <span
                className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                  project.status === 'Active'
                    ? 'bg-[#0071E3] text-white'
                    : project.status === 'Completed'
                    ? 'bg-[#0F766E] text-white'
                    : 'bg-[#18181B] text-white'
                }`}
              >
                {project.status}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#52525B]">
              <span>Client: {project.clientName}</span>
              <span>|</span>
              <span className="font-mono-num">Quote: {formatInr(project.quotedAmountInr)}</span>
              <span>|</span>
              <span
                className={`font-mono-num ${
                  urgency.tone === 'overdue' ? 'text-[#DC2626] font-semibold' : ''
                }`}
              >
                Deadline: {project.deadline ? formatDateShort(project.deadline) : 'Not set'} ({urgency.label})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.status !== 'Completed' && (
            <button
              type="button"
              onClick={handleEndProject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0F766E] hover:bg-[#115E59] text-white rounded-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              End Project
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteProject}
            title="Delete Project"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#E4E2DC] hover:border-[#DC2626] text-xs font-medium text-[#71717A] hover:text-[#DC2626]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[#E4E2DC] pb-3">
        {(
          [
            { id: 'overview', label: 'Requirements & Idea' },
            { id: 'workflow', label: `Workflow (${completedSteps}/${steps.length})` },
            { id: 'notebook', label: 'Live Notebook & Discussion' },
            { id: 'budget', label: 'Budget (INR)' },
            { id: 'docs', label: `Quotations & Docs (${projectQuotations.length + projectDocs.length})` },
          ] as { id: DetailTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              tab === t.id
                ? 'bg-[#18181B] text-white border-[#18181B]'
                : 'bg-white text-[#52525B] border-[#E4E2DC] hover:text-[#18181B]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview & Requirements */}
      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="paper-card rounded-xl p-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#52525B] mb-2">
                Client Requirements
              </label>
              <textarea
                rows={6}
                value={project.requirements}
                onChange={(e) => updateProject(project.id, { requirements: e.target.value })}
                placeholder="Write down everything the client needs..."
                className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0071E3]"
              />
            </div>

            <div className="paper-card rounded-xl p-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#52525B] mb-2">
                Our Team Idea &amp; Solution Plan
              </label>
              <textarea
                rows={5}
                value={project.teamIdea}
                onChange={(e) => updateProject(project.id, { teamIdea: e.target.value })}
                placeholder="Architecture, tech stack, hardware notes, and approach..."
                className="w-full p-3 text-sm bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>

          <div className="paper-card rounded-xl p-5 space-y-4 h-fit">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#52525B]">
              Project Controls
            </h3>

            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Project Name</label>
              <input
                type="text"
                value={project.title}
                onChange={(e) => updateProject(project.id, { title: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Client Name</label>
              <input
                type="text"
                value={project.clientName}
                onChange={(e) => updateProject(project.id, { clientName: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Status</label>
              <select
                value={project.status}
                onChange={(e) => updateProject(project.id, { status: e.target.value as ProjectStatus })}
                className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
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
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Category</label>
              <select
                value={project.category}
                onChange={(e) =>
                  updateProject(project.id, { category: e.target.value as ProjectCategory })
                }
                className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              >
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                Target Deadline
              </label>
              <input
                type="date"
                value={project.deadline}
                onChange={(e) => updateProject(project.id, { deadline: e.target.value })}
                className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>

            <div className="pt-3 border-t border-[#E4E2DC] text-[11px] text-[#71717A] space-y-1">
              <div>Created by: {project.createdBy}</div>
              <div>Last updated: {formatDateShort(project.updatedAt)}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Step-by-step Workflow */}
      {tab === 'workflow' && (
        <div className="paper-card rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#18181B]">
                Step-by-Step Workflow Checklist
              </h2>
              <p className="text-xs text-[#71717A]">
                Assign each step and check boxes as work completes.
              </p>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold font-mono-num text-[#18181B]">
                {progress}%
              </span>
              <div className="w-32 h-1.5 bg-[#E4E2DC] rounded-xs mt-1 overflow-hidden">
                <div
                  className="h-full bg-[#0071E3] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <form
            onSubmit={handleAddStep}
            className="grid sm:grid-cols-12 gap-2 p-3 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
          >
            <input
              type="text"
              required
              value={stepTitle}
              onChange={(e) => setStepTitle(e.target.value)}
              placeholder={`Step ${steps.length + 1}: e.g. Design database schema & POS billing flow`}
              className="sm:col-span-6 px-3 py-2 text-xs bg-white border border-[#E4E2DC] rounded-md"
            />
            <select
              value={stepAssignee}
              onChange={(e) => setStepAssignee(e.target.value as MemberName)}
              className="sm:col-span-2 px-2.5 py-2 text-xs bg-white border border-[#E4E2DC] rounded-md"
            >
              {MEMBER_NAMES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={stepDueDate}
              onChange={(e) => setStepDueDate(e.target.value)}
              className="sm:col-span-2 px-2.5 py-2 text-xs bg-white border border-[#E4E2DC] rounded-md"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md"
            >
              <Plus className="w-3.5 h-3.5" /> Add Step
            </button>
          </form>

          {steps.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71717A]">
              No workflow steps yet. Add Step 1 above to start tracking execution.
            </div>
          ) : (
            <div className="divide-y divide-[#E4E2DC] border border-[#E4E2DC] rounded-lg overflow-hidden">
              {steps.map((step, idx) => {
                const urg = getDeadlineUrgency(step.dueDate);
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      step.completed ? 'bg-[#FAF9F6]' : 'bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleWorkflowStep(step.id)}
                      className="flex items-center gap-3 text-left min-w-0 flex-1"
                    >
                      {step.completed ? (
                        <CheckSquare className="w-4 h-4 text-[#0F766E] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#71717A] shrink-0" />
                      )}
                      <span className="text-[11px] font-mono-num text-[#71717A] w-6 shrink-0">
                        #{idx + 1}
                      </span>
                      <span
                        className={`text-xs font-medium truncate ${
                          step.completed ? 'line-through text-[#71717A]' : 'text-[#18181B]'
                        }`}
                      >
                        {step.title}
                      </span>
                    </button>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 text-[11px] font-medium bg-[#FAF9F6] border border-[#E4E2DC] rounded">
                        {step.assignee}
                      </span>
                      {step.dueDate && (
                        <span
                          className={`text-[11px] font-mono-num ${
                            !step.completed && urg.tone === 'overdue'
                              ? 'text-[#DC2626] font-semibold'
                              : 'text-[#71717A]'
                          }`}
                        >
                          {formatDateShort(step.dueDate)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteWorkflowStep(step.id)}
                        className="text-[#71717A] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Live Notebook & Discussion (2-page Paper & Ink spread) */}
      {tab === 'notebook' && (
        <div className="paper-card rounded-xl overflow-hidden grid lg:grid-cols-2 border border-[#E4E2DC]">
          {/* Left Page: Real-time Shared Ruled Notebook */}
          <div className="p-6 border-b lg:border-b-0 lg:border-r border-[#E4E2DC] bg-[#FCFBF8] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">
                  Live Shared Notebook
                </h3>
                <p className="text-[11px] text-[#71717A]">
                  All 4 members see keystrokes here in real time while typing.
                </p>
              </div>
              {incomingTyping && incomingTyping.author !== currentUser?.name && (
                <span className="px-2 py-1 text-[11px] font-medium bg-[#0071E3]/10 text-[#0071E3] border border-[#0071E3]/25 rounded">
                  {incomingTyping.author} is typing...
                </span>
              )}
            </div>

            <textarea
              rows={13}
              value={notebookDraft}
              onChange={(e) => handleNotebookChange(e.target.value)}
              placeholder="Start typing meeting notes, architecture decisions, or live ideas..."
              className="w-full flex-1 p-3 text-sm text-[#18181B] ruled-paper border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0071E3] resize-none"
            />
          </div>

          {/* Right Page: Chronological Discussion Log */}
          <div className="p-6 bg-white flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[#18181B] mb-1">
                Project Discussion Log
              </h3>
              <p className="text-[11px] text-[#71717A] mb-4">
                Timestamped updates, blockers, and decisions.
              </p>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {notes.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#71717A] border border-dashed border-[#E4E2DC] rounded-lg">
                    No discussion notes yet.
                  </div>
                ) : (
                  notes.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-lg border border-[#E4E2DC] bg-[#FAF9F6]"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#18181B]">{n.author}</span>
                        <span className="font-mono-num text-[#71717A]">
                          {new Date(n.createdAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-[#18181B] whitespace-pre-wrap leading-relaxed">
                        {n.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <form onSubmit={handleAddNote} className="mt-4 pt-3 border-t border-[#E4E2DC] flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Post a note to the project log..."
                className="flex-1 px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md focus:outline-none focus:border-[#0071E3]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md"
              >
                <Send className="w-3.5 h-3.5" />
                Post
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: Budget (INR) */}
      {tab === 'budget' && (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="paper-card rounded-xl p-4">
              <label className="block text-[11px] font-medium text-[#71717A]">
                Quotation Amount (INR)
              </label>
              <div className="mt-1.5 flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-[#52525B]" />
                <input
                  type="number"
                  min={0}
                  value={project.quotedAmountInr}
                  onChange={(e) =>
                    updateProject(project.id, { quotedAmountInr: Number(e.target.value) || 0 })
                  }
                  className="w-full text-lg font-semibold font-mono-num text-[#18181B] bg-[#FAF9F6] border border-[#E4E2DC] rounded-md px-2.5 py-1"
                />
              </div>
            </div>

            <div className="paper-card rounded-xl p-4">
              <div className="text-[11px] font-medium text-[#71717A]">
                Actual Cost of Making
              </div>
              <div className="mt-2 text-xl font-semibold font-mono-num text-[#18181B]">
                {formatInr(totalCost)}
              </div>
              <div className="text-[11px] text-[#71717A] mt-0.5">
                Across {projectExpenses.length} logged expense(s)
              </div>
            </div>

            <div className="paper-card rounded-xl p-4">
              <div className="text-[11px] font-medium text-[#71717A]">
                Expected Returns (Net Profit)
              </div>
              <div
                className={`mt-2 text-xl font-semibold font-mono-num ${
                  expectedReturns >= 0 ? 'text-[#0F766E]' : 'text-[#DC2626]'
                }`}
              >
                {formatInr(expectedReturns)}
              </div>
              <div className="text-[11px] font-mono-num text-[#71717A] mt-0.5">
                Margin: {marginPct}%
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 paper-card rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[#18181B]">
                Cost &amp; Expense Ledger
              </h3>

              <form
                onSubmit={handleAddExpense}
                className="grid sm:grid-cols-12 gap-2 p-3 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
              >
                <input
                  type="text"
                  required
                  value={expLabel}
                  onChange={(e) => setExpLabel(e.target.value)}
                  placeholder="Expense item (e.g. Thermal printer, Cloud server)"
                  className="sm:col-span-5 px-2.5 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md"
                />
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="sm:col-span-3 px-2 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md"
                >
                  {(['Development', 'Infrastructure', 'Hardware', 'Operations', 'Other'] as ExpenseCategory[]).map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
                <input
                  type="number"
                  required
                  min={0}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="INR"
                  className="sm:col-span-2 px-2 py-1.5 text-xs font-mono-num bg-white border border-[#E4E2DC] rounded-md"
                />
                <button
                  type="submit"
                  className="sm:col-span-2 px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
                >
                  Add
                </button>
              </form>

              {projectExpenses.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#71717A]">
                  No expenses logged yet.
                </div>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E4E2DC] text-left text-[#71717A]">
                      <th className="py-2 font-medium">Item</th>
                      <th className="py-2 font-medium">Category</th>
                      <th className="py-2 font-medium">By</th>
                      <th className="py-2 font-medium text-right">Amount</th>
                      <th className="py-2 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E2DC]">
                    {projectExpenses.map((ex) => (
                      <tr key={ex.id}>
                        <td className="py-2.5 font-medium text-[#18181B]">{ex.label}</td>
                        <td className="py-2.5 text-[#52525B]">{ex.category}</td>
                        <td className="py-2.5 text-[#52525B]">{ex.addedBy}</td>
                        <td className="py-2.5 text-right font-mono-num font-medium">
                          {formatInr(ex.amountInr)}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => deleteExpense(ex.id)}
                            className="text-[#71717A] hover:text-[#DC2626]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="paper-card rounded-xl p-5">
              <label className="block text-xs font-semibold text-[#18181B] mb-2">
                Budget Discussion Notes
              </label>
              <textarea
                rows={9}
                value={project.budgetNotes}
                onChange={(e) => updateProject(project.id, { budgetNotes: e.target.value })}
                placeholder="Notes on pricing, hardware vendor quotes, payment milestones..."
                className="w-full p-3 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg focus:outline-none focus:border-[#0071E3]"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Quotations & Docs */}
      {tab === 'docs' && (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* In-app Quotations & Proposals */}
          <div className="paper-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">
                  In-App Quotations &amp; Proposals
                </h3>
                <p className="text-[11px] text-[#71717A]">
                  Create INR quotations and export clean PDFs.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setBuilderDoc({
                    projectId: project.id,
                    clientName: project.clientName,
                    title: `${project.title} Quotation`,
                    type: 'Quotation',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0071E3] text-white rounded-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Create INR Quote
              </button>
            </div>

            {projectQuotations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A] border border-dashed border-[#E4E2DC] rounded-lg">
                No quotations created for this project yet.
              </div>
            ) : (
              <div className="space-y-2">
                {projectQuotations.map((q) => {
                  const sub = q.items.reduce((s, i) => s + i.qty * i.unitPriceInr, 0);
                  const total = sub + Math.round((sub * q.taxPercent) / 100);
                  return (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E4E2DC] bg-[#FAF9F6]"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#18181B]">{q.title}</div>
                        <div className="text-[11px] font-mono-num text-[#71717A]">
                          {q.type} · {q.number} · {formatInr(total)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBuilderDoc(q)}
                          className="px-2.5 py-1 text-[11px] font-medium bg-white border border-[#E4E2DC] rounded"
                        >
                          Open / Print
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteQuotation(q.id)}
                          className="text-[#71717A] hover:text-[#DC2626]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* File Uploads */}
          <div className="paper-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[#18181B]">
                  Uploaded Files &amp; Proposals
                </h3>
                <p className="text-[11px] text-[#71717A]">
                  Attach PDFs, Word docs, spreadsheets, or specs.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocType)}
                  className="px-2 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                >
                  {(['Quotation', 'Proposal', 'Contract', 'Spec', 'Other'] as DocType[]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
            </div>

            {projectDocs.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#71717A] border border-dashed border-[#E4E2DC] rounded-lg">
                No files uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {projectDocs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-[#E4E2DC] bg-[#FAF9F6]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#0071E3] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-[#18181B] truncate">
                          {d.name}
                        </div>
                        <div className="text-[11px] text-[#71717A]">
                          {d.docType} · Uploaded by {d.uploadedBy}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={d.url}
                        download={d.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-white border border-[#E4E2DC] rounded text-[#18181B] hover:border-[#0071E3]"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => deleteDocument(d.id)}
                        className="text-[#71717A] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {builderDoc && (
        <QuotationBuilderModal
          initial={builderDoc}
          onClose={() => setBuilderDoc(null)}
        />
      )}
    </div>
  );
};
