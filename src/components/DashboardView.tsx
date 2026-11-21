import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CheckSquare,
  FolderPlus,
  Inbox,
  IndianRupee,
  Square,
} from 'lucide-react';
import { formatDateShort, formatInr, getDeadlineUrgency } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { ActiveTab } from '../types';
import { FolderCard } from './FolderCard';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenProject: (projectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenProject,
}) => {
  const {
    currentUser,
    projects,
    workflowSteps,
    enquiries,
    journalEntries,
    documents,
    quotations,
    toggleWorkflowStep,
  } = useLdoi();

  const myName = currentUser?.name ?? 'Hasan';
  const myPendingTasks = workflowSteps
    .filter((s) => s.assignee === myName && !s.completed)
    .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'));

  const activeProjects = projects.filter((p) => p.status !== 'Archived' && p.status !== 'Completed');
  const openEnquiries = enquiries.filter((e) => e.status !== 'Won' && e.status !== 'Dropped');

  const urgentItems = [
    ...activeProjects
      .filter((p) => p.deadline)
      .map((p) => ({
        id: p.id,
        title: p.title,
        sub: p.clientName,
        date: p.deadline,
        projectId: p.id,
        kind: 'Project' as const,
      })),
    ...workflowSteps
      .filter((s) => !s.completed && s.dueDate)
      .map((s) => {
        const proj = projects.find((p) => p.id === s.projectId);
        return {
          id: s.id,
          title: s.title,
          sub: `${proj?.title ?? 'Project'} (${s.assignee})`,
          date: s.dueDate,
          projectId: s.projectId,
          kind: 'Step' as const,
        };
      }),
  ]
    .map((item) => ({ ...item, urgency: getDeadlineUrgency(item.date) }))
    .sort((a, b) => (a.urgency.daysLeft ?? 999) - (b.urgency.daysLeft ?? 999))
    .slice(0, 6);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' });
  const dateLabel = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-6">
      {/* Big Date & Time + Desk Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-bold font-mono-num tracking-tight text-[#1C1C1E]">
              {timeLabel}
            </span>
            <span className="text-sm font-semibold text-[#8E8E93]">
              {weekday}, {dateLabel}
            </span>
          </div>
          <h1 className="mt-1 text-base font-semibold text-[#3A3A3C]">
            {myName}&apos;s Desk
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('enquiries')}
            className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white border border-[#E2E0D8] hover:border-[#254454] rounded-xl text-[#1C1C1E] shadow-2xs"
          >
            <Inbox className="w-3.5 h-3.5 text-[#5FA8E0]" />
            New Enquiry
          </button>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-xl shadow-[0_4px_12px_rgba(10,83,134,0.32)]"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            Projects
          </button>
        </div>
      </div>

      {/* LDOI Signature Widget Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="paper-card rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0A5386] text-white flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93]">My Tasks</div>
            <div className="text-xl font-bold font-mono-num text-[#1C1C1E]">
              {myPendingTasks.length}
            </div>
          </div>
        </div>

        <div className="paper-card rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#254454] text-white flex items-center justify-center shrink-0">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93]">Active Builds</div>
            <div className="text-xl font-bold font-mono-num text-[#1C1C1E]">
              {activeProjects.length}
            </div>
          </div>
        </div>

        <div className="paper-card rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#133F47] text-white flex items-center justify-center shrink-0">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93]">Enquiries</div>
            <div className="text-xl font-bold font-mono-num text-[#1C1C1E]">
              {openEnquiries.length}
            </div>
          </div>
        </div>

        <div className="paper-card rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1B5E5A] text-white flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-[#8E8E93]">Active Quotes</div>
            <div className="text-lg font-bold font-mono-num text-[#1C1C1E] truncate">
              {formatInr(activeProjects.reduce((sum, p) => sum + p.quotedAmountInr, 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Widget Row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Reminders-style Assigned Tasks Widget */}
        <section className="paper-card rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#0A5386] text-white flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-[#1C1C1E]">
                Assigned to {myName}
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-[#F2F1EC] text-[11px] font-mono-num font-semibold text-[#3A3A3C]">
              {myPendingTasks.length} open
            </span>
          </div>

          {myPendingTasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8E8E93] border border-dashed border-[#E2E0D8] rounded-xl bg-[#FCFBF8]">
              No pending workflow steps assigned to you right now.
            </div>
          ) : (
            <div className="space-y-2">
              {myPendingTasks.slice(0, 7).map((step) => {
                const proj = projects.find((p) => p.id === step.projectId);
                const urg = getDeadlineUrgency(step.dueDate);
                return (
                  <div
                    key={step.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl border border-[#E2E0D8] bg-[#FCFBF8] hover:bg-white transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleWorkflowStep(step.id)}
                      className="flex items-start gap-2.5 text-left min-w-0 flex-1"
                    >
                      <Square className="w-4 h-4 text-[#8E8E93] shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#1C1C1E] truncate">
                          {step.title}
                        </div>
                        <div className="text-[11px] text-[#8E8E93] truncate">
                          {proj?.title ?? 'Project'}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-2 shrink-0">
                      {step.dueDate && (
                        <span
                          className={`text-[11px] font-mono-num ${
                            urg.tone === 'overdue'
                              ? 'text-[#FF3B30] font-semibold'
                              : urg.tone === 'soon' || urg.tone === 'today'
                              ? 'text-[#FF9500] font-semibold'
                              : 'text-[#8E8E93]'
                          }`}
                        >
                          {formatDateShort(step.dueDate)}
                        </span>
                      )}
                      {proj && (
                        <button
                          type="button"
                          onClick={() => onOpenProject(proj.id)}
                          className="text-[#007AFF] hover:underline text-[11px] font-semibold"
                        >
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Calendar/Deadline Monitor Widget */}
        <section className="paper-card rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-[#8B1E1E] text-white flex items-center justify-center">
                <CalendarClock className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-[#1C1C1E]">
                Deadline Monitor
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('deadlines')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#5FA8E0] hover:underline"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {urgentItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8E8E93] border border-dashed border-[#E2E0D8] rounded-xl bg-[#FCFBF8]">
              No dated deadlines yet. Add deadlines to Projects or Workflow steps.
            </div>
          ) : (
            <div className="space-y-2">
              {urgentItems.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  type="button"
                  onClick={() => onOpenProject(item.projectId)}
                  className="ios-press w-full flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E2E0D8] bg-[#FCFBF8] hover:bg-white text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-white border border-[#E2E0D8] text-[#3A3A3C]">
                        {item.kind}
                      </span>
                      <span className="text-xs font-semibold text-[#1C1C1E] truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8E8E93] truncate">
                      {item.sub}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div
                      className={`text-[11px] font-mono-num font-bold ${
                        item.urgency.tone === 'overdue'
                          ? 'text-[#FF3B30]'
                          : item.urgency.tone === 'today' || item.urgency.tone === 'soon'
                          ? 'text-[#FF9500]'
                          : 'text-[#34C759]'
                      }`}
                    >
                      {item.urgency.label}
                    </div>
                    <div className="text-[10px] font-mono-num text-[#8E8E93]">
                      {formatDateShort(item.date)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Active Project Folders */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#1C1C1E]">Active Project Folders</h2>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#007AFF] hover:underline"
          >
            All projects <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeProjects.length === 0 ? (
          <div className="paper-card rounded-2xl p-8 text-center">
            <p className="text-sm font-bold text-[#1C1C1E]">No active projects yet</p>
            <p className="mt-1 text-xs text-[#8E8E93]">
              Start a new project folder or convert a won client enquiry.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('projects')}
              className="ios-press mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0A5386] text-white rounded-xl hover:bg-[#0C64A1]"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Create First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {activeProjects.slice(0, 6).map((p) => {
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
      </section>

      {/* Recent Ideas & Learnings */}
      <section className="paper-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#1B5E5A] text-white flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-[#1C1C1E]">
              Recent Ideas &amp; Learnings
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('journal')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#5FA8E0] hover:underline"
          >
            Open notebook <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {journalEntries.length === 0 ? (
          <div className="text-xs text-[#8E8E93] py-4">
            No notebook entries yet. Document what your team learns or pitch new ideas.
          </div>
        ) : (
          <div className="grid sm:grid-cols-3 gap-3">
            {journalEntries.slice(0, 3).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onNavigate('journal')}
                className="ios-press text-left p-3.5 rounded-xl border border-[#E2E0D8] bg-[#FCFBF8] hover:bg-white"
              >
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#8E8E93]">
                  <span className={entry.kind === 'Idea' ? 'text-[#007AFF]' : 'text-[#34C759]'}>
                    {entry.kind}
                  </span>
                  <span>{entry.author}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-[#1C1C1E] truncate">
                  {entry.title}
                </div>
                <div className="mt-1 text-[11px] text-[#636366] line-clamp-2">
                  {entry.content || 'Empty note'}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
