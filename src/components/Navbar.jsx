import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Zap, FolderHeart, History, 
  ShieldAlert, Settings, HelpCircle, Sun, Moon, 
  Menu, X, Keyboard, ChevronDown, ChevronUp, User 
} from 'lucide-react';

export default function Navbar({ currentTheme, onToggleTheme, onToggleShortcuts, currentProfile, onProfileSwitch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/launcher', label: 'Launcher', icon: Zap },
    { to: '/sessions', label: 'Sessions', icon: FolderHeart },
    { to: '/history', label: 'History', icon: History },
    { to: '/blocker-test', label: 'Blocker Test', icon: ShieldAlert },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/about', label: 'About', icon: HelpCircle },
  ];

  const profiles = [
    { name: 'Development', label: 'Development', emoji: '👨‍💻' },
    { name: 'Marketing', label: 'Marketing', emoji: '📈' },
    { name: 'Personal', label: 'Personal', emoji: '🎮' },
    { name: 'AI Research', label: 'AI Research', emoji: '🤖' }
  ];

  const activeProf = profiles.find(p => p.name === currentProfile) || profiles[0];

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="lg:hidden flex items-center justify-between px-6 py-4 glass-card border-t-0 border-x-0 sticky top-0 z-40">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-extrabold text-white text-lg tracking-tight shadow-md shadow-indigo-500/20">
            MT
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
              MultiTab
            </span>
            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider">
              {activeProf.emoji} {activeProf.label}
            </span>
          </div>
        </NavLink>
        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-lg glass-button-secondary text-slate-400 light:text-slate-600 hover:text-indigo-500"
            aria-label="Toggle Theme"
          >
            {currentTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg glass-button-secondary text-slate-400 light:text-slate-600"
            aria-label="Toggle Menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 sidebar-container py-8 px-6 justify-between shrink-0 z-30">
        <div className="flex flex-col gap-6">
          {/* Logo Branding */}
          <NavLink to="/" className="flex items-center gap-3 px-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-black text-white text-xl tracking-tighter shadow-lg shadow-indigo-500/20 animate-float-slow">
              MT
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight leading-none bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
                MultiTab
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-1">
                Enterprise v3.1
              </span>
            </div>
          </NavLink>

          {/* Profile Switcher Dropdown */}
          <div className="relative px-2">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl glass-button-secondary border border-indigo-500/10 transition text-left text-xs font-bold"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-base">{activeProf.emoji}</span>
                <span className="truncate">{activeProf.label}</span>
              </div>
              {profileDropdownOpen ? <ChevronUp size={14} className="text-indigo-400" /> : <ChevronDown size={14} className="text-indigo-400" />}
            </button>

            {profileDropdownOpen && (
              <div className="absolute left-2 right-2 mt-1.5 p-1 rounded-xl glass-card shadow-2xl z-50 flex flex-col gap-0.5">
                {profiles.map(p => (
                  <button
                    key={p.name}
                    onClick={() => {
                      onProfileSwitch(p.name);
                      setProfileDropdownOpen(false);
                    }}
                    className={`profile-dropdown-item ${currentProfile === p.name ? 'active' : ''}`}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-divider" />

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="sidebar-nav-item"
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer controls inside sidebar */}
        <div className="flex flex-col gap-4">
          <div className="sidebar-divider" />
          <div className="flex items-center justify-between px-2">
            <button
              onClick={onToggleShortcuts}
              className="p-2.5 rounded-xl glass-button-secondary flex items-center justify-center"
              title="Keyboard Shortcuts (?)"
              aria-label="Keyboard Shortcuts"
            >
              <Keyboard size={18} />
            </button>
            
            <button
              onClick={onToggleTheme}
              className="flex-1 ml-3 px-4 py-2.5 rounded-xl glass-button-secondary flex items-center justify-center gap-2 text-xs font-semibold"
              aria-label="Toggle Theme"
            >
              {currentTheme === 'light' ? (
                <>
                  <Moon size={16} />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={16} />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-500 mt-2 font-medium">
            v3.1.0 • Enterprise Ready
          </p>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-45 bg-slate-950/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-4/5 max-w-xs h-full glass-card border-y-0 border-l-0 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-brand-accent flex items-center justify-center font-extrabold text-white text-lg">
                    MT
                  </div>
                  <span className="font-extrabold text-lg text-indigo-400">MultiTab</span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Picker in Drawer */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1">Active Profile</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {profiles.map(p => (
                    <button
                      key={p.name}
                      onClick={() => {
                        onProfileSwitch(p.name);
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl text-center text-[10px] font-bold border transition ${
                        currentProfile === p.name
                          ? 'bg-[var(--sidebar-active-bg)] border-[var(--sidebar-border)] text-[var(--sidebar-active-text)]'
                          : 'glass-button-secondary border-transparent'
                      }`}
                    >
                      <span className="text-lg">{p.emoji}</span>
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="sidebar-divider" />

              <nav className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className="sidebar-nav-item"
                  >
                    <item.icon size={18} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
            
            <div className="flex flex-col gap-4 mt-6">
              <button
                onClick={() => {
                  onToggleShortcuts();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 rounded-xl glass-button-secondary flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Keyboard size={16} />
                <span>Shortcuts Guide</span>
              </button>
              <p className="text-[10px] text-center text-slate-500 font-medium">
                v3.1.0 • Offline Ready
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
