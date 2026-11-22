import React from 'react';
import { getDeadlineUrgency } from '../constants';
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
  Active: { top: '#1B567C', mid: '#114161', bottom: '#0B2D45' },
  Planning: { top: '#38596A', mid: '#254454', bottom: '#182E3A' },
  Review: { top: '#962D2D', mid: '#7A1F1F', bottom: '#541212' },
  Completed: { top: '#1F5652', mid: '#133F47', bottom: '#0C292E' },
  Archived: { top: '#57534E', mid: '#44403C', bottom: '#292524' },
};

export const FolderCard: React.FC<FolderCardProps> = ({
  project,
  docCount,
  onClick,
}) => {
  const urgency = getDeadlineUrgency(project.deadline);
  const palette = FOLDER_PALETTES[project.status];
  const gradientId = `folder-back-${project.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="ios-press group text-left w-full max-w-[220px] focus:outline-none"
    >
      <div className="folder-shell relative aspect-[1/0.72] w-full transition-transform duration-200 ease-out group-hover:-translate-y-1.5">
        {/* Layer 1: Real Folder Backplate Silhouette with Raised Top-Left Tab */}
        <svg
          viewBox="0 0 220 158"
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
            d="M 0 14 Q 0 0 14 0 L 86 0 Q 98 0 104 9 L 108 15 Q 114 21 126 21 L 204 21 Q 220 21 220 37 L 220 140 Q 220 158 202 158 L 18 158 Q 0 158 0 140 Z"
            fill={`url(#${gradientId})`}
          />
          {/* Subtle PCB copper trace lines on the backplate */}
          <path
            d="M 142 29 L 166 29 L 174 37 L 202 37 M 156 29 L 162 23 L 192 23"
            fill="none"
            stroke="#E5C158"
            strokeOpacity="0.28"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <circle cx="202" cy="37" r="2" fill="#E5C158" fillOpacity="0.45" />
          <circle cx="192" cy="23" r="1.8" fill="#E5C158" fillOpacity="0.45" />
          {/* Subtle top specular rim along tab & shoulder */}
          <path
            d="M 1 14 Q 1 1 14 1 L 86 1 Q 97.5 1 103.5 9.5 L 107.5 15.5 Q 113.5 21.5 126 21.5 L 204 21.5 Q 219 21.5 219 37"
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeWidth="1.2"
          />
        </svg>

        {/* Tab Label (Status + Live LED) */}
        <div className="relative z-10 flex items-start justify-start px-3 pt-1">
          <span className="inline-flex items-center gap-1.5 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-black/25 text-white/95 border border-white/20 backdrop-blur-sm">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                project.status === 'Active'
                  ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]'
                  : project.status === 'Review'
                  ? 'bg-amber-400 shadow-[0_0_5px_#fbbf24]'
                  : 'bg-zinc-300'
              }`}
            />
            {project.status}
          </span>
        </div>

        {/* Layer 2: Inner Document Sheets Peeking Out of the Folder */}
        <div
          className="folder-paper-back absolute inset-x-3.5 top-[25%] bottom-2.5 rounded-[10px] transition-transform duration-200 ease-out -rotate-[1.2deg] group-hover:-translate-y-1.5 group-hover:-rotate-[2deg]"
          aria-hidden="true"
        />
        <div
          className="folder-paper-front absolute inset-x-2.5 top-[28%] bottom-2 rounded-[10px] transition-transform duration-200 ease-out rotate-[0.7deg] group-hover:-translate-y-2 group-hover:rotate-[1.2deg]"
          aria-hidden="true"
        >
          <div className="mx-2.5 mt-1.5 h-[2px] w-10 rounded-full bg-current opacity-15" />
        </div>

        {/* Layer 3: Frosted Glassmorphic Front Pocket */}
        <div className="folder-glass-pocket absolute inset-x-0 bottom-0 top-[34%] rounded-[18px] rounded-tl-[15px] flex flex-col justify-between p-3 pt-3.5 overflow-hidden">
          {/* Subtle diagonal glass reflection sheen */}
          <div
            className="pointer-events-none absolute inset-0 rounded-[18px] opacity-70"
            style={{
              background:
                'linear-gradient(125deg, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.06) 38%, transparent 60%)',
            }}
            aria-hidden="true"
          />

          {/* Subtle folder pocket thumb-notch crease + corner mounting holes */}
          <div
            className="folder-pocket-notch pointer-events-none absolute top-1.5 left-1/2 -translate-x-1/2 w-9 h-[3px] rounded-full"
            aria-hidden="true"
          />
          <span className="pcb-mounting-hole absolute top-2 right-2.5 opacity-60" aria-hidden="true" />
          <span className="pcb-mounting-hole absolute bottom-2 left-2.5 opacity-60" aria-hidden="true" />

          {/* Gold ENIG edge-connector fingers along bottom */}
          <div
            className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 flex items-end gap-1 opacity-55"
            aria-hidden="true"
          >
            {[0, 1, 2, 3, 4, 5].map((pin) => (
              <span
                key={pin}
                className="w-1.5 h-1.5 rounded-t-[1px] bg-gradient-to-b from-[#F5D061] to-[#B88928]"
              />
            ))}
          </div>

          {/* Folder Title & Client Subtitle */}
          <div className="relative z-10 pr-1 mt-0.5">
            <h3 className="folder-title text-xs font-bold truncate leading-snug">
              {project.title}
            </h3>
            <p className="folder-muted text-[10px] truncate mt-0.5">
              {project.clientName} · {project.category}
            </p>
          </div>

          {/* Bottom Meta Row */}
          <div className="relative z-10 flex items-center justify-between pt-1">
            <span
              className={`text-[10px] font-mono-num font-semibold ${
                urgency.tone === 'overdue'
                  ? 'text-[#DC2626]'
                  : urgency.tone === 'today' || urgency.tone === 'soon'
                  ? 'text-[#D97706]'
                  : 'folder-muted'
              }`}
            >
              {urgency.label}
            </span>
            <span className="folder-muted text-[9.5px] font-mono-num opacity-85">
              {docCount} {docCount === 1 ? 'doc' : 'docs'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
