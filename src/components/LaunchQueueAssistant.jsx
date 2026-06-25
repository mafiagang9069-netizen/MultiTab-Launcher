import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Zap, ChevronRight, SkipForward, ExternalLink, RefreshCw } from 'lucide-react';
import { getSettings, saveSettings } from '../utils/storage';

export default function LaunchQueueAssistant({
isOpen,
onClose,
queue = [],
tabCount = 1,
openMode = 'tab',
sessionName = null,
onFinished,
onTabOpened,
initialCurrentIndex = 0,
initialStatuses = []
}) {
const [currentIndex, setCurrentIndex] = useState(initialCurrentIndex);
const [statuses, setStatuses] = useState(initialStatuses);
const [keepLauncherFocused, setKeepLauncherFocused] = useState(false);
const [isRapidLaunch, setIsRapidLaunch] = useState(() => {
return localStorage.getItem('mt_rapid_launch') === 'true';
});
const [intervalSeconds, setIntervalSeconds] = useState(2);
const listRef = useRef(null);
const isOpenRef = useRef(isOpen);

useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);

useEffect(() => {
localStorage.setItem('mt_rapid_launch', isRapidLaunch ? 'true' : 'false');
}, [isRapidLaunch]);

const isPopout = new URLSearchParams(window.location.search).get('popout') === 'true';

const handleToggleKeepFocused = () => {
setKeepLauncherFocused(prev => {
const next = !prev;
saveSettings({ keepLauncherOnTop: next });
return next;
});
};

const handleIntervalSecondsChange = (s) => {
setIntervalSeconds(s);
saveSettings({ autoAdvanceDelay: s });
};

// Only initialize once when the assistant opens
useEffect(() => {
if (isOpen) {
setCurrentIndex(initialCurrentIndex);
setStatuses(initialStatuses.length > 0 ? [...initialStatuses] : queue.map(() => 'waiting'));

try {
const settings = getSettings();
setKeepLauncherFocused(settings.keepLauncherOnTop ?? false);
setIntervalSeconds(settings.autoAdvanceDelay ?? 2);
} catch (err) {
console.error('Failed to load settings in LaunchQueueAssistant', err);
}
}
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen]);

// Auto-scroll active item into view
useEffect(() => {
if (listRef.current) {
const active = listRef.current.querySelector('[data-active="true"]');
if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
}, [currentIndex]);

  const totalUrls = queue.length;
  const successfulCount = statuses.filter(s => s === 'opened').length;
  const skippedCount = statuses.filter(s => s === 'skipped').length;
  const blockedCount = statuses.filter(s => s === 'blocked').length;
  const failedCount = statuses.filter(s => s === 'failed').length;

  const processedCount = successfulCount + skippedCount + blockedCount + failedCount;
  const remainingCount = Math.max(totalUrls - processedCount, 0);

  const progressPercent = totalUrls > 0
    ? Math.round((processedCount / totalUrls) * 100)
    : 0;

  const successRate = processedCount > 0
    ? Math.round((successfulCount / processedCount) * 100)
    : 0;

  const openedCount = successfulCount;
  const isDone = currentIndex >= queue.length;
  const isCurrentBlocked = statuses[currentIndex] === 'blocked';

  // State tracing logger for diagnostic validation
  useEffect(() => {
    console.log('LaunchQueueAssistant State:', {
      queueLength: queue.length,
      currentIndex,
      statusesLength: statuses.length,
      openedCount,
      remainingCount,
      progressPercent,
      successRate,
      blockedCount
    });
  }, [queue, currentIndex, statuses, openedCount, remainingCount, progressPercent, successRate, blockedCount]);

// Security: validate URL scheme before opening
const safeOpen = (url) => {
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return null;
    const win = window.open(url, '_blank');
    if (win) {
      try { win.opener = null; } catch {}
    }
    return win;
  } catch {
    return null;
  }
};

const handleFinish = useCallback(() => {
  setIsRapidLaunch(false);
  onClose();
}, [onClose]);

const handleOpenNext = useCallback(() => {
  if (currentIndex >= queue.length) return;
  const url = queue[currentIndex];
  const win = safeOpen(url);
  const success = !!(win && !win.closed);

  setStatuses(prev => {
    const next = [...prev];
    next[currentIndex] = success ? 'opened' : 'blocked';
    return next;
  });

  if (onTabOpened) onTabOpened(url, win, success ? 'opened' : 'blocked');

  if (success) {
    const nextIdx = currentIndex + 1;
    setCurrentIndex(nextIdx);

    setTimeout(() => {
      if (keepLauncherFocused) {
        try { window.focus(); } catch {}
      }
    }, 150);

    if (nextIdx >= queue.length) {
      setIsRapidLaunch(false);
      setTimeout(() => {
        if (!isOpenRef.current) return;
        const finalSuccessCount = statuses.filter(s => s === 'opened').length + 1;
        if (onFinished) onFinished(finalSuccessCount);
        onClose();
      }, 900);
    }
  } else {
    // Do not disable Rapid Launch if popup is blocked; let queue survive and wait/retry
  }
}, [currentIndex, queue, keepLauncherFocused, onTabOpened, onFinished, onClose, statuses]);

const handleSkip = useCallback(() => {
  if (currentIndex >= queue.length) return;
  setStatuses(prev => {
    const next = [...prev];
    next[currentIndex] = 'skipped';
    return next;
  });
  const nextIdx = currentIndex + 1;
  setCurrentIndex(nextIdx);
  if (nextIdx >= queue.length) {
    setIsRapidLaunch(false);
    setTimeout(() => {
      if (!isOpenRef.current) return;
      const finalSuccessCount = statuses.filter(s => s === 'opened').length;
      if (onFinished) onFinished(finalSuccessCount);
      onClose();
    }, 900);
  }
}, [currentIndex, queue, onFinished, onClose, statuses]);

const handleLaunchAll = useCallback(() => {
  const next = [...statuses];
  for (let i = currentIndex; i < queue.length; i++) {
    const win = safeOpen(queue[i]);
    next[i] = (win && !win.closed) ? 'opened' : 'blocked';
    if (onTabOpened) onTabOpened(queue[i], win, next[i]);
  }
  setStatuses(next);
  setCurrentIndex(queue.length);
  setIsRapidLaunch(false);
  setTimeout(() => {
    if (!isOpenRef.current) return;
    const finalSuccessCount = next.filter(s => s === 'opened').length;
    if (onFinished) onFinished(finalSuccessCount);
    onClose();
  }, 1200);
}, [currentIndex, queue, statuses, onTabOpened, onFinished, onClose]);

const handlePopout = useCallback(() => {
try {
const popoutData = {
queue,
tabCount,
openMode,
sessionName,
currentIndex,
statuses
};
localStorage.setItem('mt_popout_queue', JSON.stringify(popoutData));

const width = 420;
const height = 680;
const left = window.screen.width / 2 - width / 2;
const top = window.screen.height / 2 - height / 2;

// Ensure compatibility with port-forwarding proxy paths (e.g. /proxy/3000/)
const proxyMatch = window.location.pathname.match(/^\/proxy\/\d+/);
const basePath = proxyMatch ? proxyMatch[0] : '';
const popoutUrl = basePath + '/launcher?popout=true';

window.open(
popoutUrl,
'MultiTabLauncherPopout',
`width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,resizable=yes`
);
onClose();
} catch (err) {
console.error('[Popout] Failed to launch popout window:', err);
}
}, [queue, tabCount, openMode, sessionName, currentIndex, statuses, onClose]);

// Keyboard shortcuts — stable handler via useCallback
useEffect(() => {
if (!isOpen) return;
const onKey = (e) => {
const el = document.activeElement;
if (el && ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName.toUpperCase())) return;
if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter' || (e.ctrlKey && e.key === 'ArrowRight')) {
e.preventDefault();
handleOpenNext();
}
else if (e.key.toLowerCase() === 's') { e.preventDefault(); handleSkip(); }
else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
};
window.addEventListener('keydown', onKey);
return () => window.removeEventListener('keydown', onKey);
}, [isOpen, handleOpenNext, handleSkip, onClose]);

// Rapid auto launch
useEffect(() => {
if (!isRapidLaunch || isDone) return;
const t = setTimeout(handleOpenNext, intervalSeconds * 1000);
return () => clearTimeout(t);
}, [isRapidLaunch, currentIndex, intervalSeconds, isDone, handleOpenNext]);

const statusConfig = {
opened:  { label: 'Opened',  color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)' },
skipped: { label: 'Skipped', color: '#94A3B8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)' },
blocked: { label: 'Blocked', color: '#EF4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)' },
waiting: { label: 'Waiting', color: '#475569', bg: 'rgba(71,85,105,0.08)',   border: 'rgba(71,85,105,0.15)' },
};

if (!isOpen || queue.length === 0) return null;

return (
<div
className="fixed inset-0 z-50 flex items-center justify-center"
style={{ backgroundColor: 'rgba(8, 14, 30, 0.85)', backdropFilter: 'blur(12px)' }}
onClick={onClose}
>
<div
className="flex flex-col w-[calc(100vw-24px)] sm:w-[640px] md:w-[740px]"
style={{
maxHeight: '90dvh',
backgroundColor: 'var(--card-bg, #0E1525)',
border: '1px solid var(--card-border, rgba(255,255,255,0.07))',
borderRadius: '20px',
boxShadow: '0 32px 96px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,92,255,0.08)',
}}
onClick={e => e.stopPropagation()}
>
{/* ── Header ── */}
<div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0"
style={{ borderBottom: '1px solid var(--card-border, rgba(255,255,255,0.05))' }}>
<div>
<h2 className="text-lg font-bold leading-tight tracking-tight" style={{ color: 'var(--text-primary)' }}>
Launch Queue Assistant
</h2>
<p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
{sessionName ? `Session: ${sessionName}` : 'Ad-hoc Queue'} &nbsp;·&nbsp; {totalUrls} URLs
</p>
</div>
<button
onClick={onClose}
aria-label="Close"
className="rounded-lg p-1.5 transition-colors"
style={{ color: 'var(--text-muted)' }}
onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
>
<X size={17} strokeWidth={2.5} />
</button>
</div>

{/* ── Scrollable body ── */}
<div className="flex flex-col gap-4 px-6 py-4 overflow-y-auto flex-1 min-h-0">

          {/* Stats Row */}
          <div className="grid grid-cols-5 rounded-xl overflow-hidden shrink-0"
            style={{ 
              border: '1px solid var(--card-border, rgba(255,255,255,0.05))', 
              backgroundColor: 'rgba(255,255,255,0.02)',
              height: '74px'
            }}>
            {[
              { label: 'Opened',    value: openedCount,           color: '#10B981' },
              { label: 'Remaining', value: remainingCount,        color: '#F59E0B' },
              { label: 'Progress',  value: `${progressPercent}%`, color: '#7C5CFF' },
              { label: 'Success',   value: `${successRate}%`,     color: '#34D399' },
              { label: 'Blocked',   value: blockedCount,          color: '#EF4444' },
            ].map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center justify-center py-2 gap-0.5"
                style={{ borderLeft: i > 0 ? '1px solid var(--card-border, rgba(255,255,255,0.05))' : 'none' }}>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{stat.label}</span>
                <span className="text-lg font-extrabold tabular-nums" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>

{/* Progress */}
<div>
<div className="flex justify-between items-center mb-2">
<span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Progress</span>
<span className="text-xs font-bold tabular-nums" style={{ color: progressPercent === 100 ? '#10B981' : '#7C5CFF' }}>
{progressPercent}%
</span>
</div>
<div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
<div
className="h-full rounded-full transition-all duration-500 ease-out"
style={{
width: `${progressPercent}%`,
background: progressPercent === 100 ? '#10B981' : 'linear-gradient(90deg, #5B3FE4, #7C5CFF)',
}}
/>
</div>
{skippedCount > 0 && (
<p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
{skippedCount} skipped · {openedCount} opened
</p>
)}
</div>

          {/* Blocked Warning */}
          {blockedCount > 0 && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl shrink-0"
              style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>
              <span className="text-base leading-none mt-0.5" role="img" aria-label="warning">⚠️</span>
              <div>
                <p className="text-xs font-bold" style={{ color: '#F87171' }}>{blockedCount} popup{blockedCount > 1 ? 's' : ''} blocked by browser</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Allow popups for this site, then retry.</p>
              </div>
            </div>
          )}

          {/* URL Queue List */}
          <div ref={listRef} className="overflow-y-auto rounded-xl flex flex-col gap-1 p-2 flex-grow min-h-[350px]"
            style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border, rgba(255,255,255,0.05))' }}>
            {queue.map((url, idx) => {
              const status = statuses[idx] || 'waiting';
              const isActive = idx === currentIndex && !isDone;
              const cfg = statusConfig[status];
              return (
                <div key={idx} data-active={isActive}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200"
                  style={isActive ? {
                    backgroundColor: 'rgba(124,92,255,0.1)',
                    border: '1px solid rgba(124,92,255,0.3)',
                  } : { backgroundColor: 'transparent', border: '1px solid transparent' }}>
                  <span className="text-[11px] font-mono font-bold w-5 text-center flex-shrink-0"
                    style={{ color: isActive ? '#7C5CFF' : 'var(--text-muted)' }}>{idx + 1}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: '#7C5CFF' }} />}
                  <span className="text-xs font-mono truncate flex-1"
                    style={{ color: isActive ? '#C4B5FD' : status === 'opened' ? '#6EE7B7' : 'var(--text-muted)' }}
                    title={url}>{url}</span>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                    style={isActive ? {
                      color: '#7C5CFF', backgroundColor: 'rgba(124,92,255,0.15)', border: '1px solid rgba(124,92,255,0.3)',
                    } : { color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
                    {isActive ? 'Active' : cfg.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Settings Row */}
          <div className="flex flex-wrap items-center gap-4 shrink-0">
            {/* Keep Focused toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                role="switch"
                aria-checked={keepLauncherFocused}
                className="relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ backgroundColor: keepLauncherFocused ? '#7C5CFF' : 'rgba(255,255,255,0.1)' }}
                onClick={handleToggleKeepFocused}
              >
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: keepLauncherFocused ? '17px' : '2px' }} />
              </button>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Keep Focused</span>
            </label>

            {/* Rapid Launch toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <button
                role="switch"
                aria-checked={isRapidLaunch}
                className="relative w-8 h-4 rounded-full transition-colors duration-200 flex-shrink-0"
                style={{ backgroundColor: isRapidLaunch ? '#7C5CFF' : 'rgba(255,255,255,0.1)' }}
                onClick={() => setIsRapidLaunch(v => !v)}
              >
                <div className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: isRapidLaunch ? '17px' : '2px' }} />
              </button>
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Rapid Launch</span>
            </label>

            {isRapidLaunch && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Delay:</span>
                {[1, 2, 3, 5].map(s => (
                  <button key={s} onClick={() => handleIntervalSecondsChange(s)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md transition-all"
                    style={intervalSeconds === s
                      ? { backgroundColor: '#7C5CFF', color: '#fff' }
                      : { backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>
                    {s}s
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hotkey Help Banner */}
          <div className="text-center py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0"
            style={{ backgroundColor: 'var(--card-icon-indigo-bg)', border: '1px solid var(--card-border-indigo)', color: 'var(--card-icon-indigo-text)' }}>
            <span>⚡</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: 'var(--btn-secondary-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}>SPACE</kbd> or <kbd className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: 'var(--btn-secondary-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}>ENTER</kbd> repeatedly to launch tabs quickly.</span>
          </div>

          {/* Keyboard Hints */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Shortcuts</span>
            {[
              { key: 'Space/Enter', label: 'Open Next' },
              { key: 'Ctrl+→', label: 'Open Next' },
              { key: 'S', label: 'Skip' },
              { key: 'Esc', label: 'Close' },
            ].map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <kbd className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>{key}</kbd>
                {label}
              </span>
            ))}
          </div>

          {/* Browser Restriction Warning */}
          <div className="flex gap-2.5 px-3 py-2.5 rounded-xl text-[11px] leading-normal shrink-0"
            style={{ backgroundColor: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--warning)' }}>ℹ️</span>
            <p>
              Browsers do not allow websites to automatically switch back to the previous tab after opening a new tab. For the best experience, use Spacebar Launch Mode or Auto Advance Mode.
            </p>
          </div>
</div>

{/* ── Footer Actions ── */}
<div className="flex items-center gap-2.5 px-6 pt-4 pb-5 flex-shrink-0"
style={{ borderTop: '1px solid var(--card-border, rgba(255,255,255,0.05))' }}>
<button onClick={handleFinish} aria-label="Finish and close"
className="h-10 px-4 rounded-xl text-sm font-semibold transition-all"
style={{ color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)' }}
onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}>
Finish
</button>

{!isPopout && (
<button onClick={handlePopout} aria-label="Pop out launcher"
className="h-10 px-4 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
style={{ color: 'var(--text-secondary)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)' }}
onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}>
<ExternalLink size={13} />
Pop Out
</button>
)}

<div className="flex-1" />

<button onClick={handleSkip} disabled={isDone} aria-label="Skip current URL"
className="h-10 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 flex items-center gap-1.5"
style={{ color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)' }}
onMouseEnter={e => { if (!isDone) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'; }}>
<SkipForward size={13} />
Skip
</button>

<button onClick={handleOpenNext} disabled={isDone} aria-label={isCurrentBlocked ? "Retry current URL" : "Open next URL in queue"}
  className="h-10 px-5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 flex items-center gap-2"
  style={{
    color: isCurrentBlocked ? '#EF4444' : '#A78BFA',
    backgroundColor: isCurrentBlocked ? 'rgba(239,68,68,0.12)' : 'rgba(124,92,255,0.12)',
    border: isCurrentBlocked ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(124,92,255,0.25)'
  }}
  onMouseEnter={e => { if (!isDone) { e.currentTarget.style.backgroundColor = isCurrentBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(124,92,255,0.2)'; e.currentTarget.style.borderColor = isCurrentBlocked ? 'rgba(239,68,68,0.4)' : 'rgba(124,92,255,0.4)'; } }}
  onMouseLeave={e => { e.currentTarget.style.backgroundColor = isCurrentBlocked ? 'rgba(239,68,68,0.12)' : 'rgba(124,92,255,0.12)'; e.currentTarget.style.borderColor = isCurrentBlocked ? 'rgba(239,68,68,0.25)' : 'rgba(124,92,255,0.25)'; }}>
  {isCurrentBlocked ? <RefreshCw size={14} /> : <ChevronRight size={14} />}
  {isCurrentBlocked ? 'Retry Launch' : 'Open Next'}
</button>

<button onClick={handleLaunchAll} disabled={isDone} aria-label="Launch all remaining URLs"
className="h-10 px-5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 flex items-center gap-2"
style={{ color: '#fff', background: 'linear-gradient(135deg, #5B3FE4, #7C5CFF)', boxShadow: '0 4px 16px rgba(124,92,255,0.35)' }}
onMouseEnter={e => { if (!isDone) e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,92,255,0.5)'; }}
onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,92,255,0.35)'; }}>
<Zap size={13} />
Launch All
</button>
</div>
</div>
</div>
);
}
