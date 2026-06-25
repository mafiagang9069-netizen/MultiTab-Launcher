import React from 'react';
import { 
  HelpCircle, ShieldAlert, Sparkles, Monitor, 
  Terminal, ShieldCheck, Cpu, HardDrive 
} from 'lucide-react';

export default function About() {
  const troubleshootingSteps = [
    {
      browser: 'Google Chrome',
      steps: [
        'Click the "Pop-up blocked" icon at the right end of the address bar.',
        'Select "Always allow pop-ups and redirects from this site".',
        'Click "Done".'
      ]
    },
    {
      browser: 'Brave Browser',
      steps: [
        'Click the Brave Shields lion icon at the right of the address bar.',
        'Toggle Shields OFF for this site (or go to Shields settings -> Pop-ups -> change to "Allow").',
        'Shields will remember this site\'s preference.'
      ]
    },
    {
      browser: 'Mozilla Firefox',
      steps: [
        'Look at the yellow notification bar at the top of the browser page.',
        'Click "Options" on the right side of the bar.',
        'Select "Allow popups for this site".'
      ]
    },
    {
      browser: 'Microsoft Edge',
      steps: [
        'Click the "Pop-up blocked" icon in the address bar (looks like a window with a red X).',
        'Click "Always allow pop-ups and redirects from this site".',
        'Click "Done".'
      ]
    }
  ];

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-slate-100 light:text-slate-900 leading-none">
          Documentation & Help
        </h2>
        <p className="text-sm text-slate-400 light:text-slate-600 mt-2 font-medium">
          Understand how MultiTab Launcher interfaces with browser security models and PWA controls.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Troubleshooting Popups Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                <ShieldAlert size={22} />
              </div>
              <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
                Popup Blocker Mitigation
              </h3>
            </div>

            <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed font-medium">
              Web browsers block programmatic tab creation to prevent malicious advertising. Because MultiTab Launcher runs entirely on the client-side, the browser blocks batch launches unless popups are allowed.
            </p>

            <div className="flex flex-col gap-5 mt-2">
              {troubleshootingSteps.map((browserItem, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-4 bg-slate-950/20 rounded-xl border border-slate-850">
                  <span className="text-xs font-extrabold text-indigo-400">
                    {browserItem.browser}
                  </span>
                  <ol className="list-decimal pl-4 flex flex-col gap-1.5 mt-1">
                    {browserItem.steps.map((step, sIdx) => (
                      <li key={sIdx} className="text-[11px] text-slate-300 light:text-slate-650 leading-relaxed font-medium">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PWA & System Details Column */}
        <div className="flex flex-col gap-6">
          {/* PWA Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Monitor size={20} />
              </div>
              <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
                Install as a Desktop App
              </h3>
            </div>

            <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed font-medium">
              MultiTab Launcher is an installable PWA. It runs in its own window, integrates with keyboard shortcuts, and launches instantly.
            </p>

            <div className="flex flex-col gap-3 mt-1">
              <div className="flex gap-2">
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                <span className="text-[11px] text-slate-300 font-medium">
                  **Offline Ready**: All layouts cache locally and run without internet.
                </span>
              </div>
              <div className="flex gap-2">
                <ShieldCheck className="text-emerald-500 shrink-0 mt-0.5" size={14} />
                <span className="text-[11px] text-slate-300 font-medium">
                  **Instant Launch**: Opens instantly like a native desktop app.
                </span>
              </div>
            </div>
          </div>

          {/* Tech Stack Card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Cpu size={20} />
              </div>
              <h3 className="font-extrabold text-base text-slate-200 light:text-slate-850">
                System Information
              </h3>
            </div>

            <div className="flex flex-col gap-3 mt-1">
              <div className="flex justify-between items-center text-xs font-medium py-1.5 border-b border-slate-800/30">
                <span className="text-slate-500">Framework</span>
                <span className="text-slate-300">React v18 + Vite</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium py-1.5 border-b border-slate-800/30">
                <span className="text-slate-500">Styling Engine</span>
                <span className="text-slate-300">Tailwind CSS</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium py-1.5 border-b border-slate-800/30">
                <span className="text-slate-500">Persistence</span>
                <span className="text-slate-300">LocalStorage v1.0</span>
              </div>
              <div className="flex justify-between items-center text-xs font-medium py-1.5">
                <span className="text-slate-500">Service Worker</span>
                <span className="text-slate-300">Active Cache</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
