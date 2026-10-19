import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const IS_PROD = process.env.NODE_ENV === 'production';

// ============================================================================
// 1. SECURITY & CORS CONFIGURATION
// ============================================================================

// Parse allowed origins from environment variable
const envAllowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Development default origins
const devDefaultOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://0.0.0.0:3000',
];

const allowedOriginsSet = new Set<string>([
  ...(!IS_PROD ? devDefaultOrigins : []),
  ...envAllowedOrigins,
]);

/**
 * Validates whether an incoming Origin header is allowed.
 * Note: Same-origin / direct navigation requests where Origin is undefined are allowed.
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Same-origin request or tools without Origin header
  return allowedOriginsSet.has(origin);
}

// Configurable CORS & Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  // Set essential security headers on all responses
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (origin) {
    if (isOriginAllowed(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
    } else {
      // In production, block unauthorized cross-origin requests
      if (req.method === 'OPTIONS') {
        return res.status(403).json({ error: 'CORS origin not allowed' });
      }
    }
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Enforce strict request body size limit (1MB max, preventing payload-based DoS)
app.use(express.json({ limit: '1mb' }));

// ============================================================================
// 2. IN-MEMORY RATE LIMITING & SERVER-COST PROTECTION
// ============================================================================

interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message: string;
}

class SlidingWindowRateLimiter {
  private records = new Map<string, number[]>();
  private windowMs: number;
  private maxRequests: number;
  private message: string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message = options.message;

    // Periodic memory cleanup every 5 minutes to prevent memory leaks
    setInterval(() => this.cleanup(), 5 * 60 * 1000).unref();
  }

  public check(ip: string): { allowed: boolean; remaining: number; resetTimeMs: number; message?: string } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.records.get(ip) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTimeMs: timestamps[0] + this.windowMs,
        message: this.message,
      };
    }

    timestamps.push(now);
    this.records.set(ip, timestamps);

    return {
      allowed: true,
      remaining: this.maxRequests - timestamps.length,
      resetTimeMs: now + this.windowMs,
    };
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [ip, timestamps] of this.records.entries()) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.records.delete(ip);
      } else {
        this.records.set(ip, active);
      }
    }
  }
}

// 1. General generation rate limiter: 30 requests per minute per IP
const generalGenerateLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many generation requests. Please slow down and try again in a minute.',
});

// 2. Server Gemini Quota protection: 5 requests per 5 minutes per IP for anonymous requests using server key
const serverGeminiQuotaLimiter = new SlidingWindowRateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
  message:
    'Shared server Gemini quota limit reached (5 requests per 5 minutes). To continue generating without shared quota restrictions, please provide your own Gemini API key in Provider Settings.',
});

// 3. Provider connection test rate limiter: 15 requests per minute per IP
const providerTestLimiter = new SlidingWindowRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 15,
  message: 'Too many provider test requests. Please wait a minute before testing again.',
});

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// ============================================================================
// 3. SANITIZATION & LOGGING UTILITIES
// ============================================================================

// Regex pattern to scrub any API key or token substrings from messages
const SENSITIVE_KEY_PATTERN = /(?:AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9_-]{20,}|gsk_[a-zA-Z0-9_-]{20,}|Bearer\s+[a-zA-Z0-9._-]+)/gi;

function sanitizeErrorMessage(msg: string): string {
  if (!msg || typeof msg !== 'string') return 'An error occurred';
  return msg.replace(SENSITIVE_KEY_PATTERN, '[REDACTED_CREDENTIAL]');
}

function safeLog(context: string, data: Record<string, any>) {
  const sanitizedData: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
      sanitizedData[key] = val ? '[REDACTED]' : undefined;
    } else if (typeof val === 'string') {
      sanitizedData[key] = sanitizeErrorMessage(val);
    } else {
      sanitizedData[key] = val;
    }
  }
  console.error(`[AI Website Builder - ${context}]`, JSON.stringify(sanitizedData));
}

// ============================================================================
// 4. STRICT REQUEST VALIDATORS
// ============================================================================

const ALLOWED_PROVIDERS = [
  'builtin',
  'gemini',
  'openai',
  'anthropic',
  'groq',
  'deepseek',
  'openrouter',
] as const;

type AllowedProvider = (typeof ALLOWED_PROVIDERS)[number];

const SAFE_MODEL_REGEX = /^[a-zA-Z0-9._:\-\/]{1,100}$/;
const PRINTABLE_ASCII_REGEX = /^[\x20-\x7E]+$/;

function validateProviderTestRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  // Reject unexpected properties to prevent prototype pollution or parameter smuggling
  const allowedFields = new Set(['provider', 'apiKey', 'model']);
  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      return { valid: false, error: `Unrecognized request field: ${key}` };
    }
  }

  if (!body.provider || typeof body.provider !== 'string' || !ALLOWED_PROVIDERS.includes(body.provider as any)) {
    return { valid: false, error: `Invalid provider. Must be one of: ${ALLOWED_PROVIDERS.join(', ')}` };
  }

  if (body.apiKey !== undefined && body.apiKey !== null) {
    if (typeof body.apiKey !== 'string' || body.apiKey.length > 512 || (body.apiKey && !PRINTABLE_ASCII_REGEX.test(body.apiKey))) {
      return { valid: false, error: 'Invalid API key format' };
    }
  }

  if (body.model !== undefined && body.model !== null) {
    if (typeof body.model !== 'string' || !SAFE_MODEL_REGEX.test(body.model)) {
      return { valid: false, error: 'Invalid model identifier format' };
    }
  }

  return { valid: true };
}

function validateGenerateRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const allowedFields = new Set([
    'provider',
    'apiKey',
    'model',
    'prompt',
    'mode',
    'currentCode',
    'stylePreset',
    'temperature',
    'allowFallback',
  ]);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      return { valid: false, error: `Unrecognized request field: ${key}` };
    }
  }

  // 1. Provider
  const provider = body.provider || 'builtin';
  if (typeof provider !== 'string' || !ALLOWED_PROVIDERS.includes(provider as any)) {
    return { valid: false, error: `Invalid provider. Must be one of: ${ALLOWED_PROVIDERS.join(', ')}` };
  }

  // 2. Prompt
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return { valid: false, error: 'A non-empty prompt string is required' };
  }
  if (body.prompt.length > 4000) {
    return { valid: false, error: 'Prompt exceeds maximum length of 4000 characters' };
  }

  // 3. Mode
  if (body.mode !== undefined && body.mode !== 'new' && body.mode !== 'edit') {
    return { valid: false, error: "Mode must be 'new' or 'edit'" };
  }

  // 4. Current code (for edits)
  if (body.currentCode !== undefined && body.currentCode !== null) {
    if (typeof body.currentCode !== 'string') {
      return { valid: false, error: 'currentCode must be a string' };
    }
    if (body.currentCode.length > 500000) {
      return { valid: false, error: 'currentCode exceeds maximum size of 500,000 characters' };
    }
  }

  // 5. API key
  if (body.apiKey !== undefined && body.apiKey !== null) {
    if (typeof body.apiKey !== 'string' || body.apiKey.length > 512 || (body.apiKey && !PRINTABLE_ASCII_REGEX.test(body.apiKey))) {
      return { valid: false, error: 'Invalid API key format' };
    }
  }

  // 6. Model
  if (body.model !== undefined && body.model !== null) {
    if (typeof body.model !== 'string' || !SAFE_MODEL_REGEX.test(body.model)) {
      return { valid: false, error: 'Invalid model identifier format' };
    }
  }

  // 7. Temperature
  if (body.temperature !== undefined && body.temperature !== null) {
    if (typeof body.temperature !== 'number' || isNaN(body.temperature) || body.temperature < 0.0 || body.temperature > 1.0) {
      return { valid: false, error: 'Temperature must be a number between 0.0 and 1.0' };
    }
  }

  // 8. Style preset
  if (body.stylePreset !== undefined && body.stylePreset !== null) {
    if (typeof body.stylePreset !== 'string' || body.stylePreset.length > 50) {
      return { valid: false, error: 'stylePreset must be a string under 50 characters' };
    }
  }

  // 9. Allow Fallback
  if (body.allowFallback !== undefined && typeof body.allowFallback !== 'boolean') {
    return { valid: false, error: 'allowFallback must be a boolean' };
  }

  return { valid: true };
}

// ============================================================================
// 5. API ENDPOINTS
// ============================================================================

// Health check endpoint (never exposes secrets or keys)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasServerGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: 'gemini-3.8-flash',
    supportedProviders: [
      { id: 'builtin', name: 'Built-in AI Synthesizer', requiresKey: false, popular: true },
      { id: 'gemini', name: 'Google Gemini', requiresKey: !process.env.GEMINI_API_KEY, popular: true },
      { id: 'openai', name: 'OpenAI', requiresKey: true },
      { id: 'anthropic', name: 'Anthropic Claude', requiresKey: true },
      { id: 'groq', name: 'Groq (Ultra-Fast)', requiresKey: true },
      { id: 'deepseek', name: 'DeepSeek', requiresKey: true },
      { id: 'openrouter', name: 'OpenRouter', requiresKey: true },
    ],
  });
});

// Test provider connection
app.post('/api/providers/test', async (req: Request, res: Response) => {
  // 1. Rate limiting
  const ip = getClientIp(req);
  const rateCheck = providerTestLimiter.check(ip);
  if (!rateCheck.allowed) {
    return res.status(429).json({ success: false, error: rateCheck.message });
  }

  // 2. Strict validation
  const validation = validateProviderTestRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const { provider, apiKey, model } = req.body;

  try {
    const startTime = Date.now();

    if (provider === 'builtin') {
      return res.json({ success: true, latencyMs: 12, message: 'Built-in engine ready!' });
    }

    const keyToUse = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : '');
    if (!keyToUse) {
      return res.status(400).json({ success: false, error: `Missing API key for ${provider}` });
    }

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const targetModel = model || 'gemini-3.8-flash';
      const testResult = await ai.models.generateContent({
        model: targetModel,
        contents: 'Ping test. Reply with pong in 1 word.',
      });
      const latency = Date.now() - startTime;
      return res.json({ success: true, latencyMs: latency, reply: testResult.text?.trim() });
    }

    if (provider === 'openai' || provider === 'groq' || provider === 'deepseek' || provider === 'openrouter') {
      const endpoints: Record<string, string> = {
        openai: 'https://api.openai.com/v1/chat/completions',
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        deepseek: 'https://api.deepseek.com/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      };
      const defaultModels: Record<string, string> = {
        openai: 'gpt-4o-mini',
        groq: 'llama-3.3-70b-versatile',
        deepseek: 'deepseek-chat',
        openrouter: 'meta-llama/llama-3.3-70b-instruct',
      };

      const response = await fetch(endpoints[provider], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
        },
        body: JSON.stringify({
          model: model || defaultModels[provider],
          messages: [{ role: 'user', content: 'Ping test. Reply with pong in 1 word.' }],
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        let safeMsg = `Provider returned HTTP ${status}`;
        if (status === 401 || status === 403) {
          safeMsg = `Authentication failed for ${provider}. Please verify your API key.`;
        } else if (status === 429) {
          safeMsg = `Rate limit or quota exceeded with ${provider}.`;
        }
        return res.status(status).json({ success: false, error: safeMsg });
      }

      const latency = Date.now() - startTime;
      return res.json({ success: true, latencyMs: latency, message: 'Connection successful!' });
    }

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToUse,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-5-haiku-20241022',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Ping test. Reply with pong in 1 word.' }],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        let safeMsg = `Anthropic returned HTTP ${status}`;
        if (status === 401 || status === 403) {
          safeMsg = 'Authentication failed for Anthropic. Please verify your API key.';
        } else if (status === 429) {
          safeMsg = 'Rate limit or quota exceeded with Anthropic.';
        }
        return res.status(status).json({ success: false, error: safeMsg });
      }

      const latency = Date.now() - startTime;
      return res.json({ success: true, latencyMs: latency, message: 'Connection successful!' });
    }

    return res.status(400).json({ success: false, error: 'Unsupported provider' });
  } catch (error: any) {
    safeLog('ProviderTestError', { provider, message: error?.message });
    return res.status(500).json({ success: false, error: 'Unable to connect to provider. Please check network and credentials.' });
  }
});

// System prompt helper for website generation
function buildSystemPrompt(style: string = 'Modern Clean') {
  return `You are an elite, world-class Lead Frontend Engineer and Web Designer.
Your task is to generate complete, single-file, production-ready, beautiful websites or web applications based on the user's prompt.

REQUIREMENTS FOR CODE OUTPUT:
1. Output MUST be a complete, self-contained HTML document starting with <!DOCTYPE html> and ending with </html>.
2. Include Tailwind CSS CDN via <script src="https://cdn.tailwindcss.com"></script> and Lucide icons script (<script src="https://unpkg.com/lucide@latest"></script>) or SVG icons directly.
3. Include Google Fonts (e.g. Plus Jakarta Sans or Inter) for polished typography.
4. Add rich, clean, responsive UI with interactive JavaScript (e.g. mobile navigation drawer toggle, pricing billing toggles, interactive tabs, modal previews, FAQ accordions, testimonial sliders, interactive filterable cards, contact form submit animations, search bars).
5. The visual design must be high-fidelity:
   - Modern color palette (matching the requested style: ${style})
   - Smooth hover effects, subtle borders, card glows, modern shadows
   - Cohesive hero section with call-to-actions, features grid, social proof/metrics, pricing or showcase, testimonials, FAQ, and footer.
6. For multi-page requests, implement a seamless multi-view page switcher using JavaScript tabs or route hash so clicking navigation items ("Home", "Features", "Pricing", "About", "Contact") changes views smoothly inside the preview!
7. CRITICAL: Return ONLY the code inside standard markdown \`\`\`html ... \`\`\` block or pure HTML. No conversational fluff or meta-commentary outside the code.`;
}

// AI Code Generation endpoint
app.post('/api/generate', async (req: Request, res: Response) => {
  // 1. General rate limiting
  const ip = getClientIp(req);
  const generalCheck = generalGenerateLimiter.check(ip);
  if (!generalCheck.allowed) {
    return res.status(429).json({ error: generalCheck.message });
  }

  // 2. Strict request validation
  const validation = validateGenerateRequest(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const {
    provider = 'builtin',
    apiKey,
    model,
    prompt,
    mode = 'new',
    currentCode = '',
    stylePreset = 'Modern SaaS',
    temperature = 0.7,
    allowFallback = true,
  } = req.body;

  // 3. Server-cost protection: If using shared server-side Gemini key without user-supplied key
  const isUsingSharedServerKey = provider === 'gemini' && !apiKey && Boolean(process.env.GEMINI_API_KEY);
  if (isUsingSharedServerKey) {
    const serverKeyCheck = serverGeminiQuotaLimiter.check(ip);
    if (!serverKeyCheck.allowed) {
      return res.status(429).json({ error: serverKeyCheck.message });
    }
  }

  try {
    const keyToUse = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : '');

    // If provider is builtin or no keys configured for gemini, use built-in generator
    if (provider === 'builtin' || (!keyToUse && provider === 'gemini' && !process.env.GEMINI_API_KEY)) {
      const generated = generateProceduralWebsite(prompt, stylePreset, mode, currentCode);
      return res.json({
        code: generated.code,
        provider: 'builtin',
        model: 'Built-in AI Synthesizer',
        promptTokens: Math.round(prompt.length / 3),
        completionTokens: Math.round(generated.code.length / 4),
      });
    }

    // If external provider is requested without an API key, use fallback or return clear error
    if (!keyToUse && provider !== 'builtin') {
      if (allowFallback) {
        const generated = generateProceduralWebsite(prompt, stylePreset, mode, currentCode);
        return res.json({
          code: generated.code,
          provider: 'builtin',
          model: 'Built-in AI Synthesizer (Fallback)',
          fallbackNotice: `Notice: ${provider} requires an API key. Generated using Built-in AI Synthesizer so your progress is preserved. You can add your key in Provider Settings anytime.`,
          promptTokens: Math.round(prompt.length / 3),
          completionTokens: Math.round(generated.code.length / 4),
        });
      } else {
        return res.status(400).json({
          error: `Provider ${provider} requires an API key. Please add your key in Provider Settings or switch to Built-in AI Synthesizer.`,
        });
      }
    }

    const systemInstruction = buildSystemPrompt(stylePreset);
    let fullPrompt = '';

    if (mode === 'edit' && currentCode) {
      fullPrompt = `Here is the current website code:
\`\`\`html
${currentCode.slice(0, 18000)}
\`\`\`

USER REQUEST FOR MODIFICATION:
${prompt}

Please apply the requested changes, refine the code, preserve working functionality, and output the entire updated <!DOCTYPE html> ... </html> code.`;
    } else {
      fullPrompt = `Generate a modern, fully functional website for:
"${prompt}"

Design aesthetic: ${stylePreset}.
Include rich interactive sections, mobile responsiveness, polished typography, and working client-side interactions.`;
    }

    let generatedCode = '';

    if (provider === 'gemini') {
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const targetModel = model || 'gemini-3.8-flash';

      const response = await ai.models.generateContent({
        model: targetModel,
        contents: [
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${fullPrompt}` }] },
        ],
        config: {
          temperature: Number(temperature) || 0.7,
        },
      });

      generatedCode = response.text || '';
    } else if (provider === 'openai' || provider === 'groq' || provider === 'deepseek' || provider === 'openrouter') {
      const endpoints: Record<string, string> = {
        openai: 'https://api.openai.com/v1/chat/completions',
        groq: 'https://api.groq.com/openai/v1/chat/completions',
        deepseek: 'https://api.deepseek.com/chat/completions',
        openrouter: 'https://openrouter.ai/api/v1/chat/completions',
      };
      const defaultModels: Record<string, string> = {
        openai: 'gpt-4o',
        groq: 'llama-3.3-70b-versatile',
        deepseek: 'deepseek-chat',
        openrouter: 'anthropic/claude-3.5-sonnet',
      };

      const response = await fetch(endpoints[provider], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
        },
        body: JSON.stringify({
          model: model || defaultModels[provider],
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: fullPrompt },
          ],
          temperature: Number(temperature) || 0.7,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        let safeMsg = `Provider error (${status})`;
        if (status === 401 || status === 403) {
          safeMsg = `Authentication failed for ${provider}. Please verify your API key.`;
        } else if (status === 429) {
          safeMsg = `Rate limit or quota exceeded for ${provider}.`;
        }
        throw new Error(safeMsg);
      }

      const data = await response.json();
      generatedCode = data.choices?.[0]?.message?.content || '';
    } else if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': keyToUse,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-7-sonnet-20250219',
          max_tokens: 8000,
          system: systemInstruction,
          messages: [{ role: 'user', content: fullPrompt }],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        let safeMsg = `Anthropic error (${status})`;
        if (status === 401 || status === 403) {
          safeMsg = 'Authentication failed for Anthropic. Please verify your API key.';
        } else if (status === 429) {
          safeMsg = 'Rate limit or quota exceeded for Anthropic.';
        }
        throw new Error(safeMsg);
      }

      const data = await response.json();
      generatedCode = data.content?.[0]?.text || '';
    }

    // Clean up code block formatting
    let cleanedCode = generatedCode.trim();
    if (cleanedCode.includes('```html')) {
      const match = cleanedCode.match(/```html\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        cleanedCode = match[1];
      }
    } else if (cleanedCode.includes('```')) {
      const match = cleanedCode.match(/```\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        cleanedCode = match[1];
      }
    }

    if (!cleanedCode.toLowerCase().includes('<!doctype html>') && !cleanedCode.toLowerCase().includes('<html')) {
      cleanedCode = `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Generated Web App</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body>\n${cleanedCode}\n</body>\n</html>`;
    }

    return res.json({
      code: cleanedCode,
      provider,
      model: model || 'default',
    });
  } catch (error: any) {
    const safeErrorMsg = sanitizeErrorMessage(error?.message || 'Generation failed');
    safeLog('GenerationFailure', { provider, error: safeErrorMsg });

    // Handle fallback gracefully and inform user explicitly
    if (allowFallback) {
      const generated = generateProceduralWebsite(prompt, stylePreset, mode, currentCode);
      return res.json({
        code: generated.code,
        provider: 'builtin',
        model: 'Built-in AI Synthesizer (Fallback)',
        fallbackNotice: `Notice: Provider ${provider} failed (${safeErrorMsg}). Generated using Built-in AI Synthesizer so your progress was preserved.`,
      });
    }

    return res.status(502).json({ error: safeErrorMsg });
  }
});

// ============================================================================
// 6. PROCEDURAL SITE SYNTHESIZER (ZERO-SETUP FALLBACK ENGINE)
// ============================================================================

function generateProceduralWebsite(prompt: string, stylePreset: string, mode: string, currentCode: string) {
  const promptLower = prompt.toLowerCase();

  const isPortfolio =
    promptLower.includes('portfolio') ||
    promptLower.includes('resume') ||
    promptLower.includes('developer') ||
    promptLower.includes('designer');
  const isEcommerce =
    promptLower.includes('shop') ||
    promptLower.includes('store') ||
    promptLower.includes('product') ||
    promptLower.includes('commerce') ||
    promptLower.includes('sneaker') ||
    promptLower.includes('brand');
  const isRestaurant =
    promptLower.includes('restaurant') ||
    promptLower.includes('cafe') ||
    promptLower.includes('coffee') ||
    promptLower.includes('food') ||
    promptLower.includes('dining') ||
    promptLower.includes('bistro');
  const isFitness =
    promptLower.includes('fitness') ||
    promptLower.includes('gym') ||
    promptLower.includes('workout') ||
    promptLower.includes('health') ||
    promptLower.includes('trainer');

  const title = prompt.length > 40 ? prompt.slice(0, 37) + '...' : prompt;

  let html = '';
  if (isRestaurant) {
    html = getRestaurantTemplate(prompt, title);
  } else if (isPortfolio) {
    html = getPortfolioTemplate(prompt, title);
  } else if (isEcommerce) {
    html = getEcommerceTemplate(prompt, title);
  } else if (isFitness) {
    html = getFitnessTemplate(prompt, title);
  } else {
    html = getSaaSTemplate(prompt, title, stylePreset);
  }

  return { code: html };
}

function getSaaSTemplate(prompt: string, title: string, style: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | AI Powered Platform</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .gradient-glow { background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25) 0%, rgba(0, 0, 0, 0) 70%); }
    .glass-panel { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 min-h-screen">
  <div class="bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-indigo-900/60 border-b border-indigo-500/20 py-2 px-4 text-center text-xs font-medium text-indigo-200">
    ✨ Intelligent Workflows Active. <a href="#features" class="underline hover:text-white ml-1 font-semibold">Explore architecture &rarr;</a>
  </div>
  <header class="sticky top-0 z-50 glass-panel border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
        </div>
        <span class="text-lg font-bold tracking-tight text-white">Nova<span class="text-indigo-400">Scale</span></span>
      </div>
      <nav class="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
        <a href="#features" class="hover:text-white transition-colors">Features</a>
        <a href="#solutions" class="hover:text-white transition-colors">Solutions</a>
        <a href="#pricing" class="hover:text-white transition-colors">Pricing</a>
        <a href="#faq" class="hover:text-white transition-colors">FAQ</a>
      </nav>
      <div class="flex items-center space-x-4">
        <button onclick="alert('Account portal')" class="text-sm font-medium text-slate-300 hover:text-white hidden sm:block">Log in</button>
        <button onclick="alert('Trial activated')" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all">Get Started</button>
      </div>
    </div>
  </header>
  <section class="relative pt-20 pb-28 overflow-hidden gradient-glow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Version 3.0 Live • Autonomous Engine</span>
      </div>
      <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
        Build high-performance products <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">10x faster</span>
      </h1>
      <p class="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">${prompt}</p>
      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
        <button onclick="alert('Trial started!')" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30">Start Free Trial</button>
        <a href="#features" class="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium">Watch Demo</a>
      </div>
    </div>
  </section>
  <footer class="border-t border-slate-800 py-10 text-center text-xs text-slate-500">
    © 2026 NovaScale Inc. Generated with AI Website Builder.
  </footer>
</body>
</html>`;
}

function getPortfolioTemplate(prompt: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Portfolio</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-zinc-950 text-zinc-100 font-sans p-8 max-w-4xl mx-auto">
  <header class="py-12 border-b border-zinc-800 flex justify-between items-center">
    <div>
      <h1 class="text-3xl font-extrabold text-white">Alex Rivera</h1>
      <p class="text-zinc-400 text-sm mt-1">Staff Product Designer & Technologist</p>
    </div>
    <button onclick="alert('Contact form')" class="px-4 py-2 rounded-full bg-white text-zinc-950 text-xs font-bold">Contact</button>
  </header>
  <section class="py-12">
    <h2 class="text-xl font-bold text-white mb-4">Focus & Vision</h2>
    <p class="text-zinc-300 leading-relaxed">${prompt}</p>
  </section>
</body>
</html>`;
}

function getRestaurantTemplate(prompt: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Artisanal Dining</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-stone-900 text-stone-100 font-sans p-8 max-w-4xl mx-auto">
  <header class="py-12 border-b border-stone-800 text-center">
    <h1 class="text-4xl font-serif text-amber-100">${title}</h1>
    <p class="text-stone-400 mt-4">${prompt}</p>
    <button onclick="alert('Reservation request submitted')" class="mt-6 px-6 py-2.5 rounded bg-amber-600 text-stone-950 font-bold">Book Table</button>
  </header>
</body>
</html>`;
}

function getEcommerceTemplate(prompt: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Storefront</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-900 text-neutral-100 font-sans p-8 max-w-5xl mx-auto">
  <header class="py-12 border-b border-neutral-800 flex justify-between items-center">
    <h1 class="text-2xl font-black text-white">${title}</h1>
    <button onclick="alert('Cart empty')" class="px-4 py-2 rounded bg-neutral-800 text-xs font-bold">Cart (0)</button>
  </header>
  <div class="py-12"><p class="text-neutral-400">${prompt}</p></div>
</body>
</html>`;
}

function getFitnessTemplate(prompt: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Peak Performance</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white font-sans p-8 max-w-4xl mx-auto text-center">
  <h1 class="text-4xl font-extrabold uppercase text-orange-500">${title}</h1>
  <p class="text-slate-300 mt-6">${prompt}</p>
  <button onclick="alert('Pass activated!')" class="mt-8 px-8 py-3 bg-orange-600 text-white font-bold rounded-xl">Free Trial Pass</button>
</body>
</html>`;
}

// ============================================================================
// 7. DEV SERVER & PRODUCTION SERVER STARTUP
// ============================================================================

async function startServer() {
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT} (Production: ${IS_PROD})`);
  });
}

startServer().catch((err) => {
  safeLog('StartupError', { message: err?.message });
  process.exit(1);
});
