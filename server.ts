import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Health and provider capabilities check
app.get('/api/health', (req, res) => {
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

// Test provider API Key
app.post('/api/providers/test', async (req, res) => {
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
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: `Provider error: ${errorText}` });
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
        const errorText = await response.text();
        return res.status(response.status).json({ success: false, error: `Anthropic error: ${errorText}` });
      }

      const latency = Date.now() - startTime;
      return res.json({ success: true, latencyMs: latency, message: 'Connection successful!' });
    }

    return res.status(400).json({ success: false, error: 'Unsupported provider' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || 'Failed to connect to provider' });
  }
});

// System prompt helper for website generation
function buildSystemPrompt(style: string = 'Modern Clean', framework: string = 'html') {
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
app.post('/api/generate', async (req, res) => {
  const {
    provider = 'builtin',
    apiKey,
    model,
    prompt,
    mode = 'new',
    currentCode = '',
    stylePreset = 'Modern SaaS',
    temperature = 0.7,
  } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'A prompt string is required' });
  }

  try {
    // If provider is builtin or no keys available, use our high-fidelity generator
    const keyToUse = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : '');
    
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
          { role: 'user', parts: [{ text: `${systemInstruction}\n\n${fullPrompt}` }] }
        ],
        config: {
          temperature: Number(temperature) || 0.7,
        }
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
        const err = await response.text();
        throw new Error(`${provider} API Error: ${err}`);
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
        const err = await response.text();
        throw new Error(`Anthropic API Error: ${err}`);
      }

      const data = await response.json();
      generatedCode = data.content?.[0]?.text || '';
    }

    // Clean up code block if formatted with markdown
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
    console.error('Generation error:', error);
    // Graceful fallback to procedural generator if external API fails
    if (req.body.allowFallback !== false) {
      console.warn('Falling back to built-in synthesizer due to API error:', error.message);
      const generated = generateProceduralWebsite(prompt, stylePreset, mode, currentCode);
      return res.json({
        code: generated.code,
        provider: 'builtin',
        model: 'Built-in AI Synthesizer (Fallback)',
        fallbackNotice: `Provider ${provider} encountered an error (${error.message}). Synthesized using built-in engine.`,
      });
    }
    return res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

// Built-in intelligent procedural website synthesizer
function generateProceduralWebsite(prompt: string, stylePreset: string, mode: string, currentCode: string) {
  const promptLower = prompt.toLowerCase();
  
  // Detect category
  const isPortfolio = promptLower.includes('portfolio') || promptLower.includes('resume') || promptLower.includes('developer') || promptLower.includes('designer');
  const isEcommerce = promptLower.includes('shop') || promptLower.includes('store') || promptLower.includes('product') || promptLower.includes('commerce') || promptLower.includes('sneaker') || promptLower.includes('brand');
  const isRestaurant = promptLower.includes('restaurant') || promptLower.includes('cafe') || promptLower.includes('coffee') || promptLower.includes('food') || promptLower.includes('dining') || promptLower.includes('bistro');
  const isAgency = promptLower.includes('agency') || promptLower.includes('studio') || promptLower.includes('consulting') || promptLower.includes('marketing');
  const isFitness = promptLower.includes('fitness') || promptLower.includes('gym') || promptLower.includes('workout') || promptLower.includes('health') || promptLower.includes('trainer');

  // Extract title/topic keywords
  const title = prompt.length > 40 ? prompt.slice(0, 37) + '...' : prompt;
  
  // Theme styling definitions
  const isDark = stylePreset.includes('Cyber') || stylePreset.includes('Dark') || (!stylePreset.includes('Clean') && !stylePreset.includes('Warm'));
  const primaryColor = isDark ? 'indigo' : 'blue';
  
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
    // Default high-conversion SaaS / Web App
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
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            mono: ['"JetBrains Mono"', 'monospace'],
          },
          colors: {
            brand: {
              50: '#eef2ff',
              100: '#e0e7ff',
              500: '#6366f1',
              600: '#4f46e5',
              700: '#4338ca',
            }
          }
        }
      }
    }
  </script>
  <style>
    .gradient-glow {
      background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25) 0%, rgba(0, 0, 0, 0) 70%);
    }
    .glass-panel {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 min-h-screen">

  <!-- Top Announcement Banner -->
  <div class="bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-indigo-900/60 border-b border-indigo-500/20 py-2 px-4 text-center text-xs font-medium text-indigo-200">
    ✨ Introducing Next-Gen Intelligent Workflows. <a href="#features" class="underline hover:text-white ml-1 font-semibold">Explore the update &rarr;</a>
  </div>

  <!-- Navigation -->
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
        <a href="#testimonials" class="hover:text-white transition-colors">Testimonials</a>
        <a href="#faq" class="hover:text-white transition-colors">FAQ</a>
      </nav>

      <div class="flex items-center space-x-4">
        <button onclick="openModal('loginModal')" class="text-sm font-medium text-slate-300 hover:text-white hidden sm:block">Log in</button>
        <button onclick="openModal('ctaModal')" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95">
          Get Started
        </button>
        <button id="mobileMenuBtn" class="md:hidden text-slate-400 hover:text-white p-1">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>
        </button>
      </div>
    </div>

    <!-- Mobile Drawer -->
    <div id="mobileMenu" class="hidden md:hidden px-4 pt-2 pb-6 border-t border-slate-800 bg-slate-900/95 space-y-3">
      <a href="#features" class="block text-slate-300 hover:text-white py-1">Features</a>
      <a href="#solutions" class="block text-slate-300 hover:text-white py-1">Solutions</a>
      <a href="#pricing" class="block text-slate-300 hover:text-white py-1">Pricing</a>
      <a href="#testimonials" class="block text-slate-300 hover:text-white py-1">Testimonials</a>
      <a href="#faq" class="block text-slate-300 hover:text-white py-1">FAQ</a>
      <button onclick="openModal('ctaModal')" class="w-full mt-2 py-2 rounded-lg bg-indigo-600 text-white font-medium text-sm">Get Started</button>
    </div>
  </header>

  <!-- Hero Section -->
  <section class="relative pt-20 pb-28 overflow-hidden gradient-glow">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium mb-8">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Version 3.0 Live • Built with Autonomous AI</span>
      </div>

      <h1 class="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
        Build high-performance products <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">10x faster</span>
      </h1>

      <p class="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
        ${prompt}
      </p>

      <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
        <button onclick="openModal('ctaModal')" class="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-2">
          <span>Start Free Trial</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
        </button>
        <a href="#features" class="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium transition-colors flex items-center justify-center space-x-2">
          <span>Watch 2-min Demo</span>
        </a>
      </div>

      <!-- Trust Badges -->
      <div class="mt-16 pt-8 border-t border-slate-800/80 max-w-4xl mx-auto">
        <p class="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-6">Trusted by 25,000+ engineers, designers, and fast-moving teams</p>
        <div class="flex flex-wrap items-center justify-center gap-8 md:gap-14 opacity-60 grayscale hover:grayscale-0 transition-all">
          <span class="text-xl font-bold tracking-tighter text-slate-400">ACME<span class="text-indigo-400">Labs</span></span>
          <span class="text-xl font-bold tracking-tight text-slate-400">⚡ HyperFlow</span>
          <span class="text-xl font-extrabold text-slate-400">VERTEX.IO</span>
          <span class="text-xl font-mono font-bold text-slate-400">SYNAPSE</span>
          <span class="text-xl font-semibold tracking-wide text-slate-400">KINETIC</span>
        </div>
      </div>

      <!-- Interactive Mockup Canvas -->
      <div class="mt-14 relative max-w-5xl mx-auto rounded-2xl glass-panel p-2 shadow-2xl border border-indigo-500/20">
        <div class="rounded-xl overflow-hidden bg-slate-900 border border-slate-800 p-6">
          <div class="flex items-center justify-between pb-4 border-b border-slate-800">
            <div class="flex items-center space-x-2">
              <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
              <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
              <span class="ml-2 text-xs font-mono text-slate-400">dashboard.novascale.internal</span>
            </div>
            <div class="flex space-x-2">
              <button onclick="simulateMetrics('day')" class="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700">24H</button>
              <button onclick="simulateMetrics('week')" class="px-2.5 py-1 text-xs rounded bg-indigo-600 text-white">7D</button>
              <button onclick="simulateMetrics('month')" class="px-2.5 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700">30D</button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
            <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <span class="text-xs text-slate-400 font-medium">Throughput & Requests</span>
              <div id="stat1" class="text-2xl font-bold text-white mt-1">4.2M / sec</div>
              <span class="text-xs text-emerald-400 font-medium">↑ +24.8% vs last cycle</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <span class="text-xs text-slate-400 font-medium">Global P99 Latency</span>
              <div id="stat2" class="text-2xl font-bold text-white mt-1">14.2 ms</div>
              <span class="text-xs text-emerald-400 font-medium">↓ -38% optimization</span>
            </div>
            <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
              <span class="text-xs text-slate-400 font-medium">Automated Pipeline Success</span>
              <div id="stat3" class="text-2xl font-bold text-white mt-1">99.98%</div>
              <span class="text-xs text-indigo-400 font-medium">⚡ Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Grid -->
  <section id="features" class="py-24 bg-slate-900/50 border-t border-b border-slate-800/60">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto">
        <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-400">Core Capabilities</h2>
        <p class="mt-3 text-3xl sm:text-4xl font-extrabold text-white">Engineered for uncompromising speed and precision</p>
        <p class="mt-4 text-slate-400">Everything you need to automate workflows, scale operations, and deploy with confidence.</p>
      </div>

      <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Feature 1 -->
        <div class="p-8 rounded-2xl glass-panel border border-slate-800 hover:border-indigo-500/40 transition-all hover:-translate-y-1">
          <div class="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h3 class="text-xl font-bold text-white">Lightning Fast Pipeline</h3>
          <p class="mt-3 text-slate-400 text-sm leading-relaxed">
            Ultra-low latency micro-services orchestrated seamlessly with instant compilation and edge distribution.
          </p>
          <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-indigo-400">
            <span>Learn more &rarr;</span>
          </div>
        </div>

        <!-- Feature 2 -->
        <div class="p-8 rounded-2xl glass-panel border border-slate-800 hover:border-purple-500/40 transition-all hover:-translate-y-1">
          <div class="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          </div>
          <h3 class="text-xl font-bold text-white">Zero-Trust Security</h3>
          <p class="mt-3 text-slate-400 text-sm leading-relaxed">
            End-to-end encrypted tunnels, automated role-based access control, and comprehensive SOC2-compliant audit logging.
          </p>
          <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-purple-400">
            <span>Security Whitepaper &rarr;</span>
          </div>
        </div>

        <!-- Feature 3 -->
        <div class="p-8 rounded-2xl glass-panel border border-slate-800 hover:border-pink-500/40 transition-all hover:-translate-y-1">
          <div class="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mb-6">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>
          </div>
          <h3 class="text-xl font-bold text-white">Autonomous Scaling</h3>
          <p class="mt-3 text-slate-400 text-sm leading-relaxed">
            Intelligent resource allocation adapts dynamically to traffic surges, saving up to 40% on server and compute costs.
          </p>
          <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center text-xs font-semibold text-pink-400">
            <span>Benchmark Report &rarr;</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive Pricing Section -->
  <section id="pricing" class="py-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-3xl mx-auto">
        <h2 class="text-xs font-bold uppercase tracking-widest text-indigo-400">Predictable Pricing</h2>
        <p class="mt-3 text-3xl sm:text-4xl font-extrabold text-white">Simple tiers that grow with you</p>
        
        <!-- Billing Toggle -->
        <div class="mt-8 inline-flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button id="monthlyBtn" onclick="toggleBilling('monthly')" class="px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-indigo-600 text-white">Monthly</button>
          <button id="annualBtn" onclick="toggleBilling('annual')" class="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-all flex items-center space-x-1">
            <span>Annual</span>
            <span class="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">Save 25%</span>
          </button>
        </div>
      </div>

      <div class="mt-14 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Starter Plan -->
        <div class="p-8 rounded-2xl glass-panel border border-slate-800">
          <h3 class="text-lg font-bold text-white">Starter</h3>
          <p class="text-slate-400 text-xs mt-1">Ideal for indie creators & exploratory builds</p>
          <div class="mt-6">
            <span class="text-4xl font-extrabold text-white pricing-val" data-monthly="$29" data-annual="$19">$29</span>
            <span class="text-slate-400 text-sm">/ month</span>
          </div>
          <ul class="mt-6 space-y-3 text-sm text-slate-300">
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Up to 5 concurrent projects</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>100,000 monthly API calls</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Standard SLA & community support</span></li>
          </ul>
          <button onclick="openModal('ctaModal')" class="mt-8 w-full py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-sm transition-colors">
            Get Starter
          </button>
        </div>

        <!-- Pro Plan (Featured) -->
        <div class="p-8 rounded-2xl glass-panel border-2 border-indigo-500 relative shadow-xl shadow-indigo-500/10">
          <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-[11px] font-bold uppercase tracking-wider text-white">
            Most Popular
          </div>
          <h3 class="text-lg font-bold text-white">Professional</h3>
          <p class="text-slate-400 text-xs mt-1">For growing teams and fast product cycles</p>
          <div class="mt-6">
            <span class="text-4xl font-extrabold text-white pricing-val" data-monthly="$79" data-annual="$59">$79</span>
            <span class="text-slate-400 text-sm">/ month</span>
          </div>
          <ul class="mt-6 space-y-3 text-sm text-slate-300">
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Unlimited projects & workspaces</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>2,000,000 monthly API calls</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Autonomous CI/CD & preview deploys</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Priority 24/7 dedicated assistance</span></li>
          </ul>
          <button onclick="openModal('ctaModal')" class="mt-8 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all hover:scale-102">
            Claim Free 14-Day Trial
          </button>
        </div>

        <!-- Enterprise Plan -->
        <div class="p-8 rounded-2xl glass-panel border border-slate-800">
          <h3 class="text-lg font-bold text-white">Enterprise</h3>
          <p class="text-slate-400 text-xs mt-1">Custom governance, compliance & dedicated infra</p>
          <div class="mt-6">
            <span class="text-4xl font-extrabold text-white pricing-val" data-monthly="$249" data-annual="$199">$249</span>
            <span class="text-slate-400 text-sm">/ month</span>
          </div>
          <ul class="mt-6 space-y-3 text-sm text-slate-300">
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Custom compute & VPC peering</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>SOC2 Type II & HIPAA compliance</span></li>
            <li class="flex items-center space-x-2"><span class="text-emerald-400 font-bold">✓</span><span>Dedicated Technical Account Manager</span></li>
          </ul>
          <button onclick="openModal('contactModal')" class="mt-8 w-full py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-200 font-semibold text-sm transition-colors">
            Talk to Solutions Engineer
          </button>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive FAQ Accordion -->
  <section id="faq" class="py-24 bg-slate-900/40 border-t border-slate-800/80">
    <div class="max-w-3xl mx-auto px-4 sm:px-6">
      <h2 class="text-2xl sm:text-3xl font-extrabold text-white text-center">Frequently Asked Questions</h2>
      <div class="mt-10 space-y-4">
        <div class="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <button onclick="toggleFaq(1)" class="w-full px-6 py-4 text-left flex items-center justify-between text-white font-medium hover:text-indigo-400 transition-colors">
            <span>How fast can I deploy my first project?</span>
            <span id="faqIcon1" class="text-indigo-400 text-lg font-bold">+</span>
          </button>
          <div id="faqContent1" class="hidden px-6 pb-4 text-sm text-slate-400 leading-relaxed">
            You can generate, customize, and export or deploy your production-ready web application in under 60 seconds with our instant generation engine.
          </div>
        </div>

        <div class="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <button onclick="toggleFaq(2)" class="w-full px-6 py-4 text-left flex items-center justify-between text-white font-medium hover:text-indigo-400 transition-colors">
            <span>Can I bring my own API keys from Gemini or OpenAI?</span>
            <span id="faqIcon2" class="text-indigo-400 text-lg font-bold">+</span>
          </button>
          <div id="faqContent2" class="hidden px-6 pb-4 text-sm text-slate-400 leading-relaxed">
            Yes! We provide full user-controlled API key management for Google Gemini, OpenAI, Anthropic Claude, Groq, DeepSeek, and OpenRouter, stored securely on your client.
          </div>
        </div>

        <div class="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden">
          <button onclick="toggleFaq(3)" class="w-full px-6 py-4 text-left flex items-center justify-between text-white font-medium hover:text-indigo-400 transition-colors">
            <span>What export formats are supported?</span>
            <span id="faqIcon3" class="text-indigo-400 text-lg font-bold">+</span>
          </button>
          <div id="faqContent3" class="hidden px-6 pb-4 text-sm text-slate-400 leading-relaxed">
            You can download single-file HTML bundles, complete multi-file ZIP packages, or copy React + Tailwind components directly into your codebase.
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-slate-800 py-12 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
    <div class="flex items-center justify-center space-x-6 mb-4">
      <a href="#features" class="hover:text-slate-300">Features</a>
      <a href="#pricing" class="hover:text-slate-300">Pricing</a>
      <a href="#faq" class="hover:text-slate-300">Support</a>
      <a href="#" class="hover:text-slate-300">Privacy Policy</a>
    </div>
    <p>© 2026 NovaScale Inc. Open Source under MIT License. Generated with AI Website Builder.</p>
  </footer>

  <!-- Modal Component -->
  <div id="ctaModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-200">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <h3 class="text-lg font-bold text-white">Create Your Account</h3>
        <button onclick="closeModal('ctaModal')" class="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
      </div>
      <form onsubmit="handleFormSubmit(event)" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
          <input type="email" required placeholder="name@company.com" class="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Password</label>
          <input type="password" required placeholder="••••••••••••" class="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500">
        </div>
        <button type="submit" class="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30">
          Get Started in 1-Click
        </button>
      </form>
    </div>
  </div>

  <script>
    // Navigation toggle
    const menuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    }

    // Billing toggle
    function toggleBilling(type) {
      const isAnnual = type === 'annual';
      const monthlyBtn = document.getElementById('monthlyBtn');
      const annualBtn = document.getElementById('annualBtn');
      
      if (isAnnual) {
        annualBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-indigo-600 text-white flex items-center space-x-1";
        monthlyBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-all";
      } else {
        monthlyBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-indigo-600 text-white";
        annualBtn.className = "px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white transition-all flex items-center space-x-1";
      }

      document.querySelectorAll('.pricing-val').forEach(el => {
        el.textContent = isAnnual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
      });
    }

    // FAQ Accordion
    function toggleFaq(index) {
      const content = document.getElementById('faqContent' + index);
      const icon = document.getElementById('faqIcon' + index);
      if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '−';
      } else {
        content.classList.add('hidden');
        icon.textContent = '+';
      }
    }

    // Modal helpers
    function openModal(id) {
      const el = document.getElementById(id) || document.getElementById('ctaModal');
      if (el) el.classList.remove('hidden');
    }
    function closeModal(id) {
      const el = document.getElementById(id) || document.getElementById('ctaModal');
      if (el) el.classList.add('hidden');
    }
    function handleFormSubmit(e) {
      e.preventDefault();
      alert('🎉 Welcome aboard! Setting up your workspace environment...');
      closeModal('ctaModal');
    }

    // Metric simulation
    function simulateMetrics(period) {
      const s1 = document.getElementById('stat1');
      const s2 = document.getElementById('stat2');
      if (period === 'day') {
        s1.textContent = '680K / sec';
        s2.textContent = '12.4 ms';
      } else if (period === 'week') {
        s1.textContent = '4.2M / sec';
        s2.textContent = '14.2 ms';
      } else {
        s1.textContent = '18.9M / sec';
        s2.textContent = '15.1 ms';
      }
    }
  </script>
</body>
</html>`;
}

function getPortfolioTemplate(prompt: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Portfolio & Work</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body class="bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
  <div class="max-w-4xl mx-auto px-6 py-20">
    <header class="flex items-center justify-between pb-12 border-b border-zinc-800">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-white">Alex Rivera</h1>
        <p class="text-zinc-400 text-sm mt-1">Staff Product Designer & Creative Technologist</p>
      </div>
      <a href="#contact" class="px-4 py-2 rounded-full bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors">
        Get in Touch
      </a>
    </header>

    <section class="py-16">
      <h2 class="text-2xl font-bold text-white mb-6">About</h2>
      <p class="text-lg text-zinc-300 leading-relaxed">
        ${prompt}
      </p>
    </section>

    <section class="py-12 border-t border-zinc-800">
      <h2 class="text-xs uppercase font-bold tracking-widest text-zinc-500 mb-8">Selected Works (2024 - 2026)</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="group rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 hover:border-zinc-600 transition-all">
          <div class="h-44 rounded-xl bg-gradient-to-tr from-indigo-900 to-violet-800 flex items-center justify-center text-white font-mono font-bold text-lg mb-4">
            FlowState UI
          </div>
          <h3 class="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">Generative Canvas Engine</h3>
          <p class="text-zinc-400 text-sm mt-1">High-concurrency collaborative whiteboard system handling 10k live cursors.</p>
        </div>

        <div class="group rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 hover:border-zinc-600 transition-all">
          <div class="h-44 rounded-xl bg-gradient-to-tr from-emerald-900 to-teal-800 flex items-center justify-center text-white font-mono font-bold text-lg mb-4">
            Aura OS
          </div>
          <h3 class="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">Spatial Windowing Manager</h3>
          <p class="text-zinc-400 text-sm mt-1">Next-generation multi-display workspace environment for VR & vision devices.</p>
        </div>
      </div>
    </section>

    <section id="contact" class="py-16 border-t border-zinc-800">
      <h2 class="text-2xl font-bold text-white mb-4">Let's collaborate</h2>
      <p class="text-zinc-400 text-sm mb-6">Available for select advisory roles, design engineering, and enterprise architecture.</p>
      <form onsubmit="event.preventDefault(); alert('Message sent!');" class="space-y-4 max-w-md">
        <input type="email" placeholder="Your email address" required class="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm">
        <textarea rows="3" placeholder="Tell me about your project..." required class="w-full px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-sm"></textarea>
        <button type="submit" class="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm">Send Message</button>
      </form>
    </section>
  </div>
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
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-stone-900 text-stone-100 font-sans">
  <nav class="border-b border-stone-800 px-6 py-4 flex items-center justify-between">
    <span class="text-xl font-serif font-bold text-amber-200">L'Atelier Bistrot</span>
    <div class="space-x-6 text-sm text-stone-300">
      <a href="#menu" class="hover:text-amber-200">Menu</a>
      <a href="#story" class="hover:text-amber-200">Our Story</a>
      <a href="#reserve" class="px-4 py-2 rounded bg-amber-600 text-stone-900 font-bold hover:bg-amber-500">Reserve</a>
    </div>
  </nav>

  <section class="py-24 text-center px-4 max-w-3xl mx-auto">
    <span class="text-xs uppercase tracking-widest text-amber-400 font-bold">Artisanal & Farm-to-Table</span>
    <h1 class="text-4xl sm:text-5xl font-serif font-bold text-amber-100 mt-4 leading-tight">${title}</h1>
    <p class="text-stone-300 mt-6 text-lg leading-relaxed">${prompt}</p>
    <div class="mt-8">
      <a href="#reserve" class="px-8 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold">Book a Table</a>
    </div>
  </section>

  <section id="menu" class="py-16 bg-stone-950 px-6 border-t border-stone-800">
    <div class="max-w-4xl mx-auto">
      <h2 class="text-2xl font-serif font-bold text-amber-200 text-center mb-10">Chef's Seasonal Tasting</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="border-b border-stone-800 pb-4">
          <div class="flex justify-between font-serif font-bold text-amber-100">
            <span>Truffle Burrata Tartine</span>
            <span>$24</span>
          </div>
          <p class="text-stone-400 text-sm mt-1">Wood-fired sourdough, wild honey drizzle, aged balsamic, microgreens.</p>
        </div>
        <div class="border-b border-stone-800 pb-4">
          <div class="flex justify-between font-serif font-bold text-amber-100">
            <span>Wild Caught King Salmon</span>
            <span>$38</span>
          </div>
          <p class="text-stone-400 text-sm mt-1">Celery root purée, glazed winter chantrelles, saffron emulsion.</p>
        </div>
      </div>
    </div>
  </section>
</body>
</html>`;
}

function getEcommerceTemplate(prompt: string, title: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Curated Store</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-neutral-900 text-neutral-100 font-sans">
  <div class="bg-neutral-800 py-2 text-center text-xs font-semibold text-neutral-300">
    Free express worldwide shipping on orders over $150
  </div>
  <header class="border-b border-neutral-800 px-6 py-4 flex items-center justify-between">
    <span class="text-xl font-black tracking-tight text-white uppercase">AERO<span class="text-indigo-400">STUDIO</span></span>
    <div class="space-x-6 text-sm text-neutral-300">
      <a href="#catalog" class="hover:text-white">Catalog</a>
      <a href="#about" class="hover:text-white">Brand</a>
      <button onclick="alert('Cart: 0 items ($0.00)')" class="px-3 py-1.5 rounded-lg bg-neutral-800 text-white font-medium hover:bg-neutral-700">Cart (0)</button>
    </div>
  </header>

  <section class="py-20 text-center px-4 max-w-4xl mx-auto">
    <h1 class="text-4xl sm:text-6xl font-black text-white uppercase tracking-tight">${title}</h1>
    <p class="mt-4 text-neutral-400 text-lg max-w-2xl mx-auto">${prompt}</p>
  </section>

  <section id="catalog" class="py-12 px-6 max-w-6xl mx-auto">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="rounded-xl border border-neutral-800 bg-neutral-800/40 p-4">
        <div class="h-60 rounded-lg bg-gradient-to-tr from-neutral-800 to-indigo-900/60 flex items-center justify-center font-bold text-neutral-400">
          Product Preview
        </div>
        <h3 class="mt-4 font-bold text-white text-lg">Aerodynamic Shell Jacket</h3>
        <p class="text-indigo-400 font-semibold mt-1">$280.00</p>
        <button onclick="alert('Added to cart!')" class="mt-4 w-full py-2 bg-white text-neutral-950 font-bold text-sm rounded hover:bg-neutral-200">Quick Add</button>
      </div>
      <div class="rounded-xl border border-neutral-800 bg-neutral-800/40 p-4">
        <div class="h-60 rounded-lg bg-gradient-to-tr from-neutral-800 to-purple-900/60 flex items-center justify-center font-bold text-neutral-400">
          Product Preview
        </div>
        <h3 class="mt-4 font-bold text-white text-lg">Thermal Utility Cargo</h3>
        <p class="text-indigo-400 font-semibold mt-1">$195.00</p>
        <button onclick="alert('Added to cart!')" class="mt-4 w-full py-2 bg-white text-neutral-950 font-bold text-sm rounded hover:bg-neutral-200">Quick Add</button>
      </div>
    </div>
  </section>
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
<body class="bg-slate-950 text-white font-sans">
  <header class="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
    <span class="text-xl font-extrabold text-orange-500 uppercase tracking-widest">KINETIC GYM</span>
    <a href="#join" class="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm">Join Now</a>
  </header>
  <section class="py-24 text-center px-4 max-w-4xl mx-auto">
    <h1 class="text-5xl sm:text-7xl font-extrabold uppercase tracking-tight text-white">${title}</h1>
    <p class="mt-6 text-slate-300 text-lg max-w-2xl mx-auto">${prompt}</p>
    <div class="mt-8 flex justify-center gap-4">
      <button onclick="alert('Pass activated!')" class="px-8 py-3.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500">Free 3-Day Pass</button>
    </div>
  </section>
</body>
</html>`;
}

// Start dev or production server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
