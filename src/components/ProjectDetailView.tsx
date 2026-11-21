import React from 'react';
import { ArrowLeft, CheckCircle2, Trash2 } from 'lucide-react';
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
    <div className="fixed inset-0 z-30 matrix-clean-bg flex flex-col overflow-hidden">
      {/* Fixed Floating Top-Left Back + Title */}
      <div className="fixed top-4 left-4 z-40 flex items-center gap-2 paper-card rounded-full pl-1.5 pr-3.5 py-1.5 shadow-lg border border-[#E4E2DC] backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          title="Back to Projects"
          className="ios-press p-1.5 rounded-full bg-white/80 border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-[#18181B] max-w-[200px] truncate">
          {project.title}
        </span>
      </div>

      {/* Fixed Floating Top-Right Actions */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        {project.status !== 'Completed' && (
          <button
            type="button"
            onClick={handleEndProject}
            className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-full shadow-lg"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            End Project
          </button>
        )}
        <button
          type="button"
          onClick={handleDeleteProject}
          title="Delete Project"
          className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full paper-card border border-[#E4E2DC] hover:border-[#DC2626] text-xs font-semibold text-[#71717A] hover:text-[#DC2626] shadow-lg"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Full-Screen Pinboard Matrix Canvas */}
      <ProjectPinboard project={project} />
    </div>
  );
};
