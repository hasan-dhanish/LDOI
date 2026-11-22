import React, { useState } from 'react';
import { FolderPlus, Search, X } from 'lucide-react';
import { useLdoi } from '../context/LdoiContext';
import type { ProjectStatus } from '../types';
import { FolderCard } from './FolderCard';

interface ProjectsViewProps {
  onOpenProject: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onOpenProject }) => {
  const { projects, workflowSteps, documents, quotations, createProject } = useLdoi();
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [deadline, setDeadline] = useState('');

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
    if (!title.trim() || !clientName.trim()) return;
    const created = await createProject({
      title: title.trim(),
      clientName: clientName.trim(),
      category: 'Other',
      status: 'Active',
      requirements: '',
      teamIdea: '',
      deadline,
      quotedAmountInr: 0,
      budgetNotes: '',
    });

    setTitle('');
    setClientName('');
    setDeadline('');
    setShowCreate(false);
    onOpenProject(created.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-semibold text-[#18181B]">Projects</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Create a project folder and pin pages, checklists, design inspo, and files onto its infinite board.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTitle('');
            setClientName('');
            setDeadline('');
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
          {(['All', 'Planning', 'Active', 'Review', 'Completed', 'Archived'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${statusFilter === s
                ? 'bg-[#18181B] text-white border-[#18181B]'
                : 'bg-white text-[#52525B] border-[#E4E2DC] hover:border-[#A1A1AA]'
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E4E2DC] rounded-md"
          />
        </div>
      </div>

      {/* Folder Grid */}
      {filtered.length === 0 ? (
        <div className="paper-card rounded-xl p-12 text-center">
          <p className="text-sm font-medium text-[#18181B]">No project folders yet</p>
          <p className="text-xs text-[#71717A] mt-1">
            Click &ldquo;New Project&rdquo; with just a project name and client name to open a blank infinite board.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* Quick 2-Field Create Project Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md paper-card rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-4 border-b border-[#E4E2DC] flex items-center justify-between">
              <div className="text-sm font-semibold text-[#18181B]">New Project Folder</div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1 text-[#71717A] hover:text-[#18181B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. School ERP Portal"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. St. Xavier High School"
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#52525B] mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#E4E2DC] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#52525B] hover:text-[#18181B]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ios-press px-4 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-lg"
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
