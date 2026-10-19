export type AIProviderId = 'builtin' | 'gemini' | 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'openrouter';

export interface ProviderConfig {
  id: AIProviderId;
  name: string;
  description: string;
  models: { id: string; label: string; recommended?: boolean }[];
  defaultModel: string;
  requiresKey: boolean;
  keyUrl?: string;
  popular?: boolean;
}

/**
 * Non-secret preferences that are safe to persist in browser localStorage.
 * API keys are strictly excluded from this interface and must never be stored on disk.
 */
export interface PersistedPreferences {
  activeProvider: AIProviderId;
  selectedModels: Record<string, string>;
  customSystemPrompt: string;
  temperature: number;
}

/**
 * Full settings representation in active memory.
 * apiKeys is held in React state / RAM only and wiped on page refresh or explicit clearing.
 */
export interface UserProviderSettings extends PersistedPreferences {
  apiKeys: Record<string, string>;
}

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';
export type ViewMode = 'preview' | 'split' | 'code';
export type StylePreset = 'Modern SaaS' | 'Clean Minimal' | 'Dark Cyber' | 'Warm Editorial' | 'Bold Brutalist' | 'Glassmorphic';

export interface HistoryItem {
  id: string;
  prompt: string;
  code: string;
  timestamp: number;
  provider: string;
}

export interface Project {
  id: string;
  name: string;
  prompt: string;
  stylePreset: StylePreset;
  currentCode: string;
  history: HistoryItem[];
  historyIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  stylePreset: StylePreset;
  thumbnailGradient: string;
  code: string;
}
