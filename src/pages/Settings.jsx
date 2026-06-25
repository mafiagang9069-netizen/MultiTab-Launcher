import React, { useState, useEffect } from 'react';
import { Settings as SettIcon, Save, RefreshCw, Trash2, ArrowUpFromLine, ArrowDownToLine, ShieldAlert } from 'lucide-react';
import { getSettings, saveSettings, resetSettings, exportBackupJSON, importBackupJSON } from '../utils/storage';
import { useToast } from '../components/Toast';

export default function Settings({ onThemeChange }) {
  const { showToast } = useToast();
  const [theme, setTheme] = useState('dark');
  const [defaultTabCount, setDefaultTabCount] = useState(5);
  const [defaultOpenMode, setDefaultOpenMode] = useState('tab');
  const [autoSaveHistory, setAutoSaveHistory] = useState(true);
  const [enableShortcuts, setEnableShortcuts] = useState(true);
  const [restoreOnStartup, setRestoreOnStartup] = useState(true);
  const [autoOpenWorkspaceManager, setAutoOpenWorkspaceManager] = useState(false);
  const [keepLauncherOnTop, setKeepLauncherOnTop] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const s = getSettings();
    setTheme(s.theme || 'dark');
    setDefaultTabCount(s.defaultTabCount || 5);
    setDefaultOpenMode(s.defaultOpenMode || 'tab');
    setAutoSaveHistory(s.autoSaveHistory !== false);
    setEnableShortcuts(s.enableShortcuts !== false);
    setRestoreOnStartup(s.restoreOnStartup !== false);
    setAutoOpenWorkspaceManager(s.autoOpenWorkspaceManager === true);
    setKeepLauncherOnTop(s.keepLauncherOnTop === true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = saveSettings({
      theme,
      defaultTabCount: parseInt(defaultTabCount) || 5,
      defaultOpenMode,
      autoSaveHistory,
      enableShortcuts,
      restoreOnStartup,
      autoOpenWorkspaceManager,
      keepLauncherOnTop
    });
    
    if (updated) {
      onThemeChange(theme);
      showToast('Settings saved successfully!', 'success');
    }
  };

  const handleResetSettings = () => {
    if (confirm('Are you sure you want to reset all preferences to defaults?')) {
      const reset = resetSettings();
      setTheme(reset.theme);
      setDefaultTabCount(reset.defaultTabCount);
      setDefaultOpenMode(reset.defaultOpenMode);
      setAutoSaveHistory(reset.autoSaveHistory);
      setEnableShortcuts(reset.enableShortcuts);
      setRestoreOnStartup(reset.restoreOnStartup);
      setAutoOpenWorkspaceManager(reset.autoOpenWorkspaceManager);
      setKeepLauncherOnTop(reset.keepLauncherOnTop);
      onThemeChange(reset.theme);
      showToast('Settings reset to defaults', 'info');
    }
  };

  const handleFactoryReset = () => {
    if (confirm('WARNING: This will completely delete all saved sessions, launch history logs, schedules, and custom settings. This action cannot be undone. Proceed?')) {
      localStorage.clear();
      showToast('Factory reset complete. All data purged.', 'error');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const res = importBackupJSON(text);
      if (res.success) {
        showToast('Workspace backup restored successfully! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        showToast(res.error || 'Failed to import backup.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight text-slate-100 light:text-slate-900 leading-none">
          Preferences
        </h2>
        <p className="text-sm text-slate-400 light:text-slate-600 mt-2 font-medium">
          Manage configuration values, visual appearance, and backup local storage data blocks.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Settings Inputs Form */}
        <form onSubmit={handleSave} className="lg:col-span-2 glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-6">
          <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
            Global Configuration
          </h3>

          {/* Theme selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
              Interface Theme
            </label>
            <select
              className="px-4 py-3 rounded-xl glass-input text-sm"
              value={theme}
              onChange={e => setTheme(e.target.value)}
            >
              <option value="dark" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Dark Theme (Glassmorphism)</option>
              <option value="light" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Light Theme (Minimalist)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Default Tab Count */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Default Tabs Count
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                className="px-4 py-3 rounded-xl glass-input text-sm"
                value={defaultTabCount}
                onChange={e => setDefaultTabCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>

            {/* Default Open Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Default Open Mode
              </label>
              <select
                className="px-4 py-3 rounded-xl glass-input text-sm"
                value={defaultOpenMode}
                onChange={e => setDefaultOpenMode(e.target.value)}
              >
                <option value="tab" className="bg-[var(--card-bg)] text-[var(--text-primary)]">New Tabs</option>
                <option value="window" className="bg-[var(--card-bg)] text-[var(--text-primary)]">New Windows</option>
              </select>
            </div>
          </div>

          {/* Checkbox Options */}
          <div className="flex flex-col gap-4 mt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--input-bg)] text-indigo-500 focus:ring-0 cursor-pointer"
                checked={autoSaveHistory}
                onChange={e => setAutoSaveHistory(e.target.checked)}
              />
              <span className="text-xs font-medium text-slate-300 light:text-slate-700">
                Automatically save launched URLs to history
              </span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--input-bg)] text-indigo-500 focus:ring-0 cursor-pointer"
                checked={enableShortcuts}
                onChange={e => setEnableShortcuts(e.target.checked)}
              />
              <span className="text-xs font-medium text-slate-300 light:text-slate-700">
                Enable global keyboard shortcuts
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--input-bg)] text-indigo-500 focus:ring-0 cursor-pointer"
                checked={restoreOnStartup}
                onChange={e => setRestoreOnStartup(e.target.checked)}
              />
              <span className="text-xs font-medium text-slate-300 light:text-slate-700">
                Enable startup recovery check alerts (restore tabs on crash)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--input-bg)] text-indigo-500 focus:ring-0 cursor-pointer"
                checked={autoOpenWorkspaceManager}
                onChange={e => setAutoOpenWorkspaceManager(e.target.checked)}
              />
              <span className="text-xs font-medium text-slate-300 light:text-slate-700">
                Automatically open Active Tab Manager drawer when tabs are launched
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-[var(--input-border)] bg-[var(--input-bg)] text-indigo-500 focus:ring-0 cursor-pointer"
                checked={keepLauncherOnTop}
                onChange={e => setKeepLauncherOnTop(e.target.checked)}
              />
              <span className="text-xs font-medium text-slate-300 light:text-slate-700">
                Keep Launcher Always Visible (enables desktop-style floating controller)
              </span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80 light:border-slate-200/80">
            <button
              type="button"
              onClick={handleResetSettings}
              className="px-5 py-3 rounded-xl glass-button-secondary font-bold text-sm flex items-center gap-1.5"
            >
              <RefreshCw size={14} />
              Reset Defaults
            </button>
            <button
              type="submit"
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-sm flex items-center gap-1.5 shadow-md shadow-indigo-500/10 hover:scale-[1.02] transition"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>

        {/* Data Maintenance Column */}
        <div className="flex flex-col gap-6">
          {/* Backup card */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-4">
            <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
              Backup & Restore
            </h3>
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              Export your entire workspace workspace configuration (all profiles, sessions, collections, snapshots) as a local JSON file.
            </p>

            <div className="flex flex-col gap-2.5 mt-2">
              <button
                onClick={exportBackupJSON}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <ArrowUpFromLine size={13} />
                Export Workspace JSON
              </button>

              <div className="relative">
                <input
                  type="file"
                  id="import-file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <label
                  htmlFor="import-file"
                  className="w-full py-2.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-400 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-500/5 transition cursor-pointer"
                >
                  <ArrowDownToLine size={13} />
                  Import Workspace JSON
                </label>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-5">
            <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
              System Maintenance
            </h3>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-300 light:text-slate-750">
                  Purge Application Data
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Completely erase all localStorage items, including workspaces, logs, reminders, and settings.
                </span>
              </div>
              <button
                onClick={handleFactoryReset}
                className="py-3 px-4 w-full bg-red-950/20 hover:bg-red-500 border border-red-500/20 hover:border-transparent text-red-400 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Trash2 size={14} />
                Execute Factory Reset
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
