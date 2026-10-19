import React from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Template } from '../types';
import { STARTER_TEMPLATES } from '../data/templates';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: Template) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Starter Templates & Blueprints</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a production-ready starter or prompt AI to build your bespoke site.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {STARTER_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="group rounded-2xl bg-slate-800/40 border border-slate-700/60 hover:border-indigo-500/60 transition-all flex flex-col overflow-hidden hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
            >
              {/* Thumbnail banner */}
              <div
                className={`h-32 bg-gradient-to-tr ${tpl.thumbnailGradient} p-4 flex flex-col justify-between text-white`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black/40 backdrop-blur px-2.5 py-1 rounded-full w-max">
                  {tpl.category}
                </span>
                <span className="text-xs font-mono font-medium opacity-90">
                  {tpl.stylePreset}
                </span>
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-indigo-400 transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectTemplate(tpl);
                    onClose();
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white text-xs font-semibold transition-all flex items-center justify-center space-x-1.5 border border-slate-700 hover:border-transparent group-hover:bg-indigo-600 group-hover:text-white"
                >
                  <span>Load Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
