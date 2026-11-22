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

interface StatusPalette {
  top: string;
  mid: string;
  bottom: string;
}

const FOLDER_PALETTES: Record<Project['status'], StatusPalette> = {
  Active: { top: '#1277B8', mid: '#0A5386', bottom: '#063354' },
  Planning: { top: '#3D6F88', mid: '#254454', bottom: '#152934' },
  Review: { top: '#B82D2D', mid: '#8B1E1E', bottom: '#580A0A' },
  Completed: { top: '#206E69', mid: '#133F47', bottom: '#0B2429' },
  Archived: { top: '#5D5D67', mid: '#3F3F46', bottom: '#232327' },
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
  const palette = FOLDER_PALETTES[project.status];
  const gradientId = `folder-back-${project.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-press group text-left w-full max-w-[220px] focus:outline-none"
    >
      <div className="folder-shell relative aspect-[1/0.94] w-full transition-transform duration-200 ease-out group-hover:-translate-y-1.5">
        {/* Layer 1: Real Folder Backplate Silhouette with Raised Top-Left Tab */}
        <svg
          viewBox="0 0 220 206"
          className="folder-backplate-svg absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={palette.top} />
              <stop offset="55%" stopColor={palette.mid} />
              <stop offset="100%" stopColor={palette.bottom} />
            </linearGradient>
          </defs>
          {/* Back folder body with raised left tab and smooth shoulder */}
          <path
            d="M 0 14 Q 0 0 14 0 L 86 0 Q 98 0 104 10 L 108 16 Q 114 22 126 22 L 204 22 Q 220 22 220 38 L 220 188 Q 220 206 202 206 L 18 206 Q 0 206 0 188 Z"
            fill={`url(#${gradientId})`}
          />
          {/* Subtle top specular rim along tab & shoulder */}
          <path
            d="M 1 14 Q 1 1 14 1 L 86 1 Q 97.5 1 103.5 10.5 L 107.5 16.5 Q 113.5 22.5 126 22.5 L 204 22.5 Q 219 22.5 219 38"
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="1.2"
          />
        </svg>

        {/* Tab Label (Status) & Upper-Right Quoted Amount */}
        <div className="relative z-10 flex items-start justify-between px-3 pt-1.5">
          <span className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/25 text-white/95 border border-white/20 backdrop-blur-sm">
            {project.status}
          </span>
          <span className="mt-4 text-[10px] font-mono-num font-semibold text-white/95 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
            {formatInr(project.quotedAmountInr)}
          </span>
        </div>

        {/* Layer 2: Inner Document Sheets Peeking Out of the Folder */}
        <div
          className="folder-paper-back absolute inset-x-3.5 top-[21%] bottom-3 rounded-[10px] transition-transform duration-200 ease-out -rotate-[1.2deg] group-hover:-translate-y-1.5 group-hover:-rotate-[2deg]"
          aria-hidden="true"
        />
        <div
          className="folder-paper-front absolute inset-x-2.5 top-[24%] bottom-2.5 rounded-[10px] transition-transform duration-200 ease-out rotate-[0.7deg] group-hover:-translate-y-2 group-hover:rotate-[1.2deg]"
          aria-hidden="true"
        >
          <div className="mx-2.5 mt-1.5 h-[2px] w-10 rounded-full bg-current opacity-15" />
        </div>

        {/* Layer 3: Frosted Glassmorphic Front Pocket */}
        <div className="folder-glass-pocket absolute inset-x-0 bottom-0 top-[29%] rounded-[18px] rounded-tl-[15px] flex flex-col justify-between p-3 pt-3.5 overflow-hidden">
          {/* Subtle diagonal glass reflection sheen */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[18px] opacity-70"
            style={{
              background:
                'linear-gradient(125deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.06) 38%, transparent 60%)',
            }}
            aria-hidden="true"
          />

          {/* Subtle folder pocket thumb-notch crease */}
          <div
            className="folder-pocket-notch pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full"
            aria-hidden="true"
          />

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
                className="inline-flex items-center justify-center w-5 h-5 rounded-md border border-white/35 shadow-sm text-[8px] font-bold text-white"
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
