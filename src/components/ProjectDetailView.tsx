import React from 'react';
import { ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
import { formatDateShort, formatInr, getDeadlineUrgency } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import { ProjectPinboard } from './ProjectPinboard';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
}) => {
  const { projects, updateProject, deleteProject } = useLdoi();

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="fixed inset-0 z-30 ios-desk-bg flex items-center justify-center p-6">
        <div className="paper-card rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-[#18181B]">Project not found</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const urgency = getDeadlineUrgency(project.deadline);

  const handleEndProject = async () => {
    await updateProject(project.id, { status: 'Completed' });
  };

  const handleDeleteProject = async () => {
    if (window.confirm(`Delete "${project.title}" and all its tasks/notes?`)) {
      await deleteProject(project.id);
      onBack();
    }
  };

  return (
    <div className="fixed inset-0 z-30 ios-desk-bg flex flex-col overflow-hidden">
      {/* Compact Top Header */}
      <div className="px-4 sm:px-6 py-3 border-b border-[#E4E2DC] shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="mt-0.5 p-1.5 rounded-md bg-white border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-[#18181B]">{project.title}</h1>
                <span className="px-2 py-0.5 text-[11px] font-medium bg-white border border-[#E4E2DC] rounded">
                  {project.category}
                </span>
                <span
                  className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                    project.status === 'Active'
                      ? 'bg-[#0071E3] text-white'
                      : project.status === 'Completed'
                      ? 'bg-[#0F766E] text-white'
                      : 'bg-[#18181B] text-white'
                  }`}
                >
                  {project.status}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#52525B]">
                <span>Client: {project.clientName}</span>
                <span>|</span>
                <span className="font-mono-num">Quote: {formatInr(project.quotedAmountInr)}</span>
                <span>|</span>
                <span
                  className={`font-mono-num ${
                    urgency.tone === 'overdue' ? 'text-[#DC2626] font-semibold' : ''
                  }`}
                >
                  Deadline: {project.deadline ? formatDateShort(project.deadline) : 'Not set'} ({urgency.label})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {project.status !== 'Completed' && (
              <button
                type="button"
                onClick={handleEndProject}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0F766E] hover:bg-[#115E59] text-white rounded-md"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                End Project
              </button>
            )}
            <button
              type="button"
              onClick={handleDeleteProject}
              title="Delete Project"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-[#E4E2DC] hover:border-[#DC2626] text-xs font-medium text-[#71717A] hover:text-[#DC2626]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Pinboard Matrix (Full-Screen Canvas) */}
      <ProjectPinboard project={project} />
    </div>
  );
};
