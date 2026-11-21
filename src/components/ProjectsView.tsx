import React, { useState } from 'react';
import { FolderPlus, Search, X } from 'lucide-react';
import { PROJECT_CATEGORIES } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { ProjectCategory, ProjectStatus } from '../types';
import { FolderCard } from './FolderCard';

interface ProjectsViewProps {
  onOpenProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenProject }) => {
  const { projects, workflowSteps, documents, quotations, createProject } = useLdoi();
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('ERP');
  const [deadline, setDeadline] = useState('');
  const [quotedAmountInr, setQuotedAmountInr] = useState('');
  const [requirements, setRequirements] = useState('');
  const [teamIdea, setTeamIdea] = useState('');

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setShowCreate(false);
    setTitle('');
    setClientName('');
    setRequirements('');
    setTeamIdea('');
    setDeadline('');
    setQuotedAmountInr('');
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
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md shrink-0"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Project Folder
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
                  ? 'bg-[#18181B] text-white border-[#18181B]'
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
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md focus:outline-none focus:border-[#0071E3]"
          />
        </div>
      </div>

      {/* Folder Grid */}
      {filtered.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-[#18181B]">No matching project folders</p>
          <p className="mt-1 text-xs text-[#71717A]">
            Create a new project folder to define client requirements, workflow steps, and budget.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

      {/* Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-[#E4E2DC] rounded-xl w-full max-w-xl shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#FAF9F6] border-b border-[#E4E2DC] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#18181B]">Start New Project</h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-[#71717A] hover:text-[#18181B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Project Name
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Apex Textile ERP"
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Client or business name"
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    System Type
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProjectCategory)}
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
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Quotation (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={quotedAmountInr}
                    onChange={(e) => setQuotedAmountInr(e.target.value)}
                    placeholder="0"
                    className="w-full px-2.5 py-2 text-xs font-mono-num bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                  Client Requirements
                </label>
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="List everything the client needs..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                  Our Team Idea &amp; Approach
                </label>
                <textarea
                  rows={3}
                  value={teamIdea}
                  onChange={(e) => setTeamIdea(e.target.value)}
                  placeholder="How we plan to architect and deliver this..."
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E4E2DC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#52525B]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
