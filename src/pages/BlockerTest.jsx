import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Play, CheckCircle2, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { runPopupTest, browserDetect } from '../utils/helpers';
import { useToast } from '../components/Toast';

export default function BlockerTest() {
  const { showToast } = useToast();
  
  // Diagnostic metrics
  const [testing, setTesting] = useState(false);
  const [browserName, setBrowserName] = useState('Unknown');
  const [popupStatus, setPopupStatus] = useState('untested'); // 'untested' | 'allowed' | 'blocked'
  const [localStorageOk, setLocalStorageOk] = useState(false);
  const [swSupported, setSwSupported] = useState(false);
  const [notificationsStatus, setNotificationsStatus] = useState('default');

  useEffect(() => {
    runStaticDiagnostics();
  }, []);

  const runStaticDiagnostics = () => {
    // 1. Detect browser
    setBrowserName(browserDetect());

    // 2. Check localstorage capability
    try {
      localStorage.setItem('mt_test_localStorage', 'ok');
      localStorage.removeItem('mt_test_localStorage');
      setLocalStorageOk(true);
    } catch (e) {
      setLocalStorageOk(false);
    }

    // 3. Check service worker
    setSwSupported('serviceWorker' in navigator);

    // 4. Check notification state
    if ('Notification' in window) {
      setNotificationsStatus(Notification.permission);
    } else {
      setNotificationsStatus('unsupported');
    }
  };

  const handleRunPopupTest = async () => {
    setTesting(true);
    showToast('Running browser diagnostics...', 'info');

    // Run programmatic window.open test
    const allowed = await runPopupTest();
    
    setTesting(false);
    if (allowed) {
      setPopupStatus('allowed');
      showToast('Popups Allowed! All checks passed.', 'success');
    } else {
      setPopupStatus('blocked');
      showToast('Popups are blocked by your browser settings', 'error');
    }
  };

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then((permission) => {
      setNotificationsStatus(permission);
      if (permission === 'granted') {
        showToast('Notification permission granted!', 'success');
      } else {
        showToast('Notifications declined', 'warning');
      }
    });
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-slate-100 light:text-slate-900 leading-none">
          Blocker Diagnostics
        </h2>
        <p className="text-sm text-slate-400 light:text-slate-600 mt-2 font-medium">
          Scan browser configurations and test popup permissions.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        {/* Capability Diagnostics Column */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-6">
            <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
              Browser Capability Scanner
            </h3>

            {/* Diagnostics checklist */}
            <div className="flex flex-col gap-4">
              {/* Browser Name */}
              <div className="flex justify-between items-center p-3 bg-slate-950/20 rounded-xl border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Detected Browser</span>
                <span className="text-xs font-extrabold text-indigo-400">{browserName}</span>
              </div>

              {/* Popup support */}
              <div className="flex justify-between items-center p-3 bg-slate-950/20 rounded-xl border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Popup Blocker Status</span>
                <div>
                  {popupStatus === 'untested' && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-700/30">
                      Untested
                    </span>
                  )}
                  {popupStatus === 'allowed' && (
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      Allowed
                    </span>
                  )}
                  {popupStatus === 'blocked' && (
                    <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                      Blocked
                    </span>
                  )}
                </div>
              </div>

              {/* Local Storage support */}
              <div className="flex justify-between items-center p-3 bg-slate-950/20 rounded-xl border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Local Storage Integration</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                  localStorageOk 
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-red-400 bg-red-500/10 border-red-500/20'
                }`}>
                  {localStorageOk ? 'Available' : 'Unavailable'}
                </span>
              </div>

              {/* Service Worker support */}
              <div className="flex justify-between items-center p-3 bg-slate-950/20 rounded-xl border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Service Worker (PWA Capability)</span>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                  swSupported 
                    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                    : 'text-slate-400 bg-slate-800 border-slate-700'
                }`}>
                  {swSupported ? 'Supported' : 'Unsupported'}
                </span>
              </div>

              {/* Notifications Permission */}
              <div className="flex justify-between items-center p-3 bg-slate-950/20 rounded-xl border border-slate-800/40">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Notification Reminders</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    notificationsStatus === 'granted' 
                      ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' 
                      : notificationsStatus === 'denied' 
                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                        : 'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    {notificationsStatus}
                  </span>
                  {notificationsStatus === 'default' && (
                    <button
                      onClick={requestNotificationPermission}
                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition"
                    >
                      Request
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Test Action Trigger */}
            <button
              onClick={handleRunPopupTest}
              disabled={testing}
              className="mt-2 py-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-[1.01] transition disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  Analyzing Browser...
                </>
              ) : (
                <>
                  <Play size={16} fill="white" />
                  Test My Browser Blocker
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diagnosis Results Guide Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex-1 flex flex-col gap-4">
            <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
              Diagnostic Guide
            </h3>

            {popupStatus === 'untested' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 gap-2 border border-dashed border-slate-800 rounded-2xl">
                <Info size={32} className="stroke-[1.5] text-indigo-400" />
                <span className="text-xs font-semibold">
                  Click "Test My Browser Blocker" to run the evaluation.
                </span>
              </div>
            )}

            {popupStatus === 'allowed' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-emerald-500 gap-3 border border-emerald-500/20 bg-emerald-500/5 rounded-2xl">
                <CheckCircle2 size={40} />
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-slate-200">Popups Allowed!</span>
                  <span className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                    Your browser has pop-ups enabled for this site. You can use direct batch tab launching immediately.
                  </span>
                </div>
              </div>
            )}

            {popupStatus === 'blocked' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-red-400 gap-3 border border-red-500/20 bg-red-500/5 rounded-2xl">
                <AlertCircle size={40} />
                <div className="flex flex-col">
                  <span className="text-sm font-extrabold text-slate-200">Popups are Blocked</span>
                  <span className="text-xs text-slate-400 mt-1 font-semibold leading-relaxed">
                    Browser security blocked the popup test. Please see the **About** page for settings adjustment guides or use the Launch Queue Assistant fallback.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
