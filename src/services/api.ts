import { AIProviderId, UserProviderSettings } from '../types';

export interface GenerateRequest {
  provider: AIProviderId;
  apiKey?: string;
  model?: string;
  prompt: string;
  mode: 'new' | 'edit';
  currentCode?: string;
  stylePreset?: string;
  temperature?: number;
}

export interface GenerateResponse {
  code: string;
  provider: string;
  model: string;
  fallbackNotice?: string;
}

export async function checkServerHealth() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch (err) {
    return { status: 'offline', hasServerGeminiKey: false };
  }
}

export async function testProviderConnection(
  provider: AIProviderId,
  apiKey: string,
  model?: string
) {
  const res = await fetch('/api/providers/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey, model }),
  });
  return await res.json();
}

export async function generateWebsite(
  prompt: string,
  settings: UserProviderSettings,
  mode: 'new' | 'edit' = 'new',
  currentCode: string = '',
  stylePreset: string = 'Modern SaaS'
): Promise<GenerateResponse> {
  const provider = settings.activeProvider;
  const apiKey = settings.apiKeys[provider] || '';
  const model = settings.selectedModels[provider];

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      apiKey,
      model,
      prompt,
      mode,
      currentCode,
      stylePreset,
      temperature: settings.temperature,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
    throw new Error(err.error || `HTTP error ${res.status}`);
  }

  return await res.json();
}
