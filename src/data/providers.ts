import { ProviderConfig } from '../types';

export const PROVIDERS_CONFIG: ProviderConfig[] = [
  {
    id: 'builtin',
    name: 'Built-in AI Synthesizer',
    description: 'Zero setup required. Procedural component synthesis tailored for modern web apps.',
    models: [
      { id: 'smart-synthesizer-v3', label: 'Synthesizer v3 (Default)', recommended: true },
      { id: 'rapid-prototype', label: 'Rapid Wireframer' },
    ],
    defaultModel: 'smart-synthesizer-v3',
    requiresKey: false,
    popular: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: "Google's next-gen multimodal reasoning models with high speed and large context windows.",
    models: [
      { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (Recommended)', recommended: true },
      { id: 'gemini-4-argon', label: 'Gemini 4 Argon (Deep Reasoning)' },
      { id: 'gemini-flash-latest', label: 'Gemini Flash Latest' },
    ],
    defaultModel: 'gemini-3.8-flash',
    requiresKey: false, // Can use server-side key if available, or user key
    keyUrl: 'https://aistudio.google.com/app/apikey',
    popular: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Industry-standard GPT models with high fidelity web layouts and code output.',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o (High Intelligence)', recommended: true },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost Efficient)' },
      { id: 'o1-mini', label: 'o1 Mini (Reasoning)' },
    ],
    defaultModel: 'gpt-4o',
    requiresKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
    popular: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'State-of-the-art frontend code generation with exceptional aesthetic discernment.',
    models: [
      { id: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet', recommended: true },
      { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    ],
    defaultModel: 'claude-3-7-sonnet-20250219',
    requiresKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys',
    popular: true,
  },
  {
    id: 'groq',
    name: 'Groq (LPU)',
    description: 'Ultra-fast inference engine delivering instantaneous tokens per second.',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile', recommended: true },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
    ],
    defaultModel: 'llama-3.3-70b-versatile',
    requiresKey: true,
    keyUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'DeepSeek models with outstanding code architecture and competitive pricing.',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek-V3 Chat', recommended: true },
      { id: 'deepseek-reasoner', label: 'DeepSeek-R1 Reasoner' },
    ],
    defaultModel: 'deepseek-chat',
    requiresKey: true,
    keyUrl: 'https://platform.deepseek.com/api_keys',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Universal unified gateway to 200+ AI models through a single API key.',
    models: [
      { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet (via OR)', recommended: true },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
      { id: 'openai/gpt-4o', label: 'GPT-4o' },
      { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ],
    defaultModel: 'anthropic/claude-3.5-sonnet',
    requiresKey: true,
    keyUrl: 'https://openrouter.ai/keys',
  },
];
