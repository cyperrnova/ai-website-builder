import React, { useState } from 'react';
import {
  X,
  Key,
  Check,
  ExternalLink,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AIProviderId, UserProviderSettings } from '../types';
import { PROVIDERS_CONFIG } from '../data/providers';
import { testProviderConnection } from '../services/api';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserProviderSettings;
  onSaveSettings: (settings: UserProviderSettings) => void;
  hasServerGeminiKey: boolean;
}

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  hasServerGeminiKey,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<AIProviderId>(settings.activeProvider);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({ ...settings.apiKeys });
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({
    ...settings.selectedModels,
  });
  const [temperature, setTemperature] = useState(settings.temperature);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Testing state
  const [testingStatus, setTestingStatus] = useState<{
    loading: boolean;
    success?: boolean;
    latency?: number;
    error?: string;
  }>({ loading: false });

  const currentProviderConfig =
    PROVIDERS_CONFIG.find((p) => p.id === activeTab) || PROVIDERS_CONFIG[0];

  const handleKeyChange = (providerId: string, val: string) => {
    setApiKeys((prev) => ({ ...prev, [providerId]: val }));
    setTestingStatus({ loading: false });
  };

  const handleModelChange = (providerId: string, modelId: string) => {
    setSelectedModels((prev) => ({ ...prev, [providerId]: modelId }));
  };

  const handleTestConnection = async () => {
    setTestingStatus({ loading: true });
    try {
      const key = apiKeys[activeTab] || '';
      const model = selectedModels[activeTab] || currentProviderConfig.defaultModel;
      const res = await testProviderConnection(activeTab, key, model);

      if (res.success) {
        setTestingStatus({
          loading: false,
          success: true,
          latency: res.latencyMs,
        });
      } else {
        setTestingStatus({
          loading: false,
          success: false,
          error: res.error || 'Failed to connect',
        });
      }
    } catch (err: any) {
      setTestingStatus({
        loading: false,
        success: false,
        error: err.message || 'Connection test error',
      });
    }
  };

  const handleSave = () => {
    onSaveSettings({
      activeProvider: activeTab,
      apiKeys,
      selectedModels,
      customSystemPrompt: settings.customSystemPrompt,
      temperature,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">AI Provider & API Key Settings</h2>
              <p className="text-xs text-slate-400">Choose your AI engine and control your own API credentials.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Provider Tabs Sidebar */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/40 p-3 space-y-1 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 block">
              AI Providers
            </span>
            {PROVIDERS_CONFIG.map((p) => {
              const isSelected = activeTab === p.id;
              const hasKey = p.id === 'builtin' || Boolean(apiKeys[p.id]) || (p.id === 'gemini' && hasServerGeminiKey);
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveTab(p.id);
                    setTestingStatus({ loading: false });
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <span>{p.name}</span>
                  </div>
                  {hasKey ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" title="Key ready" />
                  ) : (
                    <span className="text-[10px] text-amber-400 font-mono">Setup</span>
                  )}
                </button>
              );
            })}

            <div className="pt-3 border-t border-slate-800/80 mt-2 px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Creativity
              </span>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Temp</span>
                <span className="font-mono text-white">{temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg"
              />
            </div>
          </div>

          {/* Provider Config Details */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{currentProviderConfig.name}</h3>
                {currentProviderConfig.keyUrl && (
                  <a
                    href={currentProviderConfig.keyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <span>Get API Key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">{currentProviderConfig.description}</p>
            </div>

            {/* Model Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Selected Model
              </label>
              <select
                value={
                  selectedModels[activeTab] || currentProviderConfig.defaultModel
                }
                onChange={(e) => handleModelChange(activeTab, e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-indigo-500"
              >
                {currentProviderConfig.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} {m.recommended ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* API Key Input */}
            {currentProviderConfig.requiresKey && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    API Key
                  </label>
                  <span className="text-[11px] text-slate-500">Stored locally in your browser</span>
                </div>
                <div className="relative">
                  <input
                    type={showKey[activeTab] ? 'text' : 'password'}
                    value={apiKeys[activeTab] || ''}
                    onChange={(e) => handleKeyChange(activeTab, e.target.value)}
                    placeholder={`Enter your ${currentProviderConfig.name} API key...`}
                    className="w-full px-3 py-2 pr-20 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowKey((prev) => ({ ...prev, [activeTab]: !prev[activeTab] }))
                    }
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {showKey[activeTab] ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {activeTab === 'gemini' && hasServerGeminiKey && !apiKeys['gemini'] && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Server default key is active. Custom key optional.</span>
                  </p>
                )}
              </div>
            )}

            {activeTab === 'builtin' && (
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                <p className="font-semibold text-white">✨ Plug & Play Out of the Box</p>
                <p>
                  No API key required. Synthesizes bespoke HTML5, responsive Tailwind grids, and interactive JavaScript components directly in your browser.
                </p>
              </div>
            )}

            {/* Connection Test */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingStatus.loading}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors flex items-center space-x-2"
              >
                {testingStatus.loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Pinging API...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Test Connection & Latency</span>
                  </>
                )}
              </button>

              {testingStatus.success && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center space-x-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connection healthy! Latency: {testingStatus.latency} ms</span>
                </div>
              )}

              {testingStatus.error && (
                <div className="mt-2 text-xs text-rose-400 flex items-center space-x-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{testingStatus.error}</span>
                </div>
              )}
            </div>

            {/* Privacy note */}
            <div className="pt-4 border-t border-slate-800 flex items-start space-x-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span>
                Your API keys are never persisted to external databases or tracked. Requests are proxied securely to the AI provider.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Active Provider: <span className="font-semibold text-white">{currentProviderConfig.name}</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-102"
            >
              Save & Activate Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
