import React from 'react';
import { X, Keyboard } from 'lucide-react';

export default function KeyboardShortcuts({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { keys: ['Ctrl', 'Enter'], desc: 'Launch URLs in input or active queue' },
    { keys: ['Ctrl', 'K'], desc: 'Open Command Palette' },
    { keys: ['Ctrl', 'S'], desc: 'Save current input URLs as a Session' },
    { keys: ['Ctrl', 'D'], desc: 'Navigate to Home Dashboard' },
    { keys: ['Ctrl', 'H'], desc: 'Navigate to Launch History' },
    { keys: ['Ctrl', ','], desc: 'Navigate to Settings' },
    { keys: ['?'], desc: 'Toggle this keyboard shortcuts helper panel' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl border border-indigo-500/20"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Keyboard size={22} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 light:text-slate-900">
              Keyboard Shortcuts
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {shortcuts.map((sh, idx) => (
            <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-800/40 light:border-slate-200/40">
              <span className="text-sm text-slate-400 light:text-slate-600 font-medium">
                {sh.desc}
              </span>
              <div className="flex gap-1.5 items-center">
                {sh.keys.map((key, kIdx) => (
                  <React.Fragment key={kIdx}>
                    <kbd className="h-6 px-2 min-w-[24px] inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-xs font-mono font-bold text-indigo-400 shadow-sm">
                      {key}
                    </kbd>
                    {kIdx < sh.keys.length - 1 && (
                      <span className="text-slate-600 text-xs font-bold">+</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-xl glass-button-primary font-bold text-sm"
        >
          Got It
        </button>
      </div>
    </div>
  );
}
