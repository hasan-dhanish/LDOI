import React, { useState } from 'react';
import { CalendarClock, CheckSquare, Square } from 'lucide-react';
import { MEMBER_NAMES, formatDateShort, getDeadlineUrgency } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { MemberName } from '../types';

interface DeadlinesViewProps {
  onOpenProject: (projectId: string) => void;
}

export const DeadlinesView: React.FC<DeadlinesViewProps> = ({ onOpenProject }) => {
  const { projects, workflowSteps, toggleWorkflowStep } = useLdoi();
  const [memberFilter, setMemberFilter] = useState<'All' | MemberName>('All');

  const items = [
    ...projects
      .filter((p) => p.status !== 'Completed' && p.status !== 'Archived' && p.deadline)
      .map((p) => ({
        id: p.id,
        kind: 'Project' as const,
        title: p.title,
        subtitle: `Client: ${p.clientName} (${p.status})`,
        assignee: p.createdBy,
        dueDate: p.deadline,
        projectId: p.id,
        completed: false,
      })),
    ...workflowSteps
      .filter((s) => !s.completed && s.dueDate)
      .map((s) => {
        const proj = projects.find((p) => p.id === s.projectId);
        return {
          id: s.id,
          kind: 'Workflow Step' as const,
          title: s.title,
          subtitle: `Project: ${proj?.title ?? 'Unknown'}`,
          assignee: s.assignee,
          dueDate: s.dueDate,
          projectId: s.projectId,
          completed: s.completed,
        };
      }),
  ]
    .filter((it) => (memberFilter === 'All' ? true : it.assignee === memberFilter))
    .map((it) => ({ ...it, urgency: getDeadlineUrgency(it.dueDate) }))
    .sort((a, b) => (a.urgency.daysLeft ?? 999) - (b.urgency.daysLeft ?? 999));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E4E2DC]">
        <div>
          <h1 className="text-xl font-semibold text-[#18181B]">Deadline Monitor</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Sorted by urgency across all active projects and assigned workflow steps.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(['All', ...MEMBER_NAMES] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMemberFilter(m)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md border ${
                memberFilter === m
                  ? 'bg-[#18181B] text-white border-[#18181B]'
                  : 'bg-white text-[#52525B] border-[#E4E2DC]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center">
          <CalendarClock className="w-6 h-6 text-[#71717A] mx-auto mb-2" />
          <p className="text-sm font-medium text-[#18181B]">No upcoming deadlines</p>
          <p className="mt-1 text-xs text-[#71717A]">
            Add target dates to Projects or Workflow steps to monitor them here.
          </p>
        </div>
      ) : (
        <div className="paper-card rounded-xl overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-[#E4E2DC] text-left text-[#52525B]">
                <th className="py-3 px-4 font-semibold">Item</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Owner</th>
                <th className="py-3 px-4 font-semibold">Due Date</th>
                <th className="py-3 px-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E2DC]">
              {items.map((it) => (
                <tr key={`${it.kind}-${it.id}`} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {it.kind === 'Workflow Step' ? (
                        <button
                          type="button"
                          onClick={() => toggleWorkflowStep(it.id)}
                          className="text-[#71717A] hover:text-[#0071E3]"
                        >
                          {it.completed ? (
                            <CheckSquare className="w-4 h-4 text-[#0F766E]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      ) : null}
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenProject(it.projectId)}
                          className="font-semibold text-[#18181B] hover:text-[#0071E3] text-left"
                        >
                          {it.title}
                        </button>
                        <div className="text-[11px] text-[#71717A]">{it.subtitle}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#52525B]">{it.kind}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-[#FAF9F6] border border-[#E4E2DC] rounded text-[11px] font-medium">
                      {it.assignee}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono-num text-[#18181B]">
                    {formatDateShort(it.dueDate)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num font-semibold">
                    <span
                      className={
                        it.urgency.tone === 'overdue'
                          ? 'text-[#DC2626]'
                          : it.urgency.tone === 'today' || it.urgency.tone === 'soon'
                          ? 'text-[#B45309]'
                          : 'text-[#0F766E]'
                      }
                    >
                      {it.urgency.label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
