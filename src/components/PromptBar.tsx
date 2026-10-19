import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Send,
  Loader2,
  RefreshCw,
  Palette,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { StylePreset } from '../types';

interface PromptBarProps {
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
  onGenerate,
  isGenerating,
  hasExistingCode,
  currentStyle,
  onChangeStyle,
  activeProviderName,
}) => {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'new' | 'edit'>(hasExistingCode ? 'edit' : 'new');

  // Keep mode aligned if user has or clears code
  React.useEffect(() => {
    if (!hasExistingCode) {
      setMode('new');
    }
  }, [hasExistingCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;
    await onGenerate(prompt.trim(), mode, currentStyle);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    if (hasExistingCode) {
      setMode('edit');
    }
  };

  return (
    <div className="border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 z-20">
      <div className="max-w-6xl mx-auto space-y-2.5">
        {/* Top bar: Mode switcher & Style Preset Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-slate-400 font-medium">Generation Mode:</span>
            <div className="inline-flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  mode === 'new'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create New Site
              </button>
              <button
                type="button"
                onClick={() => setMode('edit')}
                disabled={!hasExistingCode}
                title={!hasExistingCode ? 'Generate a site first to edit it' : 'Refine the current website'}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  mode === 'edit'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : hasExistingCode
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                Refine / Edit Current
              </button>
            </div>

            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-400 hidden sm:inline">Engine: <span className="text-indigo-400 font-semibold">{activeProviderName}</span></span>
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
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            placeholder={
              mode === 'edit'
                ? "Describe what you want to change, add, or polish in this website (e.g. 'Add a pricing table with monthly/annual toggle')..."
                : "Describe the website or web app you want to build (e.g. 'Create a modern AI productivity SaaS landing page with interactive demo')..."
            }
            className="w-full bg-slate-800/90 text-white placeholder-slate-400 pl-10 pr-28 py-2.5 rounded-xl border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none text-sm transition-all shadow-inner"
          />
          <div className="absolute right-2 flex items-center space-x-1.5">
            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all ${
                !prompt.trim() || isGenerating
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : mode === 'edit'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'edit' ? 'Update' : 'Generate'}</span>
                  <Send className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </form>

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
