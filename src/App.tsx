import React, { useState, useEffect, useCallback } from 'react';
import {
  ViewportMode,
  ViewMode,
  StylePreset,
  Project,
  PersistedPreferences,
  UserProviderSettings,
  Template,
  AIProviderId,
} from './types';
import { STARTER_TEMPLATES } from './data/templates';
import { PROVIDERS_CONFIG } from './data/providers';
import { checkServerHealth, generateWebsite } from './services/api';
import { Header } from './components/Header';
import { PromptBar } from './components/PromptBar';
import { PreviewCanvas } from './components/PreviewCanvas';
import { CodeEditor } from './components/CodeEditor';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { ExportModal } from './components/ExportModal';
import { ProjectDrawer } from './components/ProjectDrawer';
import { AlertCircle, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';

const STORAGE_KEY_PROJECTS = 'ai_website_builder_projects_v2';
const STORAGE_KEY_ACTIVE_PROJECT = 'ai_website_builder_active_id_v2';
const STORAGE_KEY_PREFERENCES = 'ai_website_builder_preferences_v3';
const LEGACY_STORAGE_KEY_SETTINGS = 'ai_website_builder_settings_v2';

const DEFAULT_PREFERENCES: PersistedPreferences = {
  activeProvider: 'builtin',
  selectedModels: {
    builtin: 'smart-synthesizer-v3',
    gemini: 'gemini-3.8-flash',
    openai: 'gpt-4o',
    anthropic: 'claude-3-7-sonnet-20250219',
    groq: 'llama-3.3-70b-versatile',
    deepseek: 'deepseek-chat',
    openrouter: 'anthropic/claude-3.5-sonnet',
  },
  customSystemPrompt: '',
  temperature: 0.7,
};

function createInitialProject(): Project {
  const defaultTemplate = STARTER_TEMPLATES[0];
  const initialHistory = [
    {
      id: 'h_initial',
      prompt: 'Initial AI SaaS landing page',
      code: defaultTemplate.code,
      timestamp: Date.now(),
      provider: 'builtin',
    },
  ];

  return {
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    name: 'NovaScale SaaS Platform',
    prompt: 'AI streaming analytics & intelligence dashboard landing page',
    stylePreset: 'Modern SaaS',
    currentCode: defaultTemplate.code,
    history: initialHistory,
    historyIndex: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Safely loads preferences from localStorage while ensuring that any previously
 * saved API keys are strictly PURGED from persistent storage on startup.
 */
function loadAndSanitizePreferences(): PersistedPreferences {
  try {
    // 1. Check legacy storage key and purge any apiKeys found in it
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY_SETTINGS);
    if (legacyRaw) {
      try {
        const parsedLegacy = JSON.parse(legacyRaw);
        if (parsedLegacy && typeof parsedLegacy === 'object') {
          // If the user previously had preferences under the legacy key, migrate safe fields only
          const migrated: PersistedPreferences = {
            activeProvider: parsedLegacy.activeProvider || DEFAULT_PREFERENCES.activeProvider,
            selectedModels: parsedLegacy.selectedModels || DEFAULT_PREFERENCES.selectedModels,
            customSystemPrompt: parsedLegacy.customSystemPrompt || DEFAULT_PREFERENCES.customSystemPrompt,
            temperature:
              typeof parsedLegacy.temperature === 'number'
                ? parsedLegacy.temperature
                : DEFAULT_PREFERENCES.temperature,
          };
          localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(migrated));
        }
      } catch {
        // ignore JSON parse errors
      }
      // Remove legacy key from disk entirely to prevent key remnants
      localStorage.removeItem(LEGACY_STORAGE_KEY_SETTINGS);
    }

    // 2. Load current preferences key and ensure no apiKeys are persisted
    const saved = localStorage.getItem(STORAGE_KEY_PREFERENCES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        // Sanitize: strip apiKeys if accidentally present
        if ('apiKeys' in parsed) {
          delete parsed.apiKeys;
          localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(parsed));
        }
        return {
          activeProvider: parsed.activeProvider || DEFAULT_PREFERENCES.activeProvider,
          selectedModels: parsed.selectedModels || DEFAULT_PREFERENCES.selectedModels,
          customSystemPrompt: parsed.customSystemPrompt || DEFAULT_PREFERENCES.customSystemPrompt,
          temperature:
            typeof parsed.temperature === 'number'
              ? parsed.temperature
              : DEFAULT_PREFERENCES.temperature,
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load preferences from storage:', e);
  }
  return DEFAULT_PREFERENCES;
}

export function App() {
  // 1. Projects State (persisted safely - projects contain no keys)
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROJECTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to load projects from storage:', e);
    }
    return [createInitialProject()];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const savedId = localStorage.getItem(STORAGE_KEY_ACTIVE_PROJECT);
    return savedId || projects[0]?.id || 'proj_default';
  });

  // Current active project
  const currentProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || createInitialProject();

  // 2. Non-secret Preferences State (persisted to localStorage)
  const [preferences, setPreferences] = useState<PersistedPreferences>(loadAndSanitizePreferences);

  // 3. Sensitive API Keys State (STRICTLY IN-MEMORY ONLY - NEVER WRITTEN TO DISK OR STORAGE)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  // Server health state
  const [hasServerGeminiKey, setHasServerGeminiKey] = useState(false);

  // 4. UI View States
  const [viewport, setViewport] = useState<ViewportMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info') => {
      setToast({ type, message });
      setTimeout(() => setToast(null), 5000);
    },
    []
  );

  // Sync projects to localStorage (projects contain only user designs, no API keys)
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PROJECT, activeProjectId);
  }, [activeProjectId]);

  // Sync ONLY safe non-secret preferences to localStorage
  useEffect(() => {
    const safePreferences: PersistedPreferences = {
      activeProvider: preferences.activeProvider,
      selectedModels: preferences.selectedModels,
      customSystemPrompt: preferences.customSystemPrompt,
      temperature: preferences.temperature,
    };
    localStorage.setItem(STORAGE_KEY_PREFERENCES, JSON.stringify(safePreferences));
  }, [preferences]);

  // Check backend server capabilities on mount
  useEffect(() => {
    checkServerHealth().then((health) => {
      setHasServerGeminiKey(Boolean(health.hasServerGeminiKey));
      // If server has Gemini key and user has not configured another provider, default to gemini
      if (health.hasServerGeminiKey && preferences.activeProvider === 'builtin') {
        setPreferences((prev) => ({ ...prev, activeProvider: 'gemini' }));
      }
    });
  }, []);

  // Update current project helper
  const updateProject = useCallback(
    (updater: (prev: Project) => Project) => {
      setProjects((all) =>
        all.map((p) => {
          if (p.id === activeProjectId) {
            return updater(p);
          }
          return p;
        })
      );
    },
    [activeProjectId]
  );

  // Code change from editor
  const handleCodeChange = (newCode: string) => {
    updateProject((p) => ({
      ...p,
      currentCode: newCode,
      updatedAt: Date.now(),
    }));
  };

  // Commit code version to history (strictly avoids storing any keys)
  const commitCodeVersion = (
    newCode: string,
    promptText: string,
    provider: string
  ) => {
    updateProject((p) => {
      const newHistoryItem = {
        id: 'h_' + Math.random().toString(36).substring(2, 9),
        prompt: promptText,
        code: newCode,
        timestamp: Date.now(),
        provider,
      };

      const updatedHistory = p.history
        .slice(0, p.historyIndex + 1)
        .concat(newHistoryItem);

      return {
        ...p,
        currentCode: newCode,
        prompt: promptText,
        history: updatedHistory,
        historyIndex: updatedHistory.length - 1,
        updatedAt: Date.now(),
      };
    });
  };

  // Undo / Redo
  const canUndo = currentProject.historyIndex > 0;
  const canRedo = currentProject.historyIndex < currentProject.history.length - 1;

  const handleUndo = () => {
    if (!canUndo) return;
    const targetIdx = currentProject.historyIndex - 1;
    const historyItem = currentProject.history[targetIdx];
    updateProject((p) => ({
      ...p,
      historyIndex: targetIdx,
      currentCode: historyItem.code,
      prompt: historyItem.prompt,
    }));
    showToast(`Reverted to: "${historyItem.prompt}"`, 'info');
  };

  const handleRedo = () => {
    if (!canRedo) return;
    const targetIdx = currentProject.historyIndex + 1;
    const historyItem = currentProject.history[targetIdx];
    updateProject((p) => ({
      ...p,
      historyIndex: targetIdx,
      currentCode: historyItem.code,
      prompt: historyItem.prompt,
    }));
    showToast(`Advanced to: "${historyItem.prompt}"`, 'info');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsTemplatesOpen(false);
        setIsExportOpen(false);
        setIsProjectDrawerOpen(false);
        if (isFullscreen) setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, isFullscreen]);

  // Project Management Actions
  const handleNewProject = () => {
    const newProj = createInitialProject();
    newProj.name = `New Project ${projects.length + 1}`;
    newProj.prompt = '';
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    showToast('New project created!', 'success');
  };

  const handleRenameProject = (newName: string) => {
    updateProject((p) => ({ ...p, name: newName }));
  };

  const handleDeleteProject = (id: string) => {
    const remaining = projects.filter((p) => p.id !== id);
    if (remaining.length === 0) {
      const fresh = createInitialProject();
      setProjects([fresh]);
      setActiveProjectId(fresh.id);
    } else {
      setProjects(remaining);
      if (activeProjectId === id) {
        setActiveProjectId(remaining[0].id);
      }
    }
    showToast('Project deleted', 'info');
  };

  const handleDuplicateProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    const duplicated: Project = {
      ...target,
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [duplicated, ...prev]);
    setActiveProjectId(duplicated.id);
    showToast(`Duplicated project as "${duplicated.name}"`, 'success');
  };

  // Load Template
  const handleSelectTemplate = (template: Template) => {
    updateProject((p) => ({
      ...p,
      name: template.name,
      prompt: template.description,
      stylePreset: template.stylePreset,
      currentCode: template.code,
      history: [
        ...p.history,
        {
          id: 'h_tpl_' + Date.now(),
          prompt: `Loaded template: ${template.name}`,
          code: template.code,
          timestamp: Date.now(),
          provider: 'template',
        },
      ],
      historyIndex: p.historyIndex + 1,
      updatedAt: Date.now(),
    }));
    showToast(`Loaded ${template.name}!`, 'success');
  };

  // Save Settings from Modal
  const handleSaveSettings = (
    newPreferences: PersistedPreferences,
    newInMemoryKeys: Record<string, string>
  ) => {
    setPreferences(newPreferences);
    setApiKeys(newInMemoryKeys);
    showToast('Settings updated! Keys stored in session memory.', 'success');
  };

  // Clear all in-memory keys
  const handleClearAllKeys = () => {
    setApiKeys({});
    showToast('All API keys cleared from application memory.', 'info');
  };

  // Full in-memory settings composite
  const combinedSettings: UserProviderSettings = {
    ...preferences,
    apiKeys,
  };

  // AI Generation Handler
  const handleGenerate = async (
    prompt: string,
    mode: 'new' | 'edit',
    stylePreset: StylePreset
  ) => {
    setIsGenerating(true);
    try {
      const response = await generateWebsite(
        prompt,
        combinedSettings,
        mode,
        currentProject.currentCode,
        stylePreset
      );

      commitCodeVersion(response.code, prompt, response.provider);

      if (response.fallbackNotice) {
        showToast(response.fallbackNotice, 'info');
      } else {
        showToast(
          mode === 'edit' ? 'Website successfully refined!' : 'New website generated!',
          'success'
        );
      }
    } catch (err: any) {
      console.error('Generation error status:', err?.message);
      const userMessage =
        err?.message?.includes('Failed to fetch')
          ? 'Unable to connect to generation server. Please verify the application server is running.'
          : (err?.message || 'Failed to generate website. Please check your prompt and provider settings.');
      showToast(userMessage, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeProviderConfig =
    PROVIDERS_CONFIG.find((p) => p.id === preferences.activeProvider) ||
    PROVIDERS_CONFIG[0];

  const hasKey =
    preferences.activeProvider === 'builtin' ||
    Boolean(apiKeys[preferences.activeProvider]) ||
    (preferences.activeProvider === 'gemini' && hasServerGeminiKey);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-16 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center space-x-2.5 max-w-md ${
              toast.type === 'success'
                ? 'bg-slate-900 border-emerald-500/60 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-slate-900 border-rose-500/60 text-rose-300'
                : 'bg-slate-900 border-indigo-500/60 text-indigo-300'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            )}
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      {!isFullscreen && (
        <Header
          currentProject={currentProject}
          onRenameProject={handleRenameProject}
          onNewProject={handleNewProject}
          onOpenProjectDrawer={() => setIsProjectDrawerOpen(true)}
          viewport={viewport}
          onChangeViewport={setViewport}
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          activeProvider={preferences.activeProvider}
          hasKeyForProvider={hasKey}
        />
      )}

      {/* Prompt Bar */}
      {!isFullscreen && (
        <PromptBar
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          hasExistingCode={Boolean(currentProject.currentCode)}
          currentStyle={currentProject.stylePreset}
          onChangeStyle={(style) => updateProject((p) => ({ ...p, stylePreset: style }))}
          activeProviderName={activeProviderConfig.name}
        />
      )}

      {/* Main Workspace (Preview, Split, or Code) */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Code Editor View */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div
            className={`h-full flex flex-col ${
              viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}
          >
            <CodeEditor
              code={currentProject.currentCode}
              onChangeCode={handleCodeChange}
              onApplyCode={(code) => commitCodeVersion(code, 'Manual code edit', 'user')}
            />
          </div>
        )}

        {/* Live Preview View */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`h-full flex flex-col ${
              viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}
          >
            <PreviewCanvas
              htmlCode={currentProject.currentCode}
              viewport={viewport}
              onChangeViewport={setViewport}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {/* Floating exit fullscreen button */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700 text-xs font-semibold shadow-xl backdrop-blur transition-all"
          >
            Exit Fullscreen (Esc)
          </button>
        )}
      </main>

      {/* Modals & Drawers */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        inMemoryKeys={apiKeys}
        onSave={handleSaveSettings}
        onClearAllKeys={handleClearAllKeys}
        hasServerGeminiKey={hasServerGeminiKey}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        htmlCode={currentProject.currentCode}
        projectName={currentProject.name}
      />

      <ProjectDrawer
        isOpen={isProjectDrawerOpen}
        onClose={() => setIsProjectDrawerOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onNewProject={handleNewProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
      />
    </div>
  );
}
export default App;
