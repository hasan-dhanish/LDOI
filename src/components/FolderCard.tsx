import React from 'react';
import { getDeadlineUrgency, formatInr, getMemberColor, getMemberInitials } from '../constants';
import type { MemberName, Project } from '../types';

interface FolderCardProps {
  project: Project;
  taskCount: number;
  completedCount: number;
  docCount: number;
  assignees: MemberName[];
  onClick: () => void;
}

const FLAP_STYLES: Record<Project['status'], { bg: string; back: string; text: string; badge: string }> = {
  Active: {
    bg: 'bg-[#0A5386]',
    back: 'bg-[#073B60]',
    text: 'text-white',
    badge: 'bg-white/20 text-white border-white/25',
  },
  Planning: {
    bg: 'bg-[#254454]',
    back: 'bg-[#19303C]',
    text: 'text-white',
    badge: 'bg-white/15 text-white border-white/20',
  },
  Review: {
    bg: 'bg-[#8B1E1E]',
    back: 'bg-[#660909]',
    text: 'text-white',
    badge: 'bg-white/15 text-white border-white/25',
  },
  Completed: {
    bg: 'bg-[#133F47]',
    back: 'bg-[#0D292F]',
    text: 'text-white',
    badge: 'bg-white/15 text-white border-white/25',
  },
  Archived: {
    bg: 'bg-[#52525B]',
    back: 'bg-[#3F3F46]',
    text: 'text-white',
    badge: 'bg-white/20 text-white border-white/25',
  },
};

export const FolderCard: React.FC<FolderCardProps> = ({
  project,
  taskCount,
  completedCount,
  docCount,
  assignees,
  onClick,
}) => {
  const style = FLAP_STYLES[project.status];
  const urgency = getDeadlineUrgency(project.deadline);
  const progress = taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-press group text-left w-full focus:outline-none"
    >
      <div className="paper-card rounded-2xl p-3 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:shadow-md">
        {/* Tactile Apple-style Layered Folder */}
        <div className="relative h-28 w-full pt-3">
          <div className={`absolute top-1.5 left-0 w-20 h-5 rounded-t-lg ${style.back}`} />
          <div className={`absolute top-4 inset-x-0 bottom-0 rounded-lg ${style.back}`} />

          {/* Peeking Paper Sheet 1 */}
          <div className="absolute top-2.5 left-2.5 right-5 h-12 bg-[#F2F1EC] border border-[#E2E0D8] rounded-md shadow-xs transform -rotate-2 transition-transform duration-150 group-hover:-rotate-3" />

          {/* Peeking Paper Sheet 2 */}
          <div className="absolute top-1.5 left-5 right-2.5 h-12 bg-white border border-[#E2E0D8] rounded-md shadow-xs p-2 transform rotate-1 transition-transform duration-150 group-hover:rotate-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#3A3A3C]">
                {project.category}
              </span>
              <span className="text-[9px] font-mono-num font-semibold text-[#8E8E93]">
                {progress}%
              </span>
            </div>
            <div className="mt-1 space-y-1">
              <div className="h-1 w-3/4 bg-[#E2E0D8] rounded-xs" />
              <div className="h-1 w-1/2 bg-[#EFECE6] rounded-xs" />
            </div>
          </div>

          {/* Front Tactile Folder Flap */}
          <div
            className={`absolute inset-x-0 bottom-0 top-8 rounded-lg ${style.bg} ${style.text} p-2.5 flex flex-col justify-between shadow-sm border-t border-white/25`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${style.badge}`}>
                {project.status}
              </span>
              <span className="text-[11px] font-mono-num font-semibold opacity-95">
                {formatInr(project.quotedAmountInr)}
              </span>
            </div>

            <div className="flex items-center justify-between mt-auto">
              <div className="flex -space-x-1.5">
                {(assignees.length > 0 ? assignees : [project.createdBy]).slice(0, 4).map((m) => (
                  <span
                    key={m}
                    title={m}
                    style={{ backgroundColor: getMemberColor(m) }}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-lg border-2 border-white/80 text-[10px] font-bold text-white shadow-2xs"
                  >
                    {getMemberInitials(m)}
                  </span>
                ))}
              </div>

              <span className="text-[11px] opacity-90 font-mono-num">
                {completedCount}/{taskCount} steps · {docCount} docs
              </span>
            </div>
          </div>
        </div>

        {/* Folder Label */}
        <div className="mt-3.5 px-0.5">
          <h3 className="text-sm font-bold text-[#1C1C1E] truncate">
            {project.title}
          </h3>
          <div className="mt-1 flex items-center justify-between text-xs text-[#636366]">
            <span className="truncate">{project.clientName}</span>
            <span
              className={`font-mono-num shrink-0 ${
                urgency.tone === 'overdue'
                  ? 'text-[#FF3B30] font-semibold'
                  : urgency.tone === 'today' || urgency.tone === 'soon'
                  ? 'text-[#FF9500] font-semibold'
                  : 'text-[#8E8E93]'
              }`}
            >
              {urgency.label}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
