import React from 'react';
import { ShieldAlert, AlertTriangle, Play, ChevronRight } from 'lucide-react';

export default function DuplicateModal({ isOpen, onClose, data, onLaunch }) {
  if (!isOpen || !data) return null;

  const { urls, tabCount, openMode, sessionName, exactMatches, domainMatches } = data;

  const handleSkipExact = () => {
    // Filter out exact matches
    const activeOpenedUrls = exactMatches;
    const filtered = urls.filter(url => !activeOpenedUrls.includes(url));
    onLaunch(filtered);
    onClose();
  };

  const handleSkipSameDomain = () => {
    // Filter out same domains
    const blockedDomains = domainMatches.map(url => {
      try { return new URL(url).hostname; } catch (e) { return ''; }
    }).filter(d => d.length > 0);

    const filtered = urls.filter(url => {
      try {
        const domain = new URL(url).hostname;
        return !blockedDomains.includes(domain);
      } catch (e) {
        return true;
      }
    });
    onLaunch(filtered);
    onClose();
  };

  const handleLaunchAll = () => {
    onLaunch(urls);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="w-full max-w-md glass-card rounded-2xl p-6 shadow-2xl border border-indigo-500/20 my-8 flex flex-col gap-5 text-center items-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
          <ShieldAlert size={28} />
        </div>

        <div className="flex flex-col gap-1.5">
          <h3 className="font-extrabold text-lg text-slate-100">Duplicate Open Tabs Detected</h3>
          <p className="text-xs text-slate-400 leading-normal">
            Some URLs or domains in this workspace are already open in your active tabs manager.
          </p>
        </div>

        {/* Matches summary */}
        <div className="w-full flex flex-col gap-2 bg-slate-950/40 p-3.5 rounded-xl border border-slate-900 text-left">
          {exactMatches.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <span className="text-[11px] text-slate-400 font-semibold leading-normal">
                <strong className="text-amber-400">{exactMatches.length} exact URL match(es)</strong> are already open in the active tabs sidebar.
              </span>
            </div>
          )}
          {domainMatches.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-indigo-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-slate-400 font-semibold leading-normal">
                <strong className="text-indigo-400">{domainMatches.length} domain match(es)</strong> have open tabs on the same site.
              </span>
            </div>
          )}
        </div>

        {/* Options actions buttons */}
        <div className="flex flex-col gap-2.5 w-full">
          <button
            onClick={handleSkipExact}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-850 text-indigo-400 font-bold text-xs flex items-center justify-between transition"
          >
            <span>Skip Exact Matches ({exactMatches.length})</span>
            <ChevronRight size={14} />
          </button>

          <button
            onClick={handleSkipSameDomain}
            className="w-full px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-850 text-amber-400 font-bold text-xs flex items-center justify-between transition"
          >
            <span>Skip Same Domain ({domainMatches.length})</span>
            <ChevronRight size={14} />
          </button>

          <div className="flex gap-2 w-full mt-1.5">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleLaunchAll}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 hover:scale-[1.02] transition"
            >
              <Play size={12} fill="currentColor" />
              Launch Everything
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
