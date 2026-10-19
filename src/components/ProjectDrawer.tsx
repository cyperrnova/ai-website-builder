import React from 'react';
import {
  X,
  Plus,
  FolderOpen,
  Trash2,
  Copy,
  Calendar,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { Project } from '../types';

interface ProjectDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
}

export const ProjectDrawer: React.FC<ProjectDrawerProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  onDuplicateProject,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border-r border-slate-800 w-80 sm:w-96 h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Your Projects</h2>
            <span className="text-xs text-slate-500 font-mono">({projects.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action: New Project */}
        <div className="p-4 border-b border-slate-800/80">
          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New Website Project</span>
          </button>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const updatedDate = new Date(proj.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={proj.id}
                onClick={() => {
                  onSelectProject(proj.id);
                  onClose();
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-white' : 'text-slate-200'
                      }`}
                    >
                      {proj.name}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {proj.prompt || 'Clean project slate'}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{updatedDate}</span>
                  </span>

                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateProject(proj.id);
                      }}
                      title="Duplicate project"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete project "${proj.name}"?`)) {
                            onDeleteProject(proj.id);
                          }
                        }}
                        title="Delete project"
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
