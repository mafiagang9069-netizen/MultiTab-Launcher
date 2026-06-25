import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, X, RefreshCw, Eye, RotateCcw, 
  Trash2, FolderHeart, Share2, ChevronLeft, 
  ChevronRight, AlertCircle, Pin, Search, Clock,
  Minimize2
} from 'lucide-react';
import { saveSession, getSettings } from '../utils/storage';
import { useToast } from './Toast';

export default function ActiveTabManager({ 
  tabs = [], 
  onCloseTab, 
  onFocusTab, 
  onReopenTab,
  onCloseAll,
  onFocusAll,
  onReopenClosed,
  onRemoveClosed,
  onPinTab,
  recentlyClosed = [],
  onReopenClosedTab,
  onRemoveClosedTab,
  onClearRecentlyClosed,
  onRefresh,
  isQueueActive = false
}) {
  const { showToast } = useToast();
  
  // Drawer Open/Closed state (defaults to false as per requirement)
  const [isOpen, setIsOpen] = useState(false);

  // Drawer Visible state (Close hides it completely)
  const [isVisible, setIsVisible] = useState(true);

  const [workspaceName, setWorkspaceName] = useState('');
  const [activePanel, setActivePanel] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [isSaveOpen, setIsSaveOpen] = useState(false);

  // Calculations derived from tabs state
  const successfulCount = tabs.filter(t => t.status === 'opened').length;
  const blockedCount = tabs.filter(t => t.status === 'blocked').length;
  const failedCount = tabs.filter(t => t.status === 'failed').length;

  const processedCount = successfulCount + blockedCount + failedCount;

  const successRate = processedCount > 0
    ? Math.round((successfulCount / processedCount) * 100)
    : 0;

  const closedCount = tabs.filter(t => t.status === 'closed').length;
  const currentlyActive = successfulCount;

  // Persist open/close state
  useEffect(() => {
    localStorage.setItem('mt_active_tab_manager_open', isOpen ? 'true' : 'false');
  }, [isOpen]);

  // Support custom event to open the drawer remotely, only if queue is not active
  useEffect(() => {
    const handleOpenRemote = () => {
      if (isQueueActive) return;
      setIsVisible(true);
      setIsOpen(true);
    };
    window.addEventListener('mt_open_tab_manager', handleOpenRemote);
    return () => window.removeEventListener('mt_open_tab_manager', handleOpenRemote);
  }, [isQueueActive]);

  // Expand and show drawer automatically whenever tabs list increases (i.e. new launch triggered)
  const prevTabsLengthRef = useRef(tabs.length);
  useEffect(() => {
    if (tabs.length > prevTabsLengthRef.current) {
      setIsVisible(true);
      
      const settings = getSettings();
      if (settings.autoOpenWorkspaceManager && !isQueueActive) {
        setIsOpen(true);
      }
    }
    prevTabsLengthRef.current = tabs.length;
  }, [tabs, isQueueActive]);

  // Automatically close tab manager drawer if launch queue assistant opens
  useEffect(() => {
    if (isQueueActive) {
      setIsOpen(false);
    }
  }, [isQueueActive]);

  // Support ESC Key to close
  useEffect(() => {
    if (isQueueActive) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isQueueActive]);

  // Auto-collapse after 5 seconds of inactivity when active tabs is zero
  useEffect(() => {
    if (isQueueActive) return;
    if (currentlyActive === 0 && isOpen && isVisible) {
      const timer = setTimeout(() => {
        const idleTime = Date.now() - lastInteractionTime;
        if (idleTime >= 5000) {
          setIsOpen(false);
          showToast('Drawer collapsed due to no active tabs.', 'info');
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentlyActive, isOpen, isVisible, lastInteractionTime, isQueueActive]);

  const handleInteraction = () => {
    setLastInteractionTime(Date.now());
  };

  const handleSaveWorkspace = (e) => {
    e.preventDefault();
    if (!workspaceName.trim()) {
      showToast('Please enter a workspace name', 'warning');
      return;
    }

    const urls = tabs.filter(t => t.status === 'opened').map(t => t.url);
    saveSession({
      name: workspaceName.trim(),
      urls,
      tabCount: 1,
      openMode: 'tab',
      group: 'Saved Workspaces'
    });

    showToast(`Workspace "${workspaceName}" saved to Sessions!`, 'success');
    setWorkspaceName('');
    setIsSaveOpen(false);
  };

  const handleExportSession = () => {
    const urls = tabs.filter(t => t.status === 'opened').map(t => t.url);
    const payload = {
      version: '1.0',
      name: `Workspace Export (${new Date().toLocaleDateString()})`,
      urls,
      tabCount: 1,
      openMode: 'tab',
      group: 'Imported'
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    showToast('Session export JSON copied to clipboard!', 'success');
  };

  const getDomainName = (urlStr) => {
    try {
      const url = new URL(urlStr);
      return url.hostname.replace('www.', '');
    } catch (e) {
      return urlStr;
    }
  };

  // Filtered/Sorted tabs
  const filteredActiveTabs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const list = tabs.filter(t => {
      if (q.length === 0) return true;
      return t.url.toLowerCase().includes(q) || getDomainName(t.url).toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0;
    });
  }, [tabs, searchQuery]);

  const filteredClosedTabs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return recentlyClosed.filter(t => {
      if (q.length === 0) return true;
      return t.url.toLowerCase().includes(q) || getDomainName(t.url).toLowerCase().includes(q);
    });
  }, [recentlyClosed, searchQuery]);

  if (!isVisible) return null;

  return (
    <>
      {/* Click outside backdrop blocker */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[9998] bg-slate-950/20 backdrop-blur-[0.5px] cursor-default pointer-events-auto"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Active Tab Manager Shell */}
      <div className="fixed top-0 bottom-0 right-0 z-[9999] flex items-center pointer-events-none h-screen">
        <AnimatePresence>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: isOpen ? 0 : '100%' }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25, ease: 'easeInOut' }}
            onMouseMove={handleInteraction}
            onMouseEnter={handleInteraction}
            onClick={handleInteraction}
            className="pointer-events-auto w-full sm:w-[380px] lg:w-[420px] h-full glass-card border-y-0 border-r-0 flex flex-col justify-between shadow-2xl relative"
            style={{
              backgroundColor: 'var(--drawer-bg)',
              borderColor: 'var(--drawer-border)',
              boxShadow: 'var(--drawer-shadow)'
            }}
          >
            {/* Slide toggle handle docked to the left edge */}
            {!isQueueActive && (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute top-1/2 -translate-y-1/2 -left-8 w-8 h-16 rounded-l-2xl shadow-lg border border-r-0 flex items-center justify-center cursor-pointer pointer-events-auto"
                style={{
                  backgroundColor: 'var(--drawer-handle-bg)',
                  borderColor: 'var(--drawer-border)',
                  color: 'var(--drawer-handle-text)'
                }}
                title={isOpen ? 'Collapse Tab Manager' : 'Expand Tab Manager'}
              >
                {isOpen ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
            )}

            {/* Header controls section */}
            <div className="p-5 border-b border-[var(--card-border)] flex flex-col gap-4 relative">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-[var(--text-primary)] leading-none pr-8">
                    Workspace Tabs
                  </h3>
                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1.5 block">
                    Active Diagnostics
                  </span>
                </div>

                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-indigo-500 hover:bg-[var(--sidebar-hover-bg)] transition shrink-0"
                  title="Collapse Drawer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Header Controls Bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={onRefresh}
                  className="px-2.5 py-1.5 rounded-lg glass-button-secondary text-[10px] font-bold transition flex items-center gap-1.5"
                  title="Refresh Tab Statuses"
                >
                  <RefreshCw size={11} />
                  <span>Refresh</span>
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-2.5 py-1.5 rounded-lg glass-button-secondary text-[10px] font-bold transition flex items-center gap-1.5"
                  title="Minimize to Handle"
                >
                  <Minimize2 size={11} />
                  <span>Minimize</span>
                </button>
                
                <button
                  onClick={() => setIsVisible(false)}
                  className="px-2.5 py-1.5 rounded-lg glass-button-secondary text-[10px] font-bold hover:text-red-500 transition flex items-center gap-1.5"
                  title="Hide Panel Completely"
                >
                  <X size={11} />
                  <span>Close Panel</span>
                </button>
              </div>
            </div>

            {/* Sub-panels Switcher */}
            <div className="px-5 mt-3">
              <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--card-border)]">
                <button
                  onClick={() => {
                    setActivePanel('active');
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activePanel === 'active'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Globe size={12} />
                  Active ({currentlyActive})
                </button>
                <button
                  onClick={() => {
                    setActivePanel('closed');
                    setSearchQuery('');
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activePanel === 'closed'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Clock size={12} />
                  Closed ({recentlyClosed.length})
                </button>
              </div>
            </div>

            {/* Search Bar inside Sidebar */}
            <div className="px-5 mt-3">
              <div className="flex items-center gap-2 bg-[var(--input-bg)] px-3 py-1.5 rounded-lg border border-[var(--input-border)] focus-within:border-[var(--input-focus-border)]">
                <Search size={12} className="text-slate-500" />
                <input
                  type="text"
                  placeholder={activePanel === 'active' ? "Search active tabs..." : "Search closed tabs..."}
                  className="bg-transparent border-0 outline-0 text-[11px] text-[var(--text-primary)] placeholder-[var(--text-muted)] w-full"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery.length > 0 && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-350">
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Tab Lists */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
              
              {/* PANEL 1: ACTIVE TABS */}
              {activePanel === 'active' && (
                <>
                  {currentlyActive === 0 && (
                    <div className="flex flex-col items-center justify-center p-6 text-center text-[var(--text-muted)] text-xs border border-dashed border-[var(--card-border)] rounded-2xl gap-2 mt-4">
                      <AlertCircle size={20} className="text-[var(--text-muted)] animate-pulse" />
                      <span className="font-bold text-[var(--text-secondary)]">No active tabs</span>
                      <span className="text-[9px] text-[var(--text-muted)] leading-normal">
                        All tabs in this workspace session are closed. Auto-collapsing in 5 seconds...
                      </span>
                    </div>
                  )}

                  {currentlyActive > 0 && filteredActiveTabs.length === 0 && (
                    <div className="text-center py-12 text-[var(--text-muted)] text-xs font-semibold">
                      No active matching tabs.
                    </div>
                  )}

                  {filteredActiveTabs.map((tab) => {
                    const isActive = tab.status === 'opened';
                    return (
                      <div
                        key={tab.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 ${
                          isActive 
                            ? 'bg-[var(--bg-secondary)] border-[var(--card-border)] hover:border-indigo-500/30' 
                            : 'bg-[var(--bg-secondary)]/50 border-dashed border-[var(--card-border)] opacity-50'
                        } ${tab.pinned ? 'ring-1 ring-amber-500/40 border-amber-500/20' : ''}`}
                      >
                        <div className="flex items-center gap-2 truncate flex-1 pr-2">
                          <button
                            onClick={() => onPinTab(tab.id)}
                            className={`p-1 rounded transition ${
                              tab.pinned ? 'text-amber-500 hover:text-amber-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                            }`}
                            title={tab.pinned ? 'Unpin Tab' : 'Pin Tab'}
                          >
                            <Pin size={11} className={tab.pinned ? 'fill-amber-500' : ''} />
                          </button>

                          <div className="flex flex-col truncate leading-tight">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className={`text-[11px] font-bold truncate ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                {getDomainName(tab.url)}
                              </span>
                              {tab.status === 'closed' && (
                                <span className="text-[8px] font-bold bg-[var(--btn-secondary-bg)] text-[var(--text-muted)] px-1 rounded border border-[var(--card-border)]">Closed</span>
                              )}
                              {tab.status === 'blocked' && (
                                <span className="text-[8px] font-bold bg-amber-500/10 text-amber-500 px-1 rounded border border-amber-500/20">Blocked</span>
                              )}
                              {tab.status === 'failed' && (
                                <span className="text-[8px] font-bold bg-red-500/10 text-red-500 px-1 rounded border border-red-500/20">Failed</span>
                              )}
                            </div>
                            <span className="text-[9px] text-[var(--text-secondary)] font-medium truncate font-mono mt-0.5" title={tab.url}>
                              {tab.url}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          {isActive ? (
                            <>
                              <button
                                onClick={() => onFocusTab(tab.id)}
                                className="p-1 rounded hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 transition"
                                title="Focus Tab"
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => onCloseTab(tab.id)}
                                className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition"
                                title="Close Tab"
                              >
                                <X size={12} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => onReopenTab(tab.id)}
                              className="p-1 rounded hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-500 transition"
                              title="Reopen Tab"
                            >
                              <RotateCcw size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* PANEL 2: RECENTLY CLOSED TABS */}
              {activePanel === 'closed' && (
                <>
                  {filteredClosedTabs.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                      No closed tabs found.
                    </div>
                  ) : (
                    filteredClosedTabs.map((tab) => (
                      <div
                        key={tab.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--card-border)] bg-[var(--bg-secondary)] hover:border-indigo-500/20 transition"
                      >
                        <div className="flex flex-col truncate flex-1 pr-2 leading-tight">
                          <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">
                            {getDomainName(tab.url)}
                          </span>
                          <span className="text-[9px] text-[var(--text-secondary)] font-medium truncate font-mono mt-0.5" title={tab.url}>
                            {tab.url}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => onReopenClosedTab(tab.url, tab.id)}
                            className="p-1 rounded hover:bg-indigo-500/10 text-slate-500 hover:text-indigo-400 transition"
                            title="Reopen Closed Tab"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button
                            onClick={() => onRemoveClosedTab(tab.id)}
                            className="p-1 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition"
                            title="Remove from history"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

             {/* Bottom Controls / Bulk Actions */}
            <div className="p-4 border-t border-[var(--card-border)] flex flex-col gap-3">
              {/* Stats Summary Panel */}
              <div className="grid grid-cols-3 gap-2 text-center leading-none mb-2">
                <div className="bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--card-border)] flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">Total Opened</span>
                  <span className="text-xs font-extrabold text-[var(--text-primary)]">{successfulCount}</span>
                </div>
                <div className="bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--card-border)] flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-[var(--text-secondary)] uppercase tracking-wide">Closed</span>
                  <span className="text-xs font-extrabold text-[var(--text-secondary)]">{closedCount}</span>
                </div>
                <div className="bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--card-border)] flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wide">Success Rate</span>
                  <span className="text-xs font-extrabold text-emerald-500">{successRate}%</span>
                </div>
              </div>

              {/* Diagnostics Panel */}
              <div className="grid grid-cols-3 gap-2 text-center leading-none mb-1">
                <div className="bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--card-border)] flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wide">Successful</span>
                  <span className="text-xs font-extrabold text-emerald-400">{successfulCount}</span>
                </div>
                <div className="bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--card-border)] flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-red-400 uppercase tracking-wide">Failed</span>
                  <span className="text-xs font-extrabold text-red-400">{failedCount}</span>
                </div>
                <div className="bg-[var(--bg-secondary)] p-2 rounded-xl border border-[var(--card-border)] flex flex-col gap-1">
                  <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wide">Blocked</span>
                  <span className="text-xs font-extrabold text-amber-500">{blockedCount}</span>
                </div>
              </div>

              {/* Bulk operations grid */}
              {activePanel === 'active' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onFocusAll}
                    disabled={currentlyActive === 0}
                    className="py-2 rounded-xl glass-button-secondary font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Focus all open tabs"
                  >
                    <Eye size={12} /> Focus All
                  </button>

                  <button
                    onClick={onCloseAll}
                    disabled={currentlyActive === 0}
                    className="py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50 transition"
                    title="Close all open tabs"
                  >
                    <X size={12} /> Close All
                  </button>

                  <button
                    onClick={onReopenClosed}
                    disabled={closedCount === 0}
                    className="py-2 rounded-xl glass-button-secondary font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Reopen all closed links"
                  >
                    <RotateCcw size={12} /> Reopen Closed
                  </button>

                  <button
                    onClick={onRemoveClosed}
                    disabled={closedCount === 0}
                    className="py-2 rounded-xl glass-button-secondary font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                    title="Clean closed rows"
                  >
                    <Trash2 size={12} /> Remove Closed
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={onClearRecentlyClosed}
                    disabled={recentlyClosed.length === 0}
                    className="py-2 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50 transition"
                  >
                    <Trash2 size={12} /> Clear Closed History
                  </button>
                </div>
              )}

              {/* Session / Export Actions */}
              {currentlyActive > 0 && activePanel === 'active' && (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setIsSaveOpen(!isSaveOpen)}
                      className="flex-1 py-2 rounded-xl glass-button-secondary font-bold text-xs flex items-center justify-center gap-1 transition"
                    >
                      <FolderHeart size={12} /> Save Session
                    </button>
                    <button
                      onClick={handleExportSession}
                      className="flex-1 py-2 rounded-xl glass-button-secondary font-bold text-xs flex items-center justify-center gap-1 transition"
                    >
                      <Share2 size={12} /> Export JSON
                    </button>
                  </div>
                  
                  {isSaveOpen && (
                    <form onSubmit={handleSaveWorkspace} className="flex flex-col gap-2 mt-1 p-3 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-[var(--text-secondary)] uppercase">Workspace Name</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Daily Dev, Socials"
                            value={workspaceName}
                            onChange={e => setWorkspaceName(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
                          />
                          <button
                            type="submit"
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
