import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import Background from './components/Background';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import LaunchQueueAssistant from './components/LaunchQueueAssistant';
import { ToastProvider, useToast } from './components/Toast';
import ActiveTabManager from './components/ActiveTabManager';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalSearchModal from './components/GlobalSearchModal';
import DuplicateModal from './components/DuplicateModal';

// Lazy-loaded Pages
const Landing = React.lazy(() => import('./pages/Landing'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Launcher = React.lazy(() => import('./pages/Launcher'));
const Sessions = React.lazy(() => import('./pages/Sessions'));
const History = React.lazy(() => import('./pages/History'));
const BlockerTest = React.lazy(() => import('./pages/BlockerTest'));
const Settings = React.lazy(() => import('./pages/Settings'));
const About = React.lazy(() => import('./pages/About'));

import {
  getSettings,
  getSchedules,
  getSessions,
  addHistoryEntry,
  saveSettings,
  saveCheckpoint,
  getCheckpoints,
  loadWorkspace,
  saveWorkspace,
  getActiveProfile,
  setActiveProfile,
  addAuditLog,
  clearCheckpoints
} from './utils/storage';
import { initTheme, toggleTheme } from './utils/theme';

// ─── Security: safe URL open with scheme validation ───────────────────────────
const ALLOWED_SCHEMES = ['https:', 'http:'];
function safeWindowOpen(url, target = '_blank') {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
      console.warn('[Security] Blocked non-http URL open:', url);
      return null;
    }
    const win = window.open(url, target);
    if (win) {
      try { win.opener = null; } catch {}
    }
    return win;
  } catch {
    // Not a valid URL at all
    console.warn('[Security] Blocked invalid URL open:', url);
    return null;
  }
}

function LoadingSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 min-h-[400px]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase animate-pulse">Loading Workspace...</p>
      </div>
    </div>
  );
}

// ─── Helper: safe hostname parse (handles bare domains) ───────────────────────
function safeHostname(url) {
  try { return new URL(url).hostname; } catch { /* ignore */ }
  try { return new URL('https://' + url).hostname; } catch { /* ignore */ }
  return '';
}

// ─── Helper: relative time calculation for checkpoint age ────────────────────
function getRelativeTime(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return new Date(timestamp).toLocaleDateString();
}

function AppContent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isPopout = new URLSearchParams(window.location.search).get('popout') === 'true';

  // Profile State
  const [profile, setProfile] = useState('Development');
  // Theme State
  const [theme, setTheme] = useState('dark');
  // Modal states
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);
  // Queue state
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [queueUrls, setQueueUrls] = useState([]);
  const [queueTabCount, setQueueTabCount] = useState(1);
  const [queueOpenMode, setQueueOpenMode] = useState('tab');
  const [queueSessionName, setQueueSessionName] = useState(null);
  const [queueInitialCurrentIndex, setQueueInitialCurrentIndex] = useState(0);
  const [queueInitialStatuses, setQueueInitialStatuses] = useState([]);
  // Schedule tracker (ref so we don't re-run init effect)
  const lastTriggeredMapRef = useRef({});
  // Active Tabs tracking
  const [activeTabs, setActiveTabs] = useState([]);
  // Recently Closed Tabs
  const [recentlyClosed, setRecentlyClosed] = useState([]);
  // Recovery
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [latestCheckpoint, setLatestCheckpoint] = useState(null);

  // Stable ref so intervals always read latest activeTabs without re-subscribing
  const activeTabsRef = useRef(activeTabs);
  useEffect(() => { activeTabsRef.current = activeTabs; }, [activeTabs]);

  // ─── FIX: Stable recently-closed ref for use inside intervals ──────────────
  const recentlyClosedRef = useRef(recentlyClosed);
  useEffect(() => { recentlyClosedRef.current = recentlyClosed; }, [recentlyClosed]);

  // ─── Init Effect: runs once on mount ───────────────────────────────────────
  useEffect(() => {
    initTheme();
    const settings = getSettings();
    setTheme(settings.theme || 'dark');
    const actProfile = getActiveProfile();
    setProfile(actProfile);
    setRecentlyClosed(settings.recentlyClosed || []);

    // Recovery Check
    const checkpoints = getCheckpoints();
    if (!settings.cleanShutdown && checkpoints.length > 0) {
      const latest = checkpoints[0];
      const age = Date.now() - new Date(latest.timestamp).getTime();
      const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > MAX_AGE) {
        clearCheckpoints();
      } else {
        setLatestCheckpoint(latest);
        setShowRecoveryPrompt(true);
      }
    }

    saveSettings({ cleanShutdown: false, lastHeartbeat: Date.now() });

    // Heartbeat
    const heartbeatInterval = setInterval(() => {
      saveSettings({ lastHeartbeat: Date.now() });
    }, 10000);

    // 5-min auto checkpoint
    const checkpointInterval = setInterval(() => {
      const currentProf = getActiveProfile();
      saveCheckpoint(activeTabsRef.current, currentProf);
      showToast('Workspace checkpoint auto-saved.', 'info');
    }, 300000);

    const handleUnload = () => saveSettings({ cleanShutdown: true });
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(checkpointInterval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []); // ← runs once only


  // ─── FIX: Schedule polling in its own stable interval ──────────────────────
  useEffect(() => {
    const checkSchedulesFn = () => {
      const schedules = getSchedules();
      if (!schedules.length) return;

      const now = new Date();
      const currentHHMM = now.toTimeString().slice(0, 5);
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      schedules.forEach((sch) => {
        if (!sch.active || sch.time !== currentHHMM) return;

        let matchDay = false;
        if (sch.frequency === 'daily') matchDay = true;
        else if (sch.frequency === 'weekday' && !isWeekend) matchDay = true;
        else if (sch.frequency === 'weekend' && isWeekend) matchDay = true;
        if (!matchDay) return;

        const minuteKey = `${sch.id}_${currentHHMM}`;
        if (!lastTriggeredMapRef.current[minuteKey]) {
          lastTriggeredMapRef.current[minuteKey] = true;
          showToast(
            `Scheduled workspace "${sch.sessionName}" is ready.`,
            'info',
            {
              label: 'Open Queue',
              onClick: () => {
                const sessList = getSessions();
                const targetSess = sessList.find(s => s.id === sch.sessionId);
                if (targetSess) {
                  handleLaunchQueue(targetSess.urls, targetSess.tabCount, targetSess.openMode, targetSess.name);
                } else {
                  showToast('Scheduled session not found', 'error');
                }
              }
            }
          );
        }
      });
    };

    const interval = setInterval(checkSchedulesFn, 10000);
    return () => clearInterval(interval);
  }, []); // ← stable, no deps needed thanks to refs

  // ─── FIX: Tab-closed polling uses ref, NOT activeTabs in deps ──────────────
  // This prevents creating a new interval every 1.5s on every tab change.
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const current = activeTabsRef.current;
      const hasClosed = current.some(t => t.status === 'opened' && t.windowRef?.closed);
      if (!hasClosed) return;

      const closedUrls = [];
      const updated = current.map(tab => {
        if (tab.status === 'opened' && tab.windowRef?.closed) {
          closedUrls.push(tab.url);
          return { ...tab, status: 'closed' };
        }
        return tab;
      });

      setActiveTabs(updated);
      closedUrls.forEach(url => addToRecentlyClosed(url));
    }, 1500);

    return () => clearInterval(pollInterval);
  }, []); // ← runs once, reads via ref

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalKeys = (e) => {
      const settings = getSettings();
      if (!settings.enableShortcuts) return;

      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );

      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault(); setIsSearchOpen(prev => !prev); return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setIsPaletteOpen(prev => !prev); return;
      }
      if (isTyping) return;
      if (e.key === '?') { e.preventDefault(); setIsShortcutsOpen(prev => !prev); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'h') { e.preventDefault(); navigate('/history'); }
      else if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); navigate('/'); }
      else if (e.ctrlKey && e.key === ',') { e.preventDefault(); navigate('/settings'); }
      else if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        navigate('/sessions');
        showToast('Create a new workspace session configuration.', 'info');
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [navigate]);

  // ─── Recently Closed ────────────────────────────────────────────────────────
  const addToRecentlyClosed = useCallback((url) => {
    setRecentlyClosed(prev => {
      const filtered = prev.filter(c => c.url !== url);
      const updated = [
        { id: 'rc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5), url, closedAt: new Date().toISOString() },
        ...filtered
      ];
      if (updated.length > 50) updated.pop();
      saveSettings({ recentlyClosed: updated });
      return updated;
    });
  }, []);

  const handleReopenClosedTab = useCallback((url, id) => {
    const win = safeWindowOpen(url);
    if (win && !win.closed) {
      handleTabOpened(url, win, 'opened');
      handleRemoveClosedTab(id);
    } else {
      showToast('Popup blocked by browser.', 'error');
    }
  }, []);

  const handleRemoveClosedTab = useCallback((id) => {
    setRecentlyClosed(prev => {
      const updated = prev.filter(c => c.id !== id);
      saveSettings({ recentlyClosed: updated });
      return updated;
    });
  }, []);

  const handleClearRecentlyClosed = useCallback(() => {
    setRecentlyClosed([]);
    saveSettings({ recentlyClosed: [] });
    showToast('Recently closed tabs history cleared.', 'info');
  }, []);

  // ─── Launch Queue ───────────────────────────────────────────────────────────
  const proceedLaunchQueue = useCallback((urls, tabCount, openMode, sessionName = null, initIdx = 0, initStatuses = []) => {
    if (!urls.length) { showToast('Queue contains no URLs to open.', 'warning'); return; }

    const settings = getSettings();
    if (settings.autoSaveHistory) addHistoryEntry({ urls, tabCount, openMode, sessionName });

    const parsedCount = parseInt(tabCount) || 1;
    const flatQueue = [];
    urls.forEach(url => { for (let i = 0; i < parsedCount; i++) flatQueue.push(url); });

    setQueueUrls(flatQueue);
    setQueueTabCount(1);
    setQueueOpenMode(openMode);
    setQueueSessionName(sessionName);
    setQueueInitialCurrentIndex(initIdx);
    setQueueInitialStatuses(initStatuses);
    setIsQueueOpen(true);
  }, []);

  // ─── Popout Launch Check ──────────────────────────────────────────────────
  useEffect(() => {
    const isPopout = new URLSearchParams(window.location.search).get('popout') === 'true';
    if (isPopout) {
      try {
        const raw = localStorage.getItem('mt_popout_queue');
        if (raw) {
          const data = JSON.parse(raw);
          localStorage.removeItem('mt_popout_queue');
          
          proceedLaunchQueue(
            data.queue || [],
            data.tabCount || 1,
            data.openMode || 'tab',
            data.sessionName || null,
            data.currentIndex || 0,
            data.statuses || []
          );
        }
      } catch (e) {
        console.error('Error loading popout queue', e);
      }
    }
  }, [proceedLaunchQueue]);

  const handleLaunchQueue = useCallback((urls, tabCount, openMode, sessionName = null) => {
    // Only check tabs genuinely still open in the browser
    const reallyOpenTabs = activeTabsRef.current.filter(t =>
      t.status === 'opened' && t.windowRef && !t.windowRef.closed
    );

    if (!reallyOpenTabs.length) {
      proceedLaunchQueue(urls, tabCount, openMode, sessionName);
      return;
    }

    const openUrls = reallyOpenTabs.map(t => t.url);
    const openDomains = reallyOpenTabs.map(t => safeHostname(t.url)).filter(Boolean);
    const exactMatches = urls.filter(url => openUrls.includes(url));
    const domainMatches = urls.filter(url => {
      const d = safeHostname(url);
      return d && openDomains.includes(d);
    });

    if (exactMatches.length > 0 || domainMatches.length > 0) {
      setDuplicateData({ urls, tabCount, openMode, sessionName, exactMatches, domainMatches });
      setIsDuplicateOpen(true);
    } else {
      proceedLaunchQueue(urls, tabCount, openMode, sessionName);
    }
  }, [proceedLaunchQueue]);

  // ─── Tab Handlers (all memoized) ────────────────────────────────────────────
  const handleTabOpened = useCallback((url, win, status = 'opened') => {
    setActiveTabs(prev => [...prev, {
      id: 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      url, openedAt: new Date().toISOString(), status, windowRef: win, pinned: false
    }]);
  }, []);

  const handleCloseTab = useCallback((id) => {
    setActiveTabs(prev => prev.map(tab => {
      if (tab.id !== id) return tab;
      try { tab.windowRef?.close(); addToRecentlyClosed(tab.url); } catch {}
      return { ...tab, status: 'closed' };
    }));
  }, [addToRecentlyClosed]);

  const handleFocusTab = useCallback((id) => {
    const tab = activeTabsRef.current.find(t => t.id === id);
    if (tab?.windowRef) try { tab.windowRef.focus(); } catch {}
  }, []);

  const handleReopenTab = useCallback((id) => {
    setActiveTabs(prev => prev.map(tab => {
      if (tab.id !== id) return tab;
      const win = safeWindowOpen(tab.url);
      if (win && !win.closed) return { ...tab, status: 'opened', windowRef: win };
      return { ...tab, status: 'blocked', windowRef: null };
    }));
  }, []);

  const handleCloseAll = useCallback(() => {
    setActiveTabs(prev => prev.map(tab => {
      if (tab.status !== 'opened') return tab;
      try { tab.windowRef?.close(); addToRecentlyClosed(tab.url); } catch {}
      return { ...tab, status: 'closed' };
    }));
  }, [addToRecentlyClosed]);

  const handleFocusAll = useCallback(() => {
    activeTabsRef.current.forEach(tab => {
      if (tab.status === 'opened' && tab.windowRef) try { tab.windowRef.focus(); } catch {}
    });
  }, []);

  const handleReopenClosed = useCallback(() => {
    setActiveTabs(prev => prev.map(tab => {
      if (tab.status !== 'closed') return tab;
      const win = safeWindowOpen(tab.url);
      if (win && !win.closed) return { ...tab, status: 'opened', windowRef: win };
      return { ...tab, status: 'blocked', windowRef: null };
    }));
  }, []);

  const handleRemoveClosed = useCallback(() => {
    setActiveTabs(prev => prev.filter(tab => tab.status === 'opened'));
  }, []);

  const handlePinTab = useCallback((id) => {
    setActiveTabs(prev => prev.map(tab => tab.id === id ? { ...tab, pinned: !tab.pinned } : tab));
  }, []);

  const handleRefreshActiveTabs = useCallback(() => {
    let changed = false;
    const closedUrls = [];
    const updated = activeTabsRef.current.map(tab => {
      if (tab.status === 'opened' && tab.windowRef?.closed) {
        changed = true; closedUrls.push(tab.url);
        return { ...tab, status: 'closed' };
      }
      return tab;
    });
    if (changed) {
      setActiveTabs(updated);
      closedUrls.forEach(url => addToRecentlyClosed(url));
      showToast('Tab status recalculated.', 'success');
    } else {
      showToast('All tabs checked. No changes found.', 'info');
    }
  }, [addToRecentlyClosed]);

  // ─── Theme & Profile ────────────────────────────────────────────────────────
  const handleThemeChange = useCallback((newTheme) => setTheme(newTheme), []);

  const handleProfileSwitch = useCallback((newProfile) => {
    setActiveProfile(newProfile);
    setProfile(newProfile);
    const settings = getSettings();
    setRecentlyClosed(settings.recentlyClosed || []);
    showToast(`Switched profile to ${newProfile}`, 'success');
  }, []);

  // ─── Recovery ───────────────────────────────────────────────────────────────
  const handleRecoveryConfirm = useCallback(() => {
    if (latestCheckpoint) {
      const ws = loadWorkspace();
      const prof = latestCheckpoint.currentProfile;
      if (ws.profiles[prof]) {
        ws.profiles[prof].sessions = latestCheckpoint.workspaceState.sessions || [];
        ws.profiles[prof].collections = latestCheckpoint.workspaceState.collections || [];
        saveWorkspace(ws);
      }
      if (latestCheckpoint.activeTabs?.length > 0) {
        handleLaunchQueue(latestCheckpoint.activeTabs.map(t => t.url), 1, 'tab', 'Recovered Session');
      }
      showToast('Workspace recovered successfully!', 'success');
    }
    setShowRecoveryPrompt(false);
    clearCheckpoints();
  }, [latestCheckpoint, handleLaunchQueue]);

  const handleRecoveryDismiss = useCallback(() => {
    setShowRecoveryPrompt(false);
    clearCheckpoints();
    showToast('Checkpoints discarded.', 'info');
  }, []);

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Background />

      {!isPopout && (
        <Navbar
          currentTheme={theme}
          onToggleTheme={() => {
            const next = theme === 'light' ? 'dark' : 'light';
            setTheme(next);
            toggleTheme();
          }}
          onToggleShortcuts={() => setIsShortcutsOpen(true)}
          currentProfile={profile}
          onProfileSwitch={handleProfileSwitch}
        />
      )}

      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><Dashboard onLaunchQueue={handleLaunchQueue} /></ErrorBoundary>} />
            <Route path="/launcher" element={<ErrorBoundary><Launcher onLaunchQueue={handleLaunchQueue} /></ErrorBoundary>} />
            <Route path="/sessions" element={<ErrorBoundary><Sessions onLaunchQueue={handleLaunchQueue} /></ErrorBoundary>} />
            <Route path="/history" element={<ErrorBoundary><History onLaunchQueue={handleLaunchQueue} /></ErrorBoundary>} />
            <Route path="/blocker-test" element={<ErrorBoundary><BlockerTest /></ErrorBoundary>} />
            <Route path="/settings" element={<ErrorBoundary><Settings onThemeChange={handleThemeChange} /></ErrorBoundary>} />
            <Route path="/about" element={<ErrorBoundary><About /></ErrorBoundary>} />
          </Routes>
        </Suspense>
      </main>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onLaunchQueue={handleLaunchQueue}
      />

      <DuplicateModal
        isOpen={isDuplicateOpen}
        onClose={() => setIsDuplicateOpen(false)}
        data={duplicateData}
        onLaunch={(filteredUrls) => {
          if (duplicateData) proceedLaunchQueue(filteredUrls, duplicateData.tabCount, duplicateData.openMode, duplicateData.sessionName);
        }}
      />

      <KeyboardShortcuts isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} />

      <LaunchQueueAssistant
        isOpen={isQueueOpen}
        onClose={() => setIsQueueOpen(false)}
        queue={queueUrls}
        tabCount={queueTabCount}
        openMode={queueOpenMode}
        sessionName={queueSessionName}
        onFinished={(successfulCount) => {
          showToast(
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-sm text-emerald-400">Workspace Ready</span>
              <span className="text-xs text-slate-350">{successfulCount} tab{successfulCount !== 1 ? 's' : ''} opened successfully</span>
            </div>,
            'success',
            {
              label: 'Open Workspace Manager',
              onClick: () => window.dispatchEvent(new CustomEvent('mt_open_tab_manager'))
            }
          );
        }}
        onTabOpened={handleTabOpened}
        initialCurrentIndex={queueInitialCurrentIndex}
        initialStatuses={queueInitialStatuses}
      />

      <ActiveTabManager
        tabs={activeTabs}
        onCloseTab={handleCloseTab}
        onFocusTab={handleFocusTab}
        onReopenTab={handleReopenTab}
        onCloseAll={handleCloseAll}
        onFocusAll={handleFocusAll}
        onReopenClosed={handleReopenClosed}
        onRemoveClosed={handleRemoveClosed}
        onPinTab={handlePinTab}
        recentlyClosed={recentlyClosed}
        onReopenClosedTab={handleReopenClosedTab}
        onRemoveClosedTab={handleRemoveClosedTab}
        onClearRecentlyClosed={handleClearRecentlyClosed}
        onRefresh={handleRefreshActiveTabs}
        isQueueActive={isQueueOpen}
      />

      {/* Recovery Modal */}
      {showRecoveryPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-amber-500/30 shadow-2xl flex flex-col gap-5 text-center items-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="font-extrabold text-lg" style={{ color: 'var(--text-primary)' }}>Workspace Recovery Available</h3>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                The application did not shut down cleanly. A recovery checkpoint was found.
              </p>
              {latestCheckpoint && (
                <div className="flex flex-col gap-1 items-center mt-2.5 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3 text-xs w-full max-w-xs mx-auto">
                  <span className="font-bold text-amber-400">
                    Profile: {latestCheckpoint.currentProfile}
                  </span>
                  <span className="text-slate-300 font-semibold">
                    {latestCheckpoint.activeTabs.length} {latestCheckpoint.activeTabs.length === 1 ? 'tab' : 'tabs'} pending recovery
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Saved {getRelativeTime(latestCheckpoint.timestamp)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={handleRecoveryDismiss} className="flex-1 px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs border border-slate-700">
                Discard
              </button>
              <button onClick={handleRecoveryConfirm} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-bold text-xs shadow-md">
                Recover Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
      </Router>
    </ToastProvider>
  );
}
