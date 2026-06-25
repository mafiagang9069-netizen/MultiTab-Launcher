import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Command, Zap, FolderHeart, History, ShieldAlert, Settings, HelpCircle, ArrowRight } from 'lucide-react';
import { getSessions } from '../utils/storage';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState([]);
  const navigate = useNavigate();
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Static built-in commands
  const staticCommands = [
    { id: 'nav-dash', title: 'Go to Dashboard', category: 'Navigation', icon: Command, action: () => navigate('/') },
    { id: 'nav-launch', title: 'Go to URL Launcher', category: 'Navigation', icon: Zap, action: () => navigate('/launcher') },
    { id: 'nav-sess', title: 'Go to Saved Sessions', category: 'Navigation', icon: FolderHeart, action: () => navigate('/sessions') },
    { id: 'nav-hist', title: 'Go to Launch History', category: 'Navigation', icon: History, action: () => navigate('/history') },
    { id: 'nav-test', title: 'Go to Blocker Test Diagnostics', category: 'Navigation', icon: ShieldAlert, action: () => navigate('/blocker-test') },
    { id: 'nav-sett', title: 'Go to Settings', category: 'Navigation', icon: Settings, action: () => navigate('/settings') },
    { id: 'nav-about', title: 'Go to About Guide', category: 'Navigation', icon: HelpCircle, action: () => navigate('/about') }
  ];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);

      // Load custom user sessions as commands
      const userSessions = getSessions();
      const sessionCmds = userSessions.map(session => ({
        id: `session-${session.id}`,
        title: `Launch Session: ${session.name} (${session.urls.length} URLs)`,
        category: 'Sessions',
        icon: FolderHeart,
        action: () => {
          navigate('/launcher', { state: { autoLaunchSessionId: session.id } });
        }
      }));

      setCommands([...staticCommands, ...sessionCmds]);
    }
  }, [isOpen]);

  // Filter commands by search query
  const filtered = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  // Handle arrow key selections
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl glass-card rounded-2xl shadow-2xl overflow-hidden border border-indigo-500/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Area */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-800/80 light:border-slate-200/80">
          <Search className="text-slate-400 shrink-0" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="w-full py-4 bg-transparent border-0 text-slate-100 light:text-slate-900 placeholder:text-slate-500 focus:ring-0 text-base outline-none"
            placeholder="Type a command or search sessions..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Command List Area */}
        <div className="max-h-[350px] overflow-y-auto p-2" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              No matching commands or sessions found.
            </div>
          ) : (
            filtered.map((cmd, index) => {
              const IconComp = cmd.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-150 ${
                    isSelected 
                      ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white font-medium shadow-md' 
                      : 'text-slate-300 light:text-slate-700 hover:bg-slate-800/40 light:hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp size={18} className={isSelected ? 'text-white' : 'text-indigo-400'} />
                    <span>{cmd.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold tracking-wider uppercase ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-800 text-slate-400 light:bg-slate-100 light:text-slate-500 border border-slate-700/30'
                    }`}>
                      {cmd.category}
                    </span>
                    {isSelected && <ArrowRight size={14} className="text-white animate-pulse" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Help Footer */}
        <div className="px-4 py-3 bg-slate-950/40 border-t border-slate-800/80 light:border-slate-200/80 flex justify-between items-center text-[10px] text-slate-500 font-semibold tracking-wide">
          <div className="flex gap-4">
            <span>↑↓ Navigate</span>
            <span>ENTER Select</span>
          </div>
          <span>MultiTab Command Hub</span>
        </div>
      </div>
    </div>
  );
}
