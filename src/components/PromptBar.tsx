import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Send,
  Loader2,
  RefreshCw,
  Palette,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Info,
} from 'lucide-react';
import { StylePreset } from '../types';

interface PromptBarProps {
  initialPrompt?: string;
  projectId?: string;
  onGenerate: (prompt: string, mode: 'new' | 'edit', style: StylePreset) => Promise<void>;
  isGenerating: boolean;
  hasExistingCode: boolean;
  currentStyle: StylePreset;
  onChangeStyle: (style: StylePreset) => void;
  activeProviderName: string;
}

const STYLE_PRESETS: StylePreset[] = [
  'Modern SaaS',
  'Clean Minimal',
  'Dark Cyber',
  'Warm Editorial',
  'Bold Brutalist',
  'Glassmorphic',
];

const SUGGESTIONS = [
  'Add monthly/annual pricing comparison table with feature checklist',
  'Add interactive FAQ accordion with expandable answers',
  'Add testimonial cards with client avatars and star ratings',
  'Add newsletter subscription banner with email verification input',
  'Add responsive mobile navigation hamburger drawer with animations',
  'Add contact modal form with real-time field validation',
  'Enhance hero section with animated gradient background and badges',
];

export const PromptBar: React.FC<PromptBarProps> = ({
  initialPrompt = '',
  projectId,
  onGenerate,
  isGenerating,
  hasExistingCode,
  currentStyle,
  onChangeStyle,
  activeProviderName,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [mode, setMode] = useState<'new' | 'edit'>(hasExistingCode ? 'edit' : 'new');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync prompt and mode when active project changes
  useEffect(() => {
    setPrompt(initialPrompt || '');
    setValidationError(null);
  }, [projectId]);

  // Keep mode aligned if user has or clears code
  useEffect(() => {
    if (!hasExistingCode) {
      setMode('new');
    }
  }, [hasExistingCode]);

  // Core generation trigger: validates prompt and initiates website generation
  const executeGeneration = async (targetMode: 'new' | 'edit') => {
    if (isGenerating) return;

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      if (targetMode === 'edit') {
        setValidationError(
          'Please describe what you want to change, add, or polish in this website (e.g. "Add a pricing table with monthly/annual toggle").'
        );
      } else {
        setValidationError(
          'Please describe the website you want to build in the prompt field below, or click one of the suggested ideas, then click Create Site.'
        );
      }
      inputRef.current?.focus();
      return;
    }

    setValidationError(null);
    try {
      await onGenerate(trimmedPrompt, targetMode, currentStyle);
    } catch {
      // Parent component handles notification toasts
    }
  };

  // Handles clicking the "Create Site" button in the Generate Mode switcher
  const handleCreateSiteButtonClick = () => {
    setMode('new');
    if (prompt.trim()) {
      executeGeneration('new');
    } else {
      setValidationError(
        'Please enter a description of the website you want to build in the prompt field below (or select an idea), then click Create Site.'
      );
      inputRef.current?.focus();
    }
  };

  // Handles clicking the "Refine / Edit Current" button in the Generate Mode switcher
  const handleRefineModeButtonClick = () => {
    if (!hasExistingCode) {
      setValidationError(
        'No existing website to refine yet. First create a website using Create Site or choose a template from the Templates menu.'
      );
      return;
    }
    setMode('edit');
    if (prompt.trim()) {
      executeGeneration('edit');
    } else {
      setValidationError(
        'Refine mode active: Describe the changes or additions you want to make to the current website, then click Refine Site.'
      );
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeGeneration(mode);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    setValidationError(null);
    inputRef.current?.focus();
  };

  return (
    <div className="border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 z-20">
      <div className="max-w-6xl mx-auto space-y-2.5">
        {/* Top bar: Generate Mode switcher & Style Preset Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Generate Mode:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={handleCreateSiteButtonClick}
                title={prompt.trim() ? 'Generate a new website with current prompt' : 'Switch to Create Site mode'}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1 ${
                  mode === 'new'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3 h-3 text-indigo-200" />
                <span>Create Site</span>
              </button>
              <button
                type="button"
                onClick={handleRefineModeButtonClick}
                title={
                  !hasExistingCode
                    ? 'Generate or load a site first to refine it'
                    : prompt.trim()
                    ? 'Apply changes to current website'
                    : 'Switch to Refine mode'
                }
                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center space-x-1 ${
                  mode === 'edit'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : hasExistingCode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Wand2 className="w-3 h-3 text-purple-200" />
                <span>Refine / Edit Current</span>
              </button>
            </div>

            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">
              Engine: <span className="text-indigo-400 font-semibold">{activeProviderName}</span>
            </span>
          </div>

          {/* Style Selector */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-medium mr-1 hidden sm:inline">Style:</span>
            {STYLE_PRESETS.map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onChangeStyle(style)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                  currentStyle === style
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-300 border border-slate-700/50'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            {mode === 'edit' ? (
              <Wand2 className="w-4 h-4 text-purple-400 animate-pulse" />
            ) : (
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            )}
          </div>
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (validationError) setValidationError(null);
            }}
            disabled={isGenerating}
            placeholder={
              mode === 'edit'
                ? "Describe what you want to change, add, or polish in this website (e.g. 'Add a pricing table with monthly/annual toggle')..."
                : "Describe the website or web app you want to build (e.g. 'Create a modern AI productivity SaaS landing page with interactive demo')..."
            }
            className={`w-full bg-slate-800/90 text-white placeholder-slate-400 pl-10 pr-32 py-2.5 rounded-xl border text-sm transition-all shadow-inner ${
              validationError
                ? 'border-amber-500/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400'
                : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            } focus:outline-none`}
          />
          <div className="absolute right-2 flex items-center space-x-1.5">
            <button
              type="submit"
              disabled={isGenerating}
              title={
                !prompt.trim()
                  ? 'Click to validate and build website'
                  : mode === 'edit'
                  ? 'Refine current website'
                  : 'Create website'
              }
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all ${
                isGenerating
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : mode === 'edit'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 active:scale-95'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'edit' ? 'Refine Site' : 'Create Site'}</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Validation / Guidance Banner */}
        {validationError && (
          <div className="flex items-center justify-between bg-amber-950/60 border border-amber-500/40 text-amber-200 px-3 py-2 rounded-lg text-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="ml-3 text-amber-400 hover:text-amber-100 font-semibold text-[11px] px-1.5 py-0.5 rounded hover:bg-amber-900/60 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Suggestion Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          <span className="text-slate-500 font-medium whitespace-nowrap">Ideas:</span>
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(s)}
              className="px-2.5 py-1 rounded-md bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-600 whitespace-nowrap transition-colors flex items-center space-x-1"
            >
              <span className="text-indigo-400">+</span>
              <span className="truncate max-w-[200px] sm:max-w-none">{s}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
