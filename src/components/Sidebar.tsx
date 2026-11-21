import React from 'react';
import {
  BookOpen,
  CalendarClock,
  FileSpreadsheet,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  Sun,
  Wifi,
} from 'lucide-react';
import { TEAM_MEMBERS, getMemberColor, getMemberInitials } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { ActiveTab } from '../types';
import { LdoiLogo } from './LdoiLogo';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenSetupInfo: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'My Dashboard', color: '#2E74B5', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', color: '#3B828E', icon: FolderKanban },
  { id: 'enquiries', label: 'Enquiries', color: '#C86D44', icon: Inbox },
  { id: 'deadlines', label: 'Deadlines', color: '#C84B31', icon: CalendarClock },
  { id: 'journal', label: 'Ideas & Learnings', color: '#4D8B6F', icon: BookOpen },
  { id: 'quotations', label: 'Quotations & Docs', color: '#26231F', icon: FileSpreadsheet },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSetupInfo,
  darkMode,
  onToggleDarkMode,
}) => {
  const { currentUser, onlineMembers, syncMode, signOut } = useLdoi();

  return (
    <aside className="no-print w-full md:w-68 md:h-screen md:sticky md:top-0 shrink-0 bg-white/55 backdrop-blur-2xl border-b md:border-b-0 md:border-r border-white/60 shadow-[inset_-1px_0_0_rgba(255,255,255,0.4)] flex flex-col justify-between overflow-hidden">
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#E2E0D8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <LdoiLogo size={36} />
            <div>
              <div className="text-sm font-bold text-[#1C1C1E] leading-tight">
                Project LDOI
              </div>
              <div className="text-[11px] font-medium text-[#8E8E93]">
                Life Depends On It
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="ios-press p-1.5 rounded-lg border border-[#E2E0D8] text-[#52525B] hover:text-[#1C1C1E]"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Navigation with iOS App-Icon Squircles */}
        <nav className="p-3 flex md:flex-col gap-1.5 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                style={
                  active
                    ? {
                        backgroundColor: `${item.color}16`,
                        borderColor: `${item.color}40`,
                        color: item.color,
                      }
                    : undefined
                }
                className={`ios-press flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${
                  active
                    ? 'shadow-2xs'
                    : 'border-transparent text-[#3A3A3C] hover:bg-[#F2F1EC]'
                }`}
              >
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Team Presence Widget */}
        <div className="hidden md:block mx-3 mt-3 p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E2E0D8]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] mb-2.5">
            Team Online
          </div>
          <div className="space-y-2">
            {TEAM_MEMBERS.map((m) => {
              const isOnline = onlineMembers.includes(m.name);
              const isMe = currentUser?.name === m.name;
              return (
                <div key={m.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: m.accentHex }}
                    >
                      {m.initials}
                    </span>
                    <span className={isMe ? 'font-semibold text-[#1C1C1E]' : 'text-[#3A3A3C]'}>
                      {m.name} {isMe ? '(You)' : ''}
                    </span>
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-xs ${
                      isOnline ? 'bg-[#34C759]' : 'bg-[#D1D1D6]'
                    }`}
                    title={isOnline ? 'Online' : 'Offline'}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Sync & Profile Card */}
      <div className="p-3 border-t border-[#E2E0D8] space-y-2">
        <button
          type="button"
          onClick={onOpenSetupInfo}
          className="ios-press w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-[#F7F6F2] border border-[#E2E0D8] hover:border-[#007AFF] text-left"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Wifi
              className={`w-3.5 h-3.5 shrink-0 ${
                syncMode === 'supabase' ? 'text-[#34C759]' : 'text-[#FF9500]'
              }`}
            />
            <span className="text-[11px] font-semibold text-[#1C1C1E] truncate">
              {syncMode === 'supabase' ? 'Live Cloud Sync' : 'Local Multi-Tab'}
            </span>
          </div>
          <span className="text-[11px] text-[#007AFF] font-semibold shrink-0">Setup</span>
        </button>

        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{
                backgroundColor: currentUser ? getMemberColor(currentUser.name) : '#007AFF',
              }}
            >
              {currentUser ? getMemberInitials(currentUser.name) : 'LD'}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1C1C1E] truncate">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-[#8E8E93] truncate">{currentUser?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign Out"
            className="ios-press p-1.5 rounded-lg text-[#636366] hover:text-[#FF3B30] hover:bg-[#F2F1EC]"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
