import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Code2,
  Eye,
  Columns,
  Download,
  Settings,
  Sparkles,
  Undo2,
  Redo2,
  FolderOpen,
  Plus,
  Maximize2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { ViewportMode, ViewMode, Project, AIProviderId } from '../types';
import { PROVIDERS_CONFIG } from '../data/providers';

interface HeaderProps {
  currentProject: Project;
  onRenameProject: (name: string) => void;
  onNewProject: () => void;
  onOpenProjectDrawer: () => void;
  viewport: ViewportMode;
  onChangeViewport: (v: ViewportMode) => void;
  viewMode: ViewMode;
  onChangeViewMode: (m: ViewMode) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSettings: () => void;
  onOpenTemplates: () => void;
  onOpenExport: () => void;
  onToggleFullscreen: () => void;
  activeProvider: AIProviderId;
  hasKeyForProvider: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  onRenameProject,
  onNewProject,
  onOpenProjectDrawer,
  viewport,
  onChangeViewport,
  viewMode,
  onChangeViewMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSettings,
  onOpenTemplates,
  onOpenExport,
  onToggleFullscreen,
  activeProvider,
  hasKeyForProvider,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectName, setProjectName] = useState(currentProject.name);

  const providerMeta = PROVIDERS_CONFIG.find((p) => p.id === activeProvider) || PROVIDERS_CONFIG[0];

  const handleFinishRename = () => {
    setIsEditingName(false);
    if (projectName.trim()) {
      onRenameProject(projectName.trim());
    } else {
      setProjectName(currentProject.name);
    }
  };

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between z-30 select-none">
      {/* Left: Branding & Project Title */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-white hidden sm:inline-block">
            AI Website <span className="text-indigo-400">Builder</span>
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden md:block" />

        {/* Project Selector & Name */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenProjectDrawer}
            title="Projects list"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
          </button>

          {isEditingName ? (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
              autoFocus
              className="text-xs sm:text-sm font-semibold bg-slate-800 text-white px-2 py-1 rounded border border-indigo-500 focus:outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setProjectName(currentProject.name);
                setIsEditingName(true);
              }}
              title="Click to rename project"
              className="text-xs sm:text-sm font-semibold text-slate-200 hover:text-white px-2 py-1 rounded hover:bg-slate-800/80 transition-colors max-w-[140px] sm:max-w-[200px] truncate"
            >
              {currentProject.name}
            </button>
          )}

          <button
            onClick={onNewProject}
            title="Create new project"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center: Viewport Controls & View Mode */}
      <div className="flex items-center space-x-2">
        {/* Undo / Redo */}
        <div className="flex items-center space-x-0.5 bg-slate-800/60 p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className={`p-1.5 rounded text-xs transition-colors ${
              canUndo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className={`p-1.5 rounded text-xs transition-colors ${
              canRedo ? 'text-slate-300 hover:text-white hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Viewport switch (Desktop, Tablet, Mobile) */}
        <div className="hidden lg:flex items-center bg-slate-800/60 p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={() => onChangeViewport('desktop')}
            title="Desktop view"
            className={`p-1.5 rounded text-xs flex items-center space-x-1 transition-colors ${
              viewport === 'desktop' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewport('tablet')}
            title="Tablet view (768px)"
            className={`p-1.5 rounded text-xs flex items-center space-x-1 transition-colors ${
              viewport === 'tablet' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeViewport('mobile')}
            title="Mobile view (375px)"
            className={`p-1.5 rounded text-xs flex items-center space-x-1 transition-colors ${
              viewport === 'mobile' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View mode (Preview, Split, Code) */}
        <div className="flex items-center bg-slate-800/60 p-0.5 rounded-lg border border-slate-700/60">
          <button
            onClick={() => onChangeViewMode('preview')}
            title="Full Preview"
            className={`p-1.5 rounded text-xs flex items-center space-x-1 transition-colors ${
              viewMode === 'preview' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px] font-medium">Preview</span>
          </button>
          <button
            onClick={() => onChangeViewMode('split')}
            title="Split Code & Preview"
            className={`p-1.5 rounded text-xs flex items-center space-x-1 transition-colors ${
              viewMode === 'split' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px] font-medium">Split</span>
          </button>
          <button
            onClick={() => onChangeViewMode('code')}
            title="Code Editor"
            className={`p-1.5 rounded text-xs flex items-center space-x-1 transition-colors ${
              viewMode === 'code' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[11px] font-medium">Code</span>
          </button>
        </div>
      </div>

      {/* Right: Templates, Provider Settings, Export, Fullscreen */}
      <div className="flex items-center space-x-2">
        {/* Templates button */}
        <button
          onClick={onOpenTemplates}
          title="Browse starter templates"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors flex items-center space-x-1.5 hidden md:flex"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span>Templates</span>
        </button>

        {/* AI Provider Badge & Settings trigger */}
        <button
          onClick={onOpenSettings}
          title="Configure AI Providers & API Keys"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 transition-all flex items-center space-x-1.5"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-slate-300 max-w-[90px] sm:max-w-none truncate">{providerMeta.name}</span>
          <Settings className="w-3 h-3 text-slate-400" />
        </button>

        {/* Export Button */}
        <button
          onClick={onOpenExport}
          title="Download HTML, ZIP or Copy React Component"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/30 transition-all flex items-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          title="Toggle Fullscreen Canvas"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors hidden sm:block"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
