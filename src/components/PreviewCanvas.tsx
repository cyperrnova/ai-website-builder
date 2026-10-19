import React, { useRef, useEffect, useState } from 'react';
import {
  RotateCcw,
  ExternalLink,
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  MousePointerClick,
  Sparkles,
} from 'lucide-react';
import { ViewportMode } from '../types';

interface PreviewCanvasProps {
  htmlCode: string;
  viewport: ViewportMode;
  onChangeViewport: (v: ViewportMode) => void;
  isGenerating: boolean;
  onSelectElementToPrompt?: (elementInfo: string) => void;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  htmlCode,
  viewport,
  onChangeViewport,
  isGenerating,
  onSelectElementToPrompt,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inspectMode, setInspectMode] = useState(false);

  const handleRefresh = () => {
    setReloadKey((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    const blob = new Blob([htmlCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  // Viewport dimensions
  const getContainerStyle = () => {
    switch (viewport) {
      case 'mobile':
        return 'w-[375px] h-[667px] max-h-[85vh] rounded-[36px] border-[10px] border-slate-800 shadow-2xl overflow-hidden';
      case 'tablet':
        return 'w-[768px] h-[900px] max-h-[88vh] rounded-[24px] border-[8px] border-slate-800 shadow-2xl overflow-hidden';
      case 'desktop':
      default:
        return 'w-full h-full rounded-lg border border-slate-800 shadow-md';
    }
  };

  return (
    <div className="relative flex-1 h-full w-full bg-slate-950 flex flex-col overflow-hidden">
      {/* Top Preview Bar */}
      <div className="h-9 border-b border-slate-800/80 bg-slate-900/60 px-4 flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 font-medium text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sandbox Preview</span>
          </span>

          <span className="text-slate-600">|</span>

          {/* Quick viewport pill */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onChangeViewport('desktop')}
              className={`p-1 rounded ${viewport === 'desktop' ? 'text-indigo-400 font-bold' : 'hover:text-white'}`}
              title="Desktop (100%)"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeViewport('tablet')}
              className={`p-1 rounded ${viewport === 'tablet' ? 'text-indigo-400 font-bold' : 'hover:text-white'}`}
              title="Tablet (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeViewport('mobile')}
              className={`p-1 rounded ${viewport === 'mobile' ? 'text-indigo-400 font-bold' : 'hover:text-white'}`}
              title="Mobile (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title="Reload preview"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Popout in new tab */}
          <button
            onClick={handleOpenNewTab}
            title="Open in new window"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full bg-slate-950 p-3 sm:p-6 flex items-center justify-center overflow-auto relative">
        {/* Loading overlay */}
        {isGenerating && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center space-y-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 animate-ping absolute inset-0" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 relative z-10">
                <Sparkles className="w-6 h-6 text-white animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white tracking-wide">Synthesizing Website...</p>
              <p className="text-xs text-slate-400 mt-1">Generating responsive components, styling & scripts</p>
            </div>
          </div>
        )}

        {/* Viewport Frame */}
        <div className={`transition-all duration-300 relative bg-white ${getContainerStyle()}`}>
          {/* Mobile speaker notch if in mobile mode */}
          {viewport === 'mobile' && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
              <div className="w-8 h-1 bg-slate-800 rounded-full"></div>
            </div>
          )}

          {/* Sandboxed iframe */}
          <iframe
            key={reloadKey}
            ref={iframeRef}
            srcDoc={htmlCode}
            title="Website Preview"
            sandbox="allow-scripts allow-forms allow-modals allow-same-origin allow-popups"
            className="w-full h-full border-none bg-white"
          />
        </div>
      </div>
    </div>
  );
};
