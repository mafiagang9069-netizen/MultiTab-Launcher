import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, AlertCircle, CheckCircle2, ChevronRight, 
  HelpCircle, Sparkles, Play, ShieldAlert, 
  Trash2, Wrench, Clipboard, X, Rocket
} from 'lucide-react';
import { parseUrls, smartRepairUrl, validateUrl } from '../utils/helpers';
import { getSessions, getSettings } from '../utils/storage';
import { useToast } from '../components/Toast';

export default function Launcher({ onLaunchQueue }) {
  const location = useLocation();
  const { showToast } = useToast();

  const [mode, setMode] = useState('single'); // 'single' | 'bulk'
  const [singleUrl, setSingleUrl] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [tabCount, setTabCount] = useState(5);
  const [openMode, setOpenMode] = useState('tab'); // 'tab' | 'window'

  // Live Preview URLs state
  const [parsedPreview, setParsedPreview] = useState([]);
  const [validCount, setValidCount] = useState(0);
  const [invalidCount, setInvalidCount] = useState(0);

  // Sync scroll refs for Bulk textarea
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  // Settings Init
  useEffect(() => {
    const settings = getSettings();
    setTabCount(settings.defaultTabCount || 5);
    setOpenMode(settings.defaultOpenMode || 'tab');
  }, []);

  // Handle Redirect Auto-launch from Sessions / Command Palette
  useEffect(() => {
    if (location.state?.autoLaunchSessionId) {
      const sessList = getSessions();
      const session = sessList.find(s => s.id === location.state.autoLaunchSessionId);
      if (session) {
        showToast(`Loading session: "${session.name}"...`, 'info');
        setTabCount(session.tabCount || 1);
        setOpenMode(session.openMode || 'tab');
        
        if (session.urls.length === 1) {
          setMode('single');
          setSingleUrl(session.urls[0]);
        } else {
          setMode('bulk');
          setBulkText(session.urls.join('\n'));
        }

        // Firing the launch queue immediately
        setTimeout(() => {
          onLaunchQueue(session.urls, session.tabCount, session.openMode, session.name);
        }, 300);
      }
    }
  }, [location.state, onLaunchQueue, showToast]);

  // Live URL parser matching
  useEffect(() => {
    const textToParse = mode === 'single' ? singleUrl : bulkText;
    if (!textToParse.trim()) {
      setParsedPreview([]);
      setValidCount(0);
      setInvalidCount(0);
      return;
    }

    const parsed = parseUrls(textToParse);
    setParsedPreview(parsed);
    
    const valid = parsed.filter(p => p.isValid).length;
    setValidCount(valid);
    setInvalidCount(parsed.length - valid);
  }, [singleUrl, bulkText, mode]);

  // Sync scrolling of textarea to line-number gutter
  const handleTextareaScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Keyboard shortcut paste helper
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (mode === 'single') {
        setSingleUrl(text.trim());
      } else {
        setBulkText(text);
      }
      showToast('Clipboard pasted successfully!', 'success');
    } catch (err) {
      showToast('Clipboard access denied. Press Ctrl+V to paste.', 'warning');
    }
  };

  // Clear inputs
  const handleClear = () => {
    if (mode === 'single') {
      setSingleUrl('');
    } else {
      setBulkText('');
    }
    showToast('Input cleared', 'info');
  };

  // Inline Preview actions
  const handleInlineDelete = useCallback((index) => {
    if (mode === 'single') {
      setSingleUrl('');
      showToast('URL removed', 'info');
    } else {
      // Split by newline/comma, remove index, join back
      const lines = bulkText.split(/[\n,]+/);
      const newLines = lines.filter((_, idx) => idx !== index);
      setBulkText(newLines.join('\n'));
      showToast('URL removed from list', 'info');
    }
  }, [bulkText, mode, showToast]);

  const handleInlineRepair = useCallback((index) => {
    if (mode === 'single') {
      setSingleUrl(smartRepairUrl(singleUrl));
      showToast('URL repaired', 'success');
    } else {
      const lines = bulkText.split(/[\n,]+/);
      if (lines[index]) {
        lines[index] = smartRepairUrl(lines[index]);
        setBulkText(lines.join('\n'));
        showToast('URL repaired', 'success');
      }
    }
  }, [bulkText, singleUrl, mode, showToast]);

  const handleLaunch = (e) => {
    e.preventDefault();

    if (parsedPreview.length === 0) {
      showToast('Please enter at least one URL', 'warning');
      return;
    }

    const validUrls = parsedPreview.filter(p => p.isValid).map(p => p.url);
    if (validUrls.length === 0) {
      showToast('No valid URLs found to launch', 'error');
      return;
    }

    onLaunchQueue(validUrls, tabCount, openMode);
  };

  // Parse single URL validation state on-the-fly
  const singleUrlParsed = useMemo(() => {
    const trimmed = singleUrl.trim();
    if (!trimmed) return null;
    const repaired = smartRepairUrl(trimmed);
    const isValid = validateUrl(repaired);
    const hasProtocol = /^[a-zA-Z0-9+-.]+:\/\//.test(trimmed);
    return {
      trimmed,
      repaired,
      isValid,
      hasProtocol
    };
  }, [singleUrl]);

  // Parse details for detailed badges in preview list
  const getUrlDetails = (urlStr) => {
    try {
      const url = new URL(urlStr);
      return {
        protocol: url.protocol.replace(':', '').toUpperCase(),
        hostname: url.hostname.replace('www.', '')
      };
    } catch {
      try {
        const url = new URL('https://' + urlStr);
        return {
          protocol: 'AUTO',
          hostname: url.hostname.replace('www.', '')
        };
      } catch {
        return {
          protocol: 'ERR',
          hostname: urlStr
        };
      }
    }
  };

  // Count lines for bulk imports
  const lineCount = useMemo(() => {
    return Math.max(1, bulkText.split('\n').length);
  }, [bulkText]);

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-[var(--text-primary)] leading-none flex items-center gap-2">
          <span>URL Launcher</span>
          <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
            Batch Mode
          </span>
        </h2>
        <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>
          Configure single or bulk URLs and batch load them in tabs or windows.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Left Columns - Form Configurations */}
        <form onSubmit={handleLaunch} className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Card 1: URL Input Configuration */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--card-border)] flex flex-col gap-5">
            <div className="flex justify-between items-center border-b border-[var(--card-border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">URL Input Configuration</h3>
              {mode === 'bulk' && parsedPreview.length > 0 && (
                <div className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: invalidCount > 0 ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.06)',
                    border: '1px solid ' + (invalidCount > 0 ? 'rgba(245,158,11,0.18)' : 'rgba(16,185,129,0.18)'),
                    color: invalidCount > 0 ? 'var(--warning)' : 'var(--success)'
                  }}>
                  {validCount} valid · {invalidCount} invalid
                </div>
              )}
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--card-border)] relative">
              <button
                type="button"
                onClick={() => setMode('single')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative z-10 ${
                  mode === 'single'
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'single' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Single URL
              </button>
              <button
                type="button"
                onClick={() => setMode('bulk')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all relative z-10 ${
                  mode === 'bulk'
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'bulk' && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                Bulk Import
              </button>
            </div>

            {/* Dynamic URL Forms */}
            <div className="min-h-[148px]">
              <AnimatePresence mode="wait">
                {mode === 'single' ? (
                  <motion.div
                    key="single"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                        Target URL
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handlePaste}
                          className="px-2.5 py-1 rounded-lg border border-[var(--input-border)] bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover-bg)] text-[10px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition"
                          title="Paste from Clipboard"
                        >
                          <Clipboard size={10} /> Paste
                        </button>
                        {singleUrl && (
                          <button
                            type="button"
                            onClick={handleClear}
                            className="px-2.5 py-1 rounded-lg border border-[var(--input-border)] bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover-bg)] text-[10px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition"
                            title="Clear Input"
                          >
                            <X size={10} /> Clear
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <input
                      type="text"
                      required
                      className="px-4 py-3 rounded-xl glass-input text-sm w-full focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="e.g. google.com or https://github.com"
                      value={singleUrl}
                      onChange={e => setSingleUrl(e.target.value)}
                    />

                    {/* Single URL Live validation message */}
                    {singleUrlParsed && (
                      <div className="flex items-center gap-2 mt-1 px-3.5 py-2.5 rounded-xl text-xs"
                        style={{
                          backgroundColor: singleUrlParsed.isValid 
                            ? (singleUrlParsed.hasProtocol ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)')
                            : 'rgba(239,68,68,0.06)',
                          border: '1px solid ' + (singleUrlParsed.isValid 
                            ? (singleUrlParsed.hasProtocol ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)')
                            : 'rgba(239,68,68,0.18)'),
                        }}>
                        {singleUrlParsed.isValid ? (
                          singleUrlParsed.hasProtocol ? (
                            <>
                              <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                              <span className="text-emerald-400 font-semibold flex-1">URL format is valid and secure.</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={13} className="text-amber-500 flex-shrink-0" />
                              <span className="text-amber-400 font-semibold flex-1">Protocol prefix is missing.</span>
                              <button
                                type="button"
                                onClick={() => setSingleUrl(singleUrlParsed.repaired)}
                                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/20 transition cursor-pointer"
                              >
                                Fix: Add https://
                              </button>
                            </>
                          )
                        ) : (
                          <>
                            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                            <span className="text-red-400 font-semibold flex-1">Invalid domain syntax or character structure.</span>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="bulk"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">
                        Bulk URLs (One per line or comma-separated)
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handlePaste}
                          className="px-2.5 py-1 rounded-lg border border-[var(--input-border)] bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover-bg)] text-[10px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition"
                          title="Paste from Clipboard"
                        >
                          <Clipboard size={10} /> Paste
                        </button>
                        {bulkText && (
                          <button
                            type="button"
                            onClick={handleClear}
                            className="px-2.5 py-1 rounded-lg border border-[var(--input-border)] bg-[var(--btn-secondary-bg)] hover:bg-[var(--btn-secondary-hover-bg)] text-[10px] font-semibold text-[var(--text-secondary)] flex items-center gap-1.5 transition"
                            title="Clear Input"
                          >
                            <X size={10} /> Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scroll Synced Line Number Textarea */}
                    <div className="flex rounded-xl glass-input overflow-hidden border border-[var(--input-border)] focus-within:border-[var(--input-focus-border)] focus-within:ring-2 focus-within:ring-indigo-500/20">
                      <div ref={gutterRef} className="bg-[var(--bg-secondary)] text-[var(--text-muted)] py-3 px-2 text-right select-none font-mono text-xs border-r border-[var(--card-border)] overflow-y-hidden w-9 h-36">
                        {Array.from({ length: lineCount }, (_, i) => (
                          <div key={i} className="h-[1.5rem] leading-[1.5rem]">{i + 1}</div>
                        ))}
                      </div>
                      <textarea
                        ref={textareaRef}
                        onScroll={handleTextareaScroll}
                        rows={6}
                        required
                        className="flex-1 px-4 py-3 bg-transparent border-0 outline-none text-xs font-mono leading-[1.5rem] resize-none h-36 overflow-y-auto"
                        placeholder="google.com&#10;chatgpt.com&#10;github.com"
                        value={bulkText}
                        onChange={e => setBulkText(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Card 2: Launch Parameters */}
          <div className="glass-card p-6 rounded-2xl border border-[var(--card-border)] flex flex-col gap-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] border-b border-[var(--card-border)] pb-3">Launch Parameters</h3>

            {/* Tab Count Range + Sync Input */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wide">
                <span style={{ color: 'var(--text-secondary)' }}>Tab Count (Per URL)</span>
                <span className="text-indigo-400 font-extrabold text-sm">{tabCount}</span>
              </div>
              <div className="flex gap-4 items-center">
                <input
                  type="range"
                  min={1}
                  max={100}
                  aria-label="Tab count range slider"
                  className="flex-1 accent-indigo-500 bg-slate-800 dark:bg-slate-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                  value={tabCount}
                  onChange={e => setTabCount(parseInt(e.target.value) || 1)}
                />
                <input
                  type="number"
                  min={1}
                  max={100}
                  aria-label="Tab count numerical input"
                  className="w-20 px-3 py-2 rounded-xl glass-input text-center text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                  value={tabCount}
                  onChange={e => setTabCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>

            {/* Open Mode Switcher */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Open Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setOpenMode('tab')}
                  aria-label="Open as new tabs"
                  className={`py-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    openMode === 'tab'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-[var(--card-border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  New Tabs
                </button>
                <button
                  type="button"
                  onClick={() => setOpenMode('window')}
                  aria-label="Open as new windows"
                  className={`py-3 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    openMode === 'window'
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                      : 'border-[var(--card-border)] bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  New Windows
                </button>
              </div>
            </div>

            {/* Impact Banner */}
            {parsedPreview.length > 0 && (
              <div className="p-3.5 rounded-xl text-xs font-medium leading-relaxed"
                style={{
                  backgroundColor: 'rgba(99,102,241,0.05)',
                  border: '1px solid rgba(99,102,241,0.15)',
                  color: 'var(--text-secondary)'
                }}>
                <span className="font-bold text-indigo-400">⚡ Action Impact: </span>
                {openMode === 'tab' ? (
                  <span>
                    Will open <strong>{validCount * tabCount}</strong> browser tabs total across <strong>{validCount}</strong> target queue URLs (each URL duplicated <strong>{tabCount}</strong> {tabCount > 1 ? 'times' : 'time'}) in a single browser session window.
                  </span>
                ) : (
                  <span>
                    Will launch <strong>{validCount}</strong> separate browser windows, with each window starting <strong>{tabCount}</strong> duplicates of its target URL.
                  </span>
                )}
              </div>
            )}

            {/* Launch Buttons */}
            <div className="flex gap-4 pt-4 border-t border-[var(--card-border)]">
              <button
                type="submit"
                disabled={validCount === 0}
                className="flex-1 py-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none transition cursor-pointer"
              >
                <Rocket size={16} className="text-white" />
                Launch Queue Assistant ({validCount} URL{validCount !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </form>

        {/* Right Column - URL Live Preview Panel */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-2xl border border-[var(--card-border)] flex-1 flex flex-col gap-4 max-h-[515px] overflow-hidden">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                URL Preview Panel
              </h3>
              <Sparkles size={16} className="text-indigo-400 animate-pulse-slow" />
            </div>

            {parsedPreview.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[var(--text-muted)] gap-2 border border-dashed border-[var(--card-border)] rounded-2xl min-h-[300px]">
                <HelpCircle size={32} className="stroke-[1.5]" />
                <span className="text-xs font-semibold">Enter URLs in the left panel to scan.</span>
              </div>
            ) : (
              <>
                {/* Stats Summary Header */}
                <div className="flex justify-between p-3 bg-[var(--bg-secondary)] rounded-xl text-xs font-bold text-[var(--text-secondary)] border border-[var(--card-border)]">
                  <span className="text-emerald-500">{validCount} Valid URLs</span>
                  <span className="text-amber-500">{invalidCount} Invalid URLs</span>
                </div>

                {/* Scanned URL List */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 p-1">
                  <AnimatePresence>
                    {parsedPreview.map((item, idx) => {
                      const details = getUrlDetails(item.raw);
                      return (
                        <motion.div 
                          key={idx + '_' + item.raw}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.15 }}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs font-mono font-medium relative group ${
                            item.isValid 
                              ? 'url-preview-valid' 
                              : 'url-preview-invalid'
                          }`}
                        >
                          <span className="shrink-0 font-sans font-bold text-[var(--text-muted)] w-4 text-center">
                            {idx + 1}
                          </span>
                          {item.isValid ? (
                            <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                          ) : (
                            <AlertCircle size={13} className="shrink-0 text-amber-500" />
                          )}

                          {/* Protocol Badge */}
                          <span className={`text-[8px] font-bold px-1.5 py-0.2 rounded font-sans shrink-0 ${
                            item.isValid 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {details.protocol}
                          </span>

                          <span className="truncate flex-1" style={{ color: item.isValid ? 'var(--text-primary)' : 'var(--text-muted)' }} title={item.url}>
                            {item.url}
                          </span>

                          {/* Inline Hover Action Buttons */}
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-transparent">
                            {!item.isValid && (
                              <button
                                type="button"
                                onClick={() => handleInlineRepair(idx)}
                                className="p-1 rounded bg-[var(--btn-secondary-bg)] hover:bg-emerald-500/10 border border-[var(--input-border)] text-slate-400 hover:text-emerald-500 transition cursor-pointer"
                                title="Prepend https://"
                              >
                                <Wrench size={11} />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleInlineDelete(idx)}
                              className="p-1 rounded bg-[var(--btn-secondary-bg)] hover:bg-red-500/10 border border-[var(--input-border)] text-slate-400 hover:text-red-500 transition cursor-pointer"
                              title="Delete URL"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
