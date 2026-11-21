import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FolderPlus, Plus, Search, Trash2, X } from 'lucide-react';
import { MEMBER_NAMES, PROJECT_CATEGORIES } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { MemberName, ProjectCategory, ProjectStatus } from '../types';
import { FolderCard } from './FolderCard';

interface ProjectsViewProps {
  onOpenProject: (projectId: string) => void;
}

interface DraftStep {
  id: string;
  title: string;
  assignee: MemberName;
  dueDate: string;
}

const STANDARD_STEPS: Omit<DraftStep, 'id'>[] = [
  { title: '1. Finalize Client Requirements & Scope', assignee: 'Hasan', dueDate: '' },
  { title: '2. System Architecture & Database Design', assignee: 'Aathavan', dueDate: '' },
  { title: '3. Core Build & Integration', assignee: 'Allen', dueDate: '' },
  { title: '4. Testing, QA & Client Demo', assignee: 'Harsath', dueDate: '' },
  { title: '5. Final Deployment & Handover', assignee: 'Hasan', dueDate: '' },
];

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenProject }) => {
  const { projects, workflowSteps, documents, quotations, createProject, addWorkflowStep } =
    useLdoi();
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // 3-Step Guided Wizard State
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('ERP');
  const [deadline, setDeadline] = useState('');
  const [quotedAmountInr, setQuotedAmountInr] = useState('');
  const [requirements, setRequirements] = useState('');
  const [teamIdea, setTeamIdea] = useState('');
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepAssignee, setNewStepAssignee] = useState<MemberName>('Hasan');
  const [newStepDueDate, setNewStepDueDate] = useState('');

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const resetWizard = () => {
    setWizardStep(1);
    setTitle('');
    setClientName('');
    setCategory('ERP');
    setDeadline('');
    setQuotedAmountInr('');
    setRequirements('');
    setTeamIdea('');
    setDraftSteps([]);
    setNewStepTitle('');
    setNewStepDueDate('');
  };

  const handleAddDraftStep = () => {
    if (!newStepTitle.trim()) return;
    setDraftSteps((prev) => [
      ...prev,
      {
        id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: newStepTitle.trim(),
        assignee: newStepAssignee,
        dueDate: newStepDueDate,
      },
    ]);
    setNewStepTitle('');
    setNewStepDueDate('');
  };

  const handleLoadTemplate = () => {
    setDraftSteps(
      STANDARD_STEPS.map((s, i) => ({
        ...s,
        id: `tpl_${Date.now()}_${i}`,
      }))
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) {
      setWizardStep(1);
      return;
    }
    const created = await createProject({
      title: title.trim(),
      clientName: clientName.trim(),
      category,
      status: 'Planning',
      requirements: requirements.trim(),
      teamIdea: teamIdea.trim(),
      deadline,
      quotedAmountInr: Number(quotedAmountInr) || 0,
      budgetNotes: '',
    });

    for (let i = 0; i < draftSteps.length; i++) {
      const s = draftSteps[i];
      await addWorkflowStep({
        projectId: created.id,
        stepOrder: i + 1,
        title: s.title,
        assignee: s.assignee,
        dueDate: s.dueDate,
        completed: false,
      });
    }

    setShowCreate(false);
    resetWizard();
    onOpenProject(created.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E2DC]">
        <div>
          <h1 className="text-xl font-semibold text-[#18181B]">Projects</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Requirements, team approach, step-by-step workflow, INR budgets, and project discussions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetWizard();
            setShowCreate(true);
          }}
          className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="flex flex-wrap gap-1.5">
          {(['All', 'Planning', 'Active', 'Review', 'Completed', 'Archived'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                statusFilter === st
                  ? 'bg-[#0A5386] text-white border-[#0A5386]'
                  : 'bg-white text-[#52525B] border-[#E4E2DC] hover:text-[#18181B]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects or clients..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md focus:outline-none focus:border-[#0A5386]"
          />
        </div>
      </div>

      {/* Compact Folder Grid */}
      {filtered.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-[#18181B]">No matching project folders</p>
          <p className="mt-1 text-xs text-[#71717A]">
            Click &ldquo;New Project&rdquo; to set up client requirements, your team idea, and workflow steps.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {filtered.map((p) => {
            const steps = workflowSteps.filter((s) => s.projectId === p.id);
            const done = steps.filter((s) => s.completed).length;
            const docCount =
              documents.filter((d) => d.projectId === p.id).length +
              quotations.filter((q) => q.projectId === p.id).length;
            const assignees = Array.from(new Set(steps.map((s) => s.assignee)));
            return (
              <FolderCard
                key={p.id}
                project={p}
                taskCount={steps.length}
                completedCount={done}
                docCount={docCount}
                assignees={assignees}
                onClick={() => onOpenProject(p.id)}
              />
            );
          })}
        </div>
      )}

      {/* Guided 3-Step New Project Wizard */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-[#E4E2DC] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
          >
            {/* Wizard Header + Step Indicator */}
            <div className="px-5 py-4 bg-[#FAF9F6] border-b border-[#E4E2DC] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#18181B]">Start New Project</h3>
                  <p className="text-[11px] text-[#71717A]">
                    Step {wizardStep} of 3
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="text-[#71717A] hover:text-[#18181B]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { num: 1 as const, label: '1. Client & Basics' },
                  { num: 2 as const, label: '2. Needs & Idea' },
                  { num: 3 as const, label: '3. Workflow & Assign' },
                ].map((s) => (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => setWizardStep(s.num)}
                    className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border text-center transition-colors ${
                      wizardStep === s.num
                        ? 'bg-[#0A5386] text-white border-[#0A5386]'
                        : wizardStep > s.num
                        ? 'bg-[#133F47]/15 text-[#133F47] border-[#133F47]/30'
                        : 'bg-white text-[#71717A] border-[#E4E2DC]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step Body */}
            <div className="p-5 min-h-[290px]">
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Apex Retail POS"
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Client or business name"
                        className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                        System Type
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                        className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                      >
                        {PROJECT_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                        Target Deadline
                      </label>
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                        Quotation (INR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={quotedAmountInr}
                        onChange={(e) => setQuotedAmountInr(e.target.value)}
                        placeholder="50000"
                        className="w-full px-2.5 py-2 text-xs font-mono-num bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                      1. Client Requirements (What the client needs)
                    </label>
                    <textarea
                      rows={4}
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      placeholder="List every feature, module, or hardware integration the client asked for..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#52525B] mb-1">
                      2. Our Team Idea &amp; Approach (How we will build it)
                    </label>
                    <textarea
                      rows={4}
                      value={teamIdea}
                      onChange={(e) => setTeamIdea(e.target.value)}
                      placeholder="Tech stack, architecture, pricing idea, or hardware notes..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                    />
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#18181B]">
                      Step-by-Step Workflow &amp; Assignments
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadTemplate}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-[#254454] text-white rounded-md hover:opacity-90"
                    >
                      Load 5-Step Template
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-2 p-2.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg">
                    <input
                      type="text"
                      value={newStepTitle}
                      onChange={(e) => setNewStepTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddDraftStep();
                        }
                      }}
                      placeholder={`Step ${draftSteps.length + 1}: e.g. Build billing API`}
                      className="col-span-6 px-2.5 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md"
                    />
                    <select
                      value={newStepAssignee}
                      onChange={(e) => setNewStepAssignee(e.target.value as MemberName)}
                      className="col-span-3 px-2 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md"
                    >
                      {MEMBER_NAMES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddDraftStep}
                      className="col-span-3 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-semibold bg-[#0A5386] text-white rounded-md"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5">
                    {draftSteps.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[#71717A] border border-dashed border-[#E4E2DC] rounded-lg">
                        Add steps above or click &ldquo;Load 5-Step Template&rdquo; (you can also add steps later).
                      </div>
                    ) : (
                      draftSteps.map((s, idx) => (
                        <div
                          key={s.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                        >
                          <span className="truncate font-medium text-[#18181B]">
                            #{idx + 1} {s.title}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={s.assignee}
                              onChange={(e) =>
                                setDraftSteps((prev) =>
                                  prev.map((item) =>
                                    item.id === s.id
                                      ? { ...item, assignee: e.target.value as MemberName }
                                      : item
                                  )
                                )
                              }
                              className="px-1.5 py-0.5 text-[11px] bg-white border border-[#E4E2DC] rounded"
                            >
                              {MEMBER_NAMES.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                setDraftSteps((prev) => prev.filter((item) => item.id !== s.id))
                              }
                              className="text-[#71717A] hover:text-[#DC2626]"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Wizard Footer */}
            <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E4E2DC] flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  wizardStep > 1 ? setWizardStep((s) => (s - 1) as 1 | 2 | 3) : setShowCreate(false)
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#52525B] hover:text-[#18181B]"
              >
                {wizardStep > 1 ? (
                  <>
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </>
                ) : (
                  'Cancel'
                )}
              </button>

              {wizardStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (wizardStep === 1 && (!title.trim() || !clientName.trim())) return;
                    setWizardStep((s) => (s + 1) as 1 | 2 | 3);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#133F47] hover:bg-[#19515B] text-white rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" /> Launch Project
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
