import React, { useState } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { DeadlinesView } from './components/DeadlinesView';
import { EnquiriesView } from './components/EnquiriesView';
import { JournalView } from './components/JournalView';
import { ProjectDetailView } from './components/ProjectDetailView';
import { ProjectsView } from './components/ProjectsView';
import { QuotationsView } from './components/QuotationsView';
import { Sidebar } from './components/Sidebar';
import { LdoiProvider, useLdoi } from './context/LdoiContext';
import type { ActiveTab } from './types';

const WorkspaceShell: React.FC = () => {
  const { currentUser, authLoading } = useLdoi();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ldoi_theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  const toggleDarkMode = () => {
    setDarkMode((d) => {
      const next = !d;
      try {
        localStorage.setItem('ldoi_theme', next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center text-xs text-[#52525B]">
        Loading Project LDOI...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
  }

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedProjectId(null);
  };

  const handleOpenProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setActiveTab('projects');
  };

  return (
    <div
      className={`min-h-screen md:h-screen md:overflow-hidden ios-desk-bg theme-smooth flex flex-col md:flex-row animate-workspace-enter ${
        darkMode ? 'dark-theme' : ''
      }`}
    >
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 min-w-0 md:h-screen md:overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl">
        {activeTab === 'dashboard' && (
          <DashboardView
            onNavigate={handleSelectTab}
            onOpenProject={handleOpenProject}
          />
        )}

        {activeTab === 'projects' &&
          (selectedProjectId ? (
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={() => setSelectedProjectId(null)}
            />
          ) : (
            <ProjectsView onOpenProject={handleOpenProject} />
          ))}

        {activeTab === 'enquiries' && (
          <EnquiriesView onOpenProject={handleOpenProject} />
        )}

        {activeTab === 'deadlines' && (
          <DeadlinesView onOpenProject={handleOpenProject} />
        )}

        {activeTab === 'journal' && <JournalView />}

        {activeTab === 'quotations' && <QuotationsView />}
        </div>
      </main>
    </div>
  );
};

export function App() {
  return (
    <LdoiProvider>
      <WorkspaceShell />
    </LdoiProvider>
  );
}

export default App;
