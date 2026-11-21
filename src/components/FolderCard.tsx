import React from 'react';
import { formatInr, getDeadlineUrgency, getMemberColor, getMemberInitials } from '../constants';
import type { MemberName, Project } from '../types';

interface FolderCardProps {
  project: Project;
  taskCount: number;
  completedCount: number;
  docCount: number;
  assignees: MemberName[];
  onClick: () => void;
}

const TOP_STRIP_STYLES: Record<Project['status'], string> = {
  Active: 'linear-gradient(135deg, #0E6BA8 0%, #0A5386 60%, #073B60 100%)',
  Planning: 'linear-gradient(135deg, #356076 0%, #254454 60%, #19303C 100%)',
  Review: 'linear-gradient(135deg, #A92727 0%, #8B1E1E 60%, #660909 100%)',
  Completed: 'linear-gradient(135deg, #1B5E5A 0%, #133F47 60%, #0D292F 100%)',
  Archived: 'linear-gradient(135deg, #52525B 0%, #3F3F46 60%, #27272A 100%)',
};

export const FolderCard: React.FC<FolderCardProps> = ({
  project,
  taskCount,
  completedCount,
  docCount,
  assignees,
  onClick,
}) => {
  const urgency = getDeadlineUrgency(project.deadline);
  const stepDisplay = String(taskCount).padStart(2, '0');

  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-press group text-left w-full max-w-[220px] focus:outline-none"
    >
      <div className="folder-shell relative aspect-[1/0.94] w-full rounded-[20px] border-2 overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.14)] transition-transform duration-150 group-hover:-translate-y-1">
        {/* Top Colored Backplate */}
        <div
          className="absolute inset-x-0 top-0 h-[44%] p-3 flex items-start justify-between"
          style={{ background: TOP_STRIP_STYLES[project.status] }}
        >
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-black/25 text-white/95 border border-white/15">
            {project.status}
          </span>
          <span className="text-[10px] font-mono-num font-semibold text-white/95">
            {formatInr(project.quotedAmountInr)}
          </span>
        </div>

        {/* Theme-Aware Front Folder Flap with Angled Tab Shoulder */}
        <div className="absolute inset-x-0 bottom-0 top-[24%] flex flex-col justify-between p-3 pt-4">
          <svg
            viewBox="0 0 300 220"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
          >
            <path
              className="folder-flap-fill"
              d="M 0 18 Q 0 0 18 0 L 106 0 Q 120 0 128 12 L 136 24 Q 144 34 158 34 L 284 34 Q 300 34 300 50 L 300 220 L 0 220 Z"
            />
            <path
              className="folder-flap-stroke"
              d="M 0 18 Q 0 0 18 0 L 106 0 Q 120 0 128 12 L 136 24 Q 144 34 158 34 L 284 34 Q 300 34 300 50"
              fill="none"
              strokeWidth="1.5"
            />
          </svg>

          {/* Folder Title & Client Subtitle */}
          <div className="relative z-10 pr-1 mt-0.5">
            <h3 className="folder-title text-xs font-bold truncate leading-snug">
              {project.title}
            </h3>
            <p className="folder-muted text-[10px] truncate mt-0.5">
              {project.clientName} · {project.category}
            </p>
          </div>

          {/* Assigned Member Badges */}
          <div className="relative z-10 flex items-center gap-1 my-auto pt-1">
            {(assignees.length > 0 ? assignees : [project.createdBy]).slice(0, 4).map((m) => (
              <span
                key={m}
                title={m}
                style={{ backgroundColor: getMemberColor(m) }}
                className="inline-flex items-center justify-center w-5 h-5 rounded border border-white/25 text-[8px] font-bold text-white"
              >
                {getMemberInitials(m)}
              </span>
            ))}
          </div>

          {/* Bottom Stats Row */}
          <div className="relative z-10 flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="folder-title text-lg font-bold font-mono-num leading-none">
                {stepDisplay}
              </span>
              <span className="folder-muted text-[9px] font-medium">
                Steps ({completedCount}/{taskCount})
              </span>
            </div>

            <div className="text-right">
              <div
                className={`text-[10px] font-mono-num font-semibold ${
                  urgency.tone === 'overdue'
                    ? 'text-[#DC2626]'
                    : urgency.tone === 'today' || urgency.tone === 'soon'
                    ? 'text-[#D97706]'
                    : 'folder-muted'
                }`}
              >
                {urgency.label}
              </div>
              <div className="folder-muted text-[9px] font-mono-num opacity-80">
                {docCount} {docCount === 1 ? 'doc' : 'docs'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
};
