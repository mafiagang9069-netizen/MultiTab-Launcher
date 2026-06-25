import React, { useState, useEffect } from 'react';
import { 
  History as HistIcon, Search, Star, Trash2, Play, 
  ArrowUpFromLine, ArrowDownToLine, Trash, HelpCircle 
} from 'lucide-react';
import { 
  getHistory, toggleHistoryStar, deleteHistoryEntry, 
  clearHistory, getSessions, addHistoryEntry 
} from '../utils/storage';
import { formatDate, exportToCSV, importFromCSV } from '../utils/helpers';
import { useToast } from '../components/Toast';

export default function History({ onLaunchQueue }) {
  const { showToast } = useToast();
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'favorites'

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    setHistory(getHistory());
  };

  const handleToggleStar = (id) => {
    toggleHistoryStar(id);
    loadHistory();
  };

  const handleDelete = (id) => {
    deleteHistoryEntry(id);
    loadHistory();
    showToast('Entry removed from history', 'info');
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to permanently clear all launch logs?')) {
      clearHistory();
      loadHistory();
      showToast('Launch history cleared', 'info');
    }
  };

  const handleRelaunch = (item) => {
    onLaunchQueue(item.urls, item.tabCount, item.openMode, item.sessionName || 'Relaunch');
  };

  const handleExport = () => {
    if (history.length === 0) {
      showToast('No history logs to export', 'warning');
      return;
    }
    exportToCSV(history);
    showToast('History successfully exported to CSV!', 'success');
  };

  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const imported = importFromCSV(text);
        if (imported.length > 0) {
          // Merge imported entries with current logs
          const current = getHistory();
          const merged = [...imported, ...current];
          // Simple duplicate ID filter
          const uniqueMerged = merged.filter((item, index, self) =>
            index === self.findIndex((t) => t.id === item.id)
          );
          localStorage.setItem('mt_history_v1', JSON.stringify(uniqueMerged));
          loadHistory();
          showToast(`Successfully imported ${imported.length} logs!`, 'success');
        } else {
          showToast('Invalid CSV format or empty data', 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  // Filter and search logic
  const filtered = history.filter(item => {
    const matchesSearch = item.urls.some(url => url.toLowerCase().includes(search.toLowerCase())) ||
                          (item.sessionName && item.sessionName.toLowerCase().includes(search.toLowerCase()));
    
    if (filterMode === 'favorites') {
      return matchesSearch && item.starred;
    }
    return matchesSearch;
  });

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-100 light:text-slate-900 leading-none">
            Launch History
          </h2>
          <p className="text-sm text-slate-400 light:text-slate-600 mt-2 font-medium">
            Search past activities, manage favorite URLs, and import/export CSV logs.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* CSV File Upload Input */}
          <label className="px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs flex items-center gap-1.5 cursor-pointer">
            <ArrowDownToLine size={14} />
            Import CSV
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleImportCSV} 
              className="hidden" 
            />
          </label>
          
          <button
            onClick={handleExport}
            className="px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs flex items-center gap-1.5"
          >
            <ArrowUpFromLine size={14} />
            Export CSV
          </button>
          
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <Trash size={14} />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {/* Search & Tabs Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Filter Tabs */}
        <div className="flex bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/40 w-full md:w-auto">
          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg transition ${
              filterMode === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All History
          </button>
          <button
            onClick={() => setFilterMode('favorites')}
            className={`flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
              filterMode === 'favorites'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Star size={12} fill={filterMode === 'favorites' ? 'currentColor' : 'none'} />
            Favorites Only
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs font-medium focus:ring-0"
            placeholder="Search logs by URL or Session..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* History List */}
      <div className="glass-card rounded-2xl border border-slate-800/60 light:border-slate-200 overflow-hidden flex flex-col">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
            <HelpCircle size={40} className="stroke-[1.5]" />
            <h3 className="font-bold text-sm">No history records matched</h3>
            <p className="text-xs">Try searching for other terms or launch some URLs first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 light:border-slate-200/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/20">
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Session</th>
                  <th className="px-6 py-4">URLs Launched</th>
                  <th className="px-6 py-4">Tabs Count</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 light:divide-slate-200/50">
                {filtered.map((item) => (
                  <tr 
                    key={item.id} 
                    className="text-xs font-medium hover:bg-slate-800/10 light:hover:bg-slate-100/30 transition-all"
                  >
                    {/* Star Trigger */}
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStar(item.id)}
                        className={`p-1 rounded-lg hover:bg-slate-800/40 transition ${
                          item.starred ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={item.starred ? 'Remove from favorites' : 'Mark as favorite'}
                      >
                        <Star size={16} fill={item.starred ? 'currentColor' : 'none'} />
                      </button>
                    </td>

                    {/* Session Name */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-300 light:text-slate-700">
                        {item.sessionName || 'Ad-hoc'}
                      </span>
                    </td>

                    {/* URLs List */}
                    <td className="px-6 py-4 max-w-xs truncate">
                      <div className="flex flex-col gap-0.5 truncate">
                        {item.urls.map((url, idx) => (
                          <span key={idx} className="font-mono text-slate-400 light:text-slate-500 truncate" title={url}>
                            {url}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Tab Count */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-300 light:text-slate-700">
                        {item.tabCount} tab(s)
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold tracking-wider mt-0.5">
                        {item.openMode === 'window' ? 'Windows' : 'Tabs'}
                      </span>
                    </td>

                    {/* Timestamp */}
                    <td className="px-6 py-4 text-slate-400 light:text-slate-500 font-medium">
                      {formatDate(item.timestamp)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition"
                          title="Delete entry"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={() => handleRelaunch(item)}
                          className="py-1.5 px-3 rounded-lg bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white transition text-[11px] font-bold flex items-center gap-1 shadow-sm"
                          title="Relaunch now"
                        >
                          <Play size={10} fill="currentColor" /> Relaunch
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
