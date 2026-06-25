import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Zap, Calendar, Clock, Star, Play, 
  Trash2, Plus, Bell, Sparkles, Check, CheckSquare,
  Activity, Award, Heart, Layout, Database, ShieldAlert
} from 'lucide-react';
import StatCard from '../components/StatCard';
import { 
  getHistory, getSessions, getSchedules, 
  saveSchedule, deleteSchedule, addHistoryEntry,
  getAnalytics, getAuditLogs, loadWorkspace,
  getActiveProfile
} from '../utils/storage';
import { useToast } from '../components/Toast';

export default function Dashboard({ onLaunchQueue }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [history, setHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeProfile, setActiveProfile] = useState('Development');
  
  // Schedule Form State
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleFreq, setScheduleFreq] = useState('daily');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const hist = getHistory();
    const sess = getSessions();
    const sch = getSchedules();
    const anal = getAnalytics();
    const logs = getAuditLogs();
    const activeProf = getActiveProfile();

    setHistory(hist);
    setSessions(sess);
    setSchedules(sch);
    setAnalytics(anal);
    setAuditLogs(logs);
    setActiveProfile(activeProf);
  };

  const handleCreateSchedule = (e) => {
    e.preventDefault();
    if (!selectedSessionId) {
      showToast('Please select a session to schedule', 'warning');
      return;
    }

    const session = sessions.find(s => s.id === selectedSessionId);
    if (!session) return;

    const newSch = {
      sessionId: session.id,
      sessionName: session.name,
      time: scheduleTime,
      frequency: scheduleFreq,
      active: true
    };

    saveSchedule(newSch);
    loadData();
    setShowAddSchedule(false);
    showToast(`Reminder set for session "${session.name}"`, 'success');
  };

  const handleDeleteSchedule = (id) => {
    deleteSchedule(id);
    loadData();
    showToast('Schedule reminder removed', 'info');
  };

  const handleRelaunchEntry = (entry) => {
    onLaunchQueue(entry.urls, entry.tabCount, entry.openMode, entry.sessionName || 'Relaunch');
  };

  const presets = [
    { name: 'Google', url: 'https://google.com' },
    { name: 'YouTube', url: 'https://youtube.com' },
    { name: 'ChatGPT', url: 'https://chatgpt.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'LinkedIn', url: 'https://linkedin.com' },
    { name: 'Instagram', url: 'https://instagram.com' }
  ];

  const handleLaunchPreset = (url, name) => {
    onLaunchQueue([url], 1, 'tab', name);
  };

  // ANALYTICS COMPUTATIONS
  const stats = useMemo(() => {
    const ws = loadWorkspace();
    const profileNames = ['Development', 'Marketing', 'Personal', 'AI Research'];
    
    // 1. Most Used Session in Active Profile
    let mostUsedSess = null;
    let maxSessLaunches = -1;
    sessions.forEach(s => {
      const a = analytics[s.id];
      if (a && a.launchCount > maxSessLaunches) {
        maxSessLaunches = a.launchCount;
        mostUsedSess = s;
      }
    });

    // 2. Favorite Session
    const favSessions = sessions.filter(s => s.favorite);
    let favSess = favSessions.length > 0 ? favSessions[0] : null;
    let maxFavLaunches = -1;
    favSessions.forEach(s => {
      const a = analytics[s.id];
      const count = a ? a.launchCount : 0;
      if (count > maxFavLaunches) {
        maxFavLaunches = count;
        favSess = s;
      }
    });

    // 3. Most Active Profile across the entire system
    let mostActiveProf = 'Development';
    let maxProfLaunches = -1;
    profileNames.forEach(prof => {
      const pData = ws.profiles[prof] || {};
      const pAnalytics = pData.analytics || {};
      const totalLaunches = Object.values(pAnalytics).reduce((acc, curr) => acc + (curr.launchCount || 0), 0);
      if (totalLaunches > maxProfLaunches) {
        maxProfLaunches = totalLaunches;
        mostActiveProf = prof;
      }
    });

    // 4. Most Used Collection
    const collectionLaunches = {};
    sessions.forEach(s => {
      if (s.collectionId) {
        const a = analytics[s.id];
        const launches = a ? a.launchCount : 0;
        collectionLaunches[s.collectionId] = (collectionLaunches[s.collectionId] || 0) + launches;
      }
    });
    
    const activeCollections = ws.profiles[activeProfile]?.collections || [];
    let mostUsedCollName = 'None';
    let maxCollLaunches = -1;
    Object.keys(collectionLaunches).forEach(collId => {
      const count = collectionLaunches[collId];
      if (count > maxCollLaunches) {
        maxCollLaunches = count;
        const c = activeCollections.find(col => col.id === collId);
        mostUsedCollName = c ? c.name : 'Unknown Collection';
      }
    });

    // 5. Total launches and tab count (active profile)
    const activeProfileLaunches = history.length;
    const activeProfileTabs = history.reduce((acc, curr) => acc + (curr.tabCount * curr.urls.length), 0);

    return {
      mostUsedSession: mostUsedSess ? mostUsedSess.name : 'None',
      mostUsedSessionCount: maxSessLaunches > 0 ? maxSessLaunches : 0,
      favoriteSessionName: favSess ? favSess.name : 'None',
      mostActiveProfile: mostActiveProf,
      mostActiveProfileLaunches: maxProfLaunches > 0 ? maxProfLaunches : 0,
      mostUsedCollection: mostUsedCollName,
      totalLaunches: activeProfileLaunches,
      totalTabsOpened: activeProfileTabs
    };
  }, [sessions, analytics, history, activeProfile]);

  // Weekly Sparkline
  const getWeeklySparkline = () => {
    const dailyCounts = Array(7).fill(0);
    const today = new Date();
    
    history.forEach(entry => {
      const entryDate = new Date(entry.timestamp);
      const diffTime = Math.abs(today - entryDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) - 1;
      if (diffDays >= 0 && diffDays < 7) {
        dailyCounts[6 - diffDays] += entry.urls.length * entry.tabCount;
      }
    });

    const maxVal = Math.max(...dailyCounts, 1);
    
    return (
      <div className="flex items-end justify-between h-24 gap-1.5 mt-2 bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--card-border)]">
        {dailyCounts.map((count, idx) => {
          const heightPct = Math.max(10, (count / maxVal) * 100);
          const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const targetDay = new Date();
          targetDay.setDate(targetDay.getDate() - (6 - idx));
          const dayName = daysOfWeek[targetDay.getDay()];

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <div 
                className="w-full bg-gradient-to-t from-brand-primary to-brand-accent rounded-md min-h-[4px] relative group"
                style={{ height: `${heightPct}%` }}
              >
                <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[var(--card-bg)] border border-[var(--card-border-indigo)] text-[var(--card-icon-indigo-text)] text-[10px] font-bold py-1 px-2 rounded-lg shadow-xl pointer-events-none z-10 whitespace-nowrap font-sans">
                  {count} tabs
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-bold tracking-wider uppercase">
                {dayName}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-100 light:text-slate-900 leading-none">
            Dashboard
          </h2>
          <p className="text-sm text-slate-400 light:text-slate-600 mt-2 font-medium">
            Monitor launches, profile analytics, schedules, and recent events.
          </p>
        </div>
        
        <button
          onClick={() => navigate('/launcher')}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10 hover:scale-[1.02] transition"
        >
          <Zap size={16} fill="white" />
          Create Launch Queue
        </button>
      </div>

      {/* Enterprise Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Launches" 
          value={stats.totalLaunches} 
          icon={Zap} 
          description="Executed workspace runs" 
          color="indigo" 
        />
        <StatCard 
          title="Tabs Opened" 
          value={stats.totalTabsOpened} 
          icon={CheckSquare} 
          description="Cumulative link openings" 
          color="emerald" 
        />
        
        {/* Most Active Profile Indicator Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-[var(--card-border-violet)] hover:border-[var(--card-border-violet-hover)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Top Profile
            </span>
            <div className="p-2.5 rounded-xl bg-[var(--card-icon-violet-bg)] text-[var(--card-icon-violet-text)]">
              <Award size={20} />
            </div>
          </div>
          <div className="flex flex-col gap-1 truncate">
            <span className="text-lg font-extrabold tracking-tight text-slate-100 light:text-slate-900 truncate">
              {stats.mostActiveProfile}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Accumulated {stats.mostActiveProfileLaunches} launches
            </span>
          </div>
        </div>

        {/* Most Used Collection Indicator Card */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 border border-[var(--card-border-amber)] hover:border-[var(--card-border-amber-hover)] transition-all duration-300">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold tracking-wide text-slate-400 uppercase">
              Top Collection
            </span>
            <div className="p-2.5 rounded-xl bg-[var(--card-icon-amber-bg)] text-[var(--card-icon-amber-text)]">
              <Star size={20} />
            </div>
          </div>
          <div className="flex flex-col gap-1 truncate">
            <span className="text-lg font-extrabold tracking-tight text-slate-100 light:text-slate-900 truncate">
              {stats.mostUsedCollection}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Most launched collection
            </span>
          </div>
        </div>
      </div>

      {/* Enterprise Metrics Dashboard Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Activity Sparkline */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
              Weekly Tab Load Analytics
            </h3>
            <span className="text-[10px] text-slate-400 bg-indigo-500/10 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Launches (7d)
            </span>
          </div>
          {getWeeklySparkline()}
        </div>

        {/* Usage Leaders Panel */}
        <div className="glass-card p-6 rounded-2xl border flex flex-col gap-4 justify-between bg-[var(--bg-secondary)]/30">
          <h3 className="font-extrabold text-base text-slate-200 light:text-slate-800">
            Profile Leaders
          </h3>
          
          <div className="flex flex-col gap-3.5 my-2">
            {/* Most Used Session */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Zap size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">🔥 Most Used Workspace</span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">{stats.mostUsedSession}</span>
              </div>
            </div>

            {/* Favorite Session */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <Heart size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">⭐ Favorite Session</span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">{stats.favoriteSessionName}</span>
              </div>
            </div>

            {/* Active Reminders count */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Calendar size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">🔔 Active Reminders</span>
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">{schedules.length} triggers set</span>
              </div>
            </div>
          </div>
          
          <div className="h-[1px] bg-[var(--card-border)] my-1" />

          {/* Quick Launch Presets */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Presets</span>
            <div className="grid grid-cols-3 gap-2">
              {presets.slice(0, 3).map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLaunchPreset(preset.url, preset.name)}
                  className="py-2 px-3 rounded-xl glass-button-secondary font-bold text-[10px] truncate transition"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log (Activity Feed) & Scheduler Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Activity Feed (Audit Log) */}
        <div className="glass-card p-6 rounded-2xl border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-[var(--text-primary)] flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              Recent Activity Feed
            </h3>
            <span className="text-[9px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded font-black">Audit Log</span>
          </div>

          <div className="flex flex-col gap-3 max-h-[260px] overflow-y-auto pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-500 font-semibold border border-dashed border-[var(--card-border)] rounded-xl">
                No activity logs available.
              </div>
            ) : (
              auditLogs.slice(0, 10).map((log, idx) => {
                const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={log.id || idx} className="flex items-start gap-3 p-3 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl text-left">
                    <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 border border-[var(--card-border-indigo)] px-2 py-0.5 rounded shrink-0">
                      {formattedTime}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {log.action.replace('_', ' ')} <strong className="text-[var(--text-primary)] font-bold">"{log.details}"</strong>
                      </span>
                      <span className="text-[9px] text-[var(--text-muted)] mt-0.5">
                        Profile: {log.profile}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Scheduler Widget */}
        <div className="glass-card p-6 rounded-2xl border flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-[var(--text-primary)]">
                Session Reminder Scheduler
              </h3>
            </div>
            <button
              onClick={() => {
                if (sessions.filter(s => !s.isTemplate).length === 0) {
                  showToast('Please create a custom session first!', 'warning');
                } else {
                  setShowAddSchedule(!showAddSchedule);
                }
              }}
              className="p-2 rounded-xl bg-[var(--card-icon-indigo-bg)] text-[var(--card-icon-indigo-text)] hover:bg-indigo-600 hover:text-white transition"
              title="Add Schedule"
            >
              {showAddSchedule ? <Trash2 size={16} /> : <Plus size={16} />}
            </button>
          </div>

          {showAddSchedule && (
            <form onSubmit={handleCreateSchedule} className="flex flex-col gap-3 p-4 bg-[var(--bg-secondary)] border border-[var(--card-border-indigo)] rounded-2xl">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Select Session</label>
                <select
                  required
                  className="px-3 py-2 rounded-lg glass-input text-xs"
                  value={selectedSessionId}
                  onChange={e => setSelectedSessionId(e.target.value)}
                >
                  <option value="" className="bg-[var(--card-bg)] text-[var(--text-primary)]">-- Choose Custom Session --</option>
                  {sessions.filter(s => !s.isTemplate).map(s => (
                    <option key={s.id} value={s.id} className="bg-[var(--card-bg)] text-[var(--text-primary)]">{s.name} ({s.urls.length} URLs)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Reminder Time</label>
                  <input
                    type="time"
                    required
                    className="px-3 py-2 rounded-lg glass-input text-xs"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Frequency</label>
                  <select
                    required
                    className="px-3 py-2 rounded-lg glass-input text-xs"
                    value={scheduleFreq}
                    onChange={e => setScheduleFreq(e.target.value)}
                  >
                    <option value="daily" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Everyday</option>
                    <option value="weekday" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Weekdays</option>
                    <option value="weekend" className="bg-[var(--card-bg)] text-[var(--text-primary)]">Weekends</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <Bell size={12} /> Set Reminder
              </button>
            </form>
          )}

          <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto">
            {schedules.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 font-semibold">
                No active schedules configured.
              </div>
            ) : (
              schedules.map(sch => (
                <div 
                  key={sch.id} 
                  className="flex items-center justify-between p-3.5 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[var(--card-icon-indigo-bg)] text-[var(--card-icon-indigo-text)]">
                      <Clock size={16} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {sch.sessionName}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-semibold uppercase mt-0.5 tracking-wider">
                        {sch.time} • {sch.frequency}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSchedule(sch.id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition"
                    title="Remove Schedule"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
