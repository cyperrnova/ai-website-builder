import React, { useState, useEffect } from 'react';
import { Copy, Check, Play, FileCode, RotateCcw } from 'lucide-react';

interface CodeEditorProps {
  code: string;
  onChangeCode: (newCode: string) => void;
  onApplyCode: (newCode: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChangeCode,
  onApplyCode,
}) => {
  const [localCode, setLocalCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setLocalCode(code);
    setHasUnsavedChanges(false);
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalCode(val);
    setHasUnsavedChanges(val !== code);
    onChangeCode(val);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(localCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleApply = () => {
    onApplyCode(localCode);
    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setLocalCode(code);
    setHasUnsavedChanges(false);
  };

  // Line numbers calculation
  const linesCount = localCode.split('\n').length;
  const lineNumbers = Array.from({ length: linesCount }, (_, i) => i + 1);

  return (
    <div className="flex-1 h-full w-full bg-slate-950 flex flex-col overflow-hidden border-r border-slate-800">
      {/* Editor Top Bar */}
      <div className="h-9 border-b border-slate-800/80 bg-slate-900/80 px-4 flex items-center justify-between text-xs text-slate-400 select-none">
        <div className="flex items-center space-x-2">
          <FileCode className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono text-slate-300 font-semibold">index.html</span>
          <span className="text-slate-600">({linesCount} lines)</span>
          {hasUnsavedChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-400" title="Modified" />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {hasUnsavedChanges && (
            <>
              <button
                onClick={handleReset}
                title="Discard edits"
                className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                onClick={handleApply}
                title="Apply changes to preview"
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors flex items-center space-x-1 shadow-sm"
              >
                <Play className="w-3 h-3 fill-white" />
                <span>Run</span>
              </button>
            </>
          )}

          <button
            onClick={handleCopy}
            className="px-2 py-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center space-x-1"
            title="Copy code"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="flex-1 flex overflow-hidden font-mono text-xs bg-slate-950">
        {/* Line Numbers column */}
        <div className="w-12 py-3 bg-slate-950/60 select-none border-r border-slate-900 text-slate-600 text-right pr-3 overflow-hidden">
          {lineNumbers.map((num) => (
            <div key={num} className="leading-5">
              {num}
            </div>
          ))}
        </div>

        {/* Textarea Code Input */}
        <textarea
          value={localCode}
          onChange={handleChange}
          spellCheck={false}
          className="flex-1 h-full w-full bg-transparent text-slate-200 p-3 outline-none resize-none leading-5 font-mono selection:bg-indigo-500/30 overflow-auto whitespace-pre tab-4"
        />
      </div>
    </div>
  );
};
