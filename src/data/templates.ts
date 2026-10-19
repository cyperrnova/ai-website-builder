import { Template } from '../types';

export const STARTER_TEMPLATES: Template[] = [
  {
    id: 'ai-saas',
    name: 'NovaScale - AI Analytics SaaS',
    category: 'SaaS & Tech',
    description: 'High-conversion SaaS landing page with animated metrics, interactive pricing calculator, features grid, and dark glassmorphic theme.',
    stylePreset: 'Modern SaaS',
    thumbnailGradient: 'from-indigo-600 to-purple-600',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaScale | AI Analytics & Data Infrastructure</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .glass { background: rgba(15, 23, 42, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .glow { background: radial-gradient(circle at 50% 0%, rgba(99, 102, 241, 0.25) 0%, rgba(0, 0, 0, 0) 70%); }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- Nav -->
  <header class="sticky top-0 z-50 glass border-b border-slate-800">
    <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-2">
        <div class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30">N</div>
        <span class="font-bold text-lg text-white">Nova<span class="text-indigo-400">Scale</span></span>
      </div>
      <nav class="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
        <a href="#features" class="hover:text-white transition-colors">Features</a>
        <a href="#demo" class="hover:text-white transition-colors">Interactive Demo</a>
        <a href="#pricing" class="hover:text-white transition-colors">Pricing</a>
      </nav>
      <div class="flex items-center space-x-4">
        <button onclick="alert('Opening demo request...')" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-600/30">Get Started Free</button>
      </div>
    </div>
  </header>

  <!-- Hero -->
  <section class="glow pt-20 pb-24 text-center px-4">
    <div class="max-w-4xl mx-auto">
      <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-semibold mb-6">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span>Next-Generation Streaming Analytics Engine</span>
      </div>
      <h1 class="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
        Instant insights from your data <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400">in real-time</span>
      </h1>
      <p class="mt-6 text-slate-400 text-lg max-w-2xl mx-auto">
        Aggregate billions of data points in sub-second queries. Connect your databases, stream events, and empower your product team with autonomous AI exploration.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        <button onclick="alert('Trial started!')" class="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30">
          Start 14-Day Free Trial
        </button>
        <button onclick="document.getElementById('demo').scrollIntoView({behavior:'smooth'})" class="px-8 py-3.5 rounded-xl border border-slate-700 text-slate-300 hover:border-slate-500 font-semibold">
          Try Live Demo
        </button>
      </div>
    </div>
  </section>

  <!-- Interactive Demo Section -->
  <section id="demo" class="py-16 px-4 max-w-5xl mx-auto">
    <div class="glass p-6 rounded-2xl border border-slate-800 shadow-2xl">
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div class="flex items-center space-x-2">
          <span class="w-3 h-3 rounded-full bg-rose-500"></span>
          <span class="w-3 h-3 rounded-full bg-amber-500"></span>
          <span class="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span class="text-xs font-mono text-slate-400 ml-2">live-stream-simulator.nova</span>
        </div>
        <button onclick="triggerDataSpike()" class="px-3 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded text-xs font-semibold hover:bg-indigo-600/40">
          Simulate Traffic Spike ⚡
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div class="text-xs text-slate-400">Processed Events / Sec</div>
          <div id="eventsCounter" class="text-3xl font-extrabold text-white mt-2">1,240,580</div>
          <div class="text-xs text-emerald-400 mt-1">↑ 99.999% SLA</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div class="text-xs text-slate-400">Global Query P95 Latency</div>
          <div id="latencyCounter" class="text-3xl font-extrabold text-white mt-2">8.4 ms</div>
          <div class="text-xs text-indigo-400 mt-1">Edge Cached</div>
        </div>
        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div class="text-xs text-slate-400">Anomaly Detection Confidence</div>
          <div class="text-3xl font-extrabold text-white mt-2">99.8%</div>
          <div class="text-xs text-purple-400 mt-1">Autonomous Neural Filter</div>
        </div>
      </div>
    </div>
  </section>

  <!-- Pricing -->
  <section id="pricing" class="py-20 max-w-6xl mx-auto px-6">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-white">Transparent, predictable plans</h2>
      <p class="text-slate-400 mt-2">Scale as you grow without surprise surcharges.</p>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div class="glass p-8 rounded-2xl">
        <h3 class="text-lg font-bold text-white">Developer</h3>
        <div class="text-3xl font-extrabold text-white mt-4">$29<span class="text-sm font-normal text-slate-400">/mo</span></div>
        <p class="text-xs text-slate-400 mt-2">Great for side projects and prototypes.</p>
        <button onclick="alert('Subscribed to Developer!')" class="w-full mt-6 py-2.5 rounded-lg border border-slate-700 text-white font-semibold text-sm hover:border-slate-500">Get Started</button>
      </div>
      <div class="glass p-8 rounded-2xl border-2 border-indigo-500 relative">
        <div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-[11px] font-bold uppercase text-white">Popular</div>
        <h3 class="text-lg font-bold text-white">Growth Team</h3>
        <div class="text-3xl font-extrabold text-white mt-4">$99<span class="text-sm font-normal text-slate-400">/mo</span></div>
        <p class="text-xs text-slate-400 mt-2">Ideal for scaled applications with SLA requirements.</p>
        <button onclick="alert('Subscribed to Growth!')" class="w-full mt-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500">Start 14-Day Free Trial</button>
      </div>
      <div class="glass p-8 rounded-2xl">
        <h3 class="text-lg font-bold text-white">Enterprise</h3>
        <div class="text-3xl font-extrabold text-white mt-4">$299<span class="text-sm font-normal text-slate-400">/mo</span></div>
        <p class="text-xs text-slate-400 mt-2">Custom compliance, dedicated clusters & VPC.</p>
        <button onclick="alert('Enterprise inquiry opened!')" class="w-full mt-6 py-2.5 rounded-lg border border-slate-700 text-white font-semibold text-sm hover:border-slate-500">Contact Sales</button>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t border-slate-800 py-10 text-center text-xs text-slate-500">
    © 2026 NovaScale Inc. All rights reserved.
  </footer>

  <script>
    function triggerDataSpike() {
      const el1 = document.getElementById('eventsCounter');
      const el2 = document.getElementById('latencyCounter');
      el1.textContent = '8,940,112';
      el2.textContent = '12.1 ms';
      setTimeout(() => {
        el1.textContent = '1,240,580';
        el2.textContent = '8.4 ms';
      }, 3000);
    }
  </script>
</body>
</html>`
  },
  {
    id: 'creative-studio',
    name: 'Kroma - Creative Agency & Studio',
    category: 'Agency & Portfolio',
    description: 'Editorial layout with minimalist typography, high-impact case study showcases, interactive service tabs, and consultation booking form.',
    stylePreset: 'Warm Editorial',
    thumbnailGradient: 'from-amber-600 to-orange-700',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>KROMA Studio | Digital Brand Architecture</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Instrument+Serif:italic@0;1&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; }
    .serif { font-family: 'Instrument Serif', Georgia, serif; }
  </style>
</head>
<body class="bg-stone-950 text-stone-100 min-h-screen">
  <nav class="border-b border-stone-800 px-8 py-5 flex items-center justify-between">
    <div class="serif text-2xl tracking-wide text-amber-100">Kroma.</div>
    <div class="space-x-8 text-xs uppercase tracking-widest text-stone-400 font-semibold">
      <a href="#work" class="hover:text-amber-200">Selected Work</a>
      <a href="#services" class="hover:text-amber-200">Practices</a>
      <a href="#contact" class="hover:text-amber-200">Start Project</a>
    </div>
  </nav>

  <header class="py-28 px-8 max-w-5xl mx-auto">
    <span class="text-xs font-mono uppercase tracking-widest text-amber-500">Independent Creative Collective</span>
    <h1 class="serif text-5xl sm:text-7xl lg:text-8xl text-stone-100 mt-6 leading-none">
      Crafting brands that define <span class="italic text-amber-200">the cultural future.</span>
    </h1>
    <p class="mt-8 text-stone-400 text-lg max-w-2xl leading-relaxed">
      We partner with founders, venture studios, and visionary organizations to sculpt identity systems, high-touch digital products, and cinematic interactions.
    </p>
  </header>

  <section id="work" class="py-16 px-8 max-w-6xl mx-auto border-t border-stone-800">
    <div class="flex items-center justify-between mb-12">
      <h2 class="serif text-3xl text-amber-100">Featured Commissions</h2>
      <span class="text-xs text-stone-500 font-mono">2024 — 2026</span>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div class="group cursor-pointer">
        <div class="h-80 rounded-2xl bg-gradient-to-tr from-stone-900 to-amber-950/50 border border-stone-800 flex items-center justify-center p-8 overflow-hidden group-hover:border-amber-500/50 transition-all">
          <span class="serif text-4xl text-stone-300 italic group-hover:scale-105 transition-transform">Vespera OS</span>
        </div>
        <div class="mt-4 flex justify-between items-baseline">
          <h3 class="text-lg font-bold text-stone-200">Vespera Spatial Interfaces</h3>
          <span class="text-xs text-amber-500 font-mono">Design System</span>
        </div>
      </div>
      <div class="group cursor-pointer">
        <div class="h-80 rounded-2xl bg-gradient-to-tr from-stone-900 to-stone-800/80 border border-stone-800 flex items-center justify-center p-8 overflow-hidden group-hover:border-amber-500/50 transition-all">
          <span class="serif text-4xl text-stone-300 italic group-hover:scale-105 transition-transform">Monolith</span>
        </div>
        <div class="mt-4 flex justify-between items-baseline">
          <h3 class="text-lg font-bold text-stone-200">Monolith Energy Token</h3>
          <span class="text-xs text-amber-500 font-mono">Brand & WebGL</span>
        </div>
      </div>
    </div>
  </section>

  <footer id="contact" class="border-t border-stone-800 py-20 px-8 text-center">
    <span class="text-xs font-mono uppercase tracking-widest text-amber-500">Initiate Collaboration</span>
    <h2 class="serif text-4xl sm:text-5xl text-stone-100 mt-4">Have an ambitious project in mind?</h2>
    <div class="mt-8">
      <button onclick="alert('Opening project proposal inquiry...')" class="px-8 py-4 rounded-full bg-amber-200 text-stone-950 font-semibold text-sm hover:bg-amber-100 transition-colors">
        hello@kromastudio.design &rarr;
      </button>
    </div>
  </footer>
</body>
</html>`
  },
  {
    id: 'dtc-store',
    name: 'Aero - Minimalist Technical Apparel',
    category: 'E-Commerce',
    description: 'Modern direct-to-consumer commerce storefront with interactive cart drawer, product size selector, customer reviews, and sticky purchase banner.',
    stylePreset: 'Clean Minimal',
    thumbnailGradient: 'from-emerald-700 to-teal-800',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AERO Techwear | Ergonomic Utility Apparel</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="bg-neutral-950 text-neutral-100 min-h-screen">
  <div class="bg-indigo-600 text-white text-xs font-bold text-center py-2 px-4 tracking-wide">
    SEASON 04 DROP NOW LIVE • WORLDWIDE EXPEDITED SHIPPING AVAILABLE
  </div>

  <header class="border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-neutral-950/90 backdrop-blur z-40">
    <div class="font-extrabold tracking-tighter text-xl">AERO<span class="text-indigo-500">_SYSTEMS</span></div>
    <div class="hidden sm:flex space-x-6 text-xs uppercase font-mono tracking-wider text-neutral-400">
      <a href="#products" class="hover:text-white">Collection</a>
      <a href="#materials" class="hover:text-white">Gore-Tex Labs</a>
      <a href="#sustainability" class="hover:text-white">Ethos</a>
    </div>
    <div class="flex items-center space-x-4">
      <button onclick="toggleCart()" class="px-3.5 py-1.5 rounded-lg border border-neutral-700 text-xs font-mono hover:border-neutral-400 flex items-center space-x-2">
        <span>CART</span>
        <span id="cartCountBadge" class="bg-indigo-600 text-white px-1.5 py-0.2 rounded-full text-[10px]">1</span>
      </button>
    </div>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-16">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div class="h-96 sm:h-[480px] rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-indigo-950/40 border border-neutral-800 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <span class="absolute top-4 left-4 px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-mono">SPEC: 3L-PRO-SHELL</span>
        <div class="text-center">
          <div class="w-36 h-36 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <svg class="w-16 h-16 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg>
          </div>
          <div class="font-mono text-xs text-neutral-400">AERO 01 // ALL-WEATHER JACKET</div>
        </div>
      </div>

      <div>
        <div class="text-xs uppercase font-mono text-indigo-400 font-bold tracking-widest">Limited Edition • 250 Units Produced</div>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-white mt-2">MK-IV Stormproof Utility Parka</h1>
        <div class="text-2xl font-bold text-white mt-4">$340.00 <span class="text-xs text-neutral-500 line-through ml-2">$420.00</span></div>
        <p class="text-neutral-400 text-sm mt-4 leading-relaxed">
          Engineered with military-grade 3-layer breathable ripstop membrane. Features seam-sealed magnetic quick-access stash pockets, modular sling harness, and deployable storm cowl.
        </p>

        <!-- Size Selector -->
        <div class="mt-6">
          <div class="text-xs font-mono uppercase text-neutral-400 mb-2">Select Sizing</div>
          <div class="flex space-x-3">
            <button onclick="selectSize('S')" class="size-btn px-4 py-2 rounded-lg border border-neutral-700 text-sm font-mono hover:border-neutral-400">S</button>
            <button onclick="selectSize('M')" class="size-btn px-4 py-2 rounded-lg border-2 border-indigo-500 text-sm font-mono text-white bg-indigo-600/20">M</button>
            <button onclick="selectSize('L')" class="size-btn px-4 py-2 rounded-lg border border-neutral-700 text-sm font-mono hover:border-neutral-400">L</button>
            <button onclick="selectSize('XL')" class="size-btn px-4 py-2 rounded-lg border border-neutral-700 text-sm font-mono hover:border-neutral-400">XL</button>
          </div>
        </div>

        <button onclick="addToCart()" class="mt-8 w-full py-3.5 rounded-xl bg-white text-neutral-950 font-bold hover:bg-neutral-200 transition-colors shadow-lg shadow-white/10 flex items-center justify-center space-x-2">
          <span>Add to Bag — $340.00</span>
        </button>
      </div>
    </div>
  </main>

  <script>
    let cartTotal = 1;
    function selectSize(size) {
      document.querySelectorAll('.size-btn').forEach(btn => {
        btn.className = 'size-btn px-4 py-2 rounded-lg border border-neutral-700 text-sm font-mono hover:border-neutral-400';
      });
      event.target.className = 'size-btn px-4 py-2 rounded-lg border-2 border-indigo-500 text-sm font-mono text-white bg-indigo-600/20';
    }
    function addToCart() {
      cartTotal++;
      document.getElementById('cartCountBadge').textContent = cartTotal;
      alert('✓ Added MK-IV Stormproof Utility Parka to bag!');
    }
    function toggleCart() {
      alert('Bag items: ' + cartTotal + ' unit(s). Free shipping applied at checkout.');
    }
  </script>
</body>
</html>`
  }
];
