import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FolderHeart, Plus, Play, Edit3, Trash2, 
  Share2, ArrowDownToLine, ArrowUpFromLine, 
  Layers, ExternalLink, HelpCircle, Heart, 
  Archive, FileText, Tag, Camera, CheckSquare, 
  Folder, Star, MoreVertical, Edit2, AlertCircle
} from 'lucide-react';
import { 
  getSessions, 
  saveSession, 
  deleteSession, 
  importSessionsJSON,
  getCollections,
  saveCollection,
  deleteCollection,
  getAnalytics,
  trackSessionLaunch,
  addAuditLog
} from '../utils/storage';
import SessionModal from '../components/SessionModal';
import SnapshotModal from '../components/SnapshotModal';
import { useToast } from '../components/Toast';
import { formatDate } from '../utils/helpers';

export default function Sessions({ onLaunchQueue }) {
  const { showToast } = useToast();
  
  // Data State
  const [sessions, setSessions] = useState([]);
  const [collections, setCollections] = useState([]);
  const [analytics, setAnalytics] = useState({});
  
  // Filters State
  const [selectedCollectionId, setSelectedCollectionId] = useState('all'); // 'all' | 'unassigned' | collectionId
  const [statusTab, setStatusTab] = useState('Active'); // 'Active' | 'Archived' | 'Favorites'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkMoveDropdown, setShowBulkMoveDropdown] = useState(false);
  
  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState(null);
  const [snapshotSession, setSnapshotSession] = useState(null);
  
  // Collection creation/editing states
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState(null);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  
  // JSON Import States
  const [showImportBox, setShowImportBox] = useState(false);
  const [importJSON, setImportJSON] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setSessions(getSessions());
    setCollections(getCollections());
    setAnalytics(getAnalytics());
    setSelectedIds([]);
  };

  const handleSaveSession = (sessionData) => {
    saveSession(sessionData);
    loadData();
    showToast(`Session "${sessionData.name}" saved!`, 'success');
  };

  const handleDeleteSession = (id, name) => {
    if (confirm(`Are you sure you want to delete session "${name}"?`)) {
      deleteSession(id);
      loadData();
      showToast(`Session "${name}" deleted`, 'info');
    }
  };

  const handleLaunchSession = (session) => {
    trackSessionLaunch(session.id, session.urls.length * session.tabCount);
    onLaunchQueue(session.urls, session.tabCount, session.openMode, session.name);
    loadData(); // Reload analytics mapping
  };

  const handleImportSessions = (e) => {
    e.preventDefault();
    const result = importSessionsJSON(importJSON);
    if (result.success) {
      loadData();
      setImportJSON('');
      setShowImportBox(false);
      showToast(`Successfully imported ${result.count} sessions!`, 'success');
    } else {
      showToast(result.error || 'Failed to import sessions', 'error');
    }
  };

  // COLLECTION HANDLERS
  const handleCreateCollection = (e) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    saveCollection({ name: newCollectionName.trim() });
    setNewCollectionName('');
    setShowAddCollection(false);
    loadData();
    showToast('Collection created', 'success');
  };

  const handleRenameCollection = (id) => {
    if (!editingCollectionName.trim()) return;
    const existing = collections.find(c => c.id === id);
    saveCollection({ ...existing, name: editingCollectionName.trim() });
    setEditingCollectionId(null);
    setEditingCollectionName('');
    loadData();
    showToast('Collection renamed', 'success');
  };

  const handleDeleteCollection = (id, name) => {
    if (confirm(`Delete collection "${name}"? Sessions inside will be unassigned.`)) {
      deleteCollection(id);
      if (selectedCollectionId === id) {
        setSelectedCollectionId('all');
      }
      loadData();
      showToast('Collection deleted', 'info');
    }
  };

  const handleToggleCollectionFavorite = (id) => {
    const coll = collections.find(c => c.id === id);
    saveCollection({ ...coll, favorite: !coll.favorite });
    loadData();
  };

  // HEALTH SCORE FORMULA
  const calculateHealthScore = useCallback((session, sessionAnalytics) => {
    let score = 20; // 20% Base: Saved
    
    // Tagged: +20%
    if (session.tags && session.tags.length > 0) score += 20;
    
    // Has Notes: +20%
    if (session.notes && session.notes.trim().length > 0) score += 20;
    
    // Favorite: +20%
    if (session.favorite) score += 20;
    
    // Recently Used: +20%
    const lastL = sessionAnalytics?.lastLaunched;
    if (lastL) {
      const diffTime = Math.abs(new Date() - new Date(lastL));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) score += 20;
    }
    
    return score;
  }, []);

  // BULK ACTIONS HANDLERS
  const handleToggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleIds = filteredSessions.map(s => s.id);
    const allSelected = visibleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.length} selected workspaces?`)) {
      selectedIds.forEach(id => {
        deleteSession(id);
      });
      showToast(`Deleted ${selectedIds.length} sessions`, 'info');
      loadData();
    }
  };

  const handleBulkFavorite = () => {
    selectedIds.forEach(id => {
      const sess = sessions.find(s => s.id === id);
      if (sess) {
        saveSession({ ...sess, favorite: true });
      }
    });
    showToast(`Marked ${selectedIds.length} sessions as favorites`, 'success');
    loadData();
  };

  const handleBulkArchive = (archive) => {
    selectedIds.forEach(id => {
      const sess = sessions.find(s => s.id === id);
      if (sess) {
        saveSession({ ...sess, status: archive ? 'Archived' : 'Active' });
      }
    });
    showToast(`${archive ? 'Archived' : 'Activated'} ${selectedIds.length} sessions`, 'success');
    loadData();
  };

  const handleBulkMoveToCollection = (collId) => {
    selectedIds.forEach(id => {
      const sess = sessions.find(s => s.id === id);
      if (sess) {
        saveSession({ ...sess, collectionId: collId || null });
      }
    });
    showToast(`Moved ${selectedIds.length} sessions to collection`, 'success');
    setShowBulkMoveDropdown(false);
    loadData();
  };

  const handleBulkExport = () => {
    const list = sessions.filter(s => selectedIds.includes(s.id));
    const blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `multitab_bulk_export_${Date.now()}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addAuditLog('WORKSPACE_EXPORTED', `Bulk export: ${list.length} sessions`);
    showToast(`Exported ${list.length} sessions`, 'success');
  };

  // FILTERED LIST
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // 1. Status Filter
      if (statusTab === 'Active' && s.status === 'Archived') return false;
      if (statusTab === 'Archived' && s.status !== 'Archived') return false;
      if (statusTab === 'Favorites' && !s.favorite) return false;

      // 2. Collection Filter
      if (selectedCollectionId === 'unassigned' && s.collectionId !== null) return false;
      if (selectedCollectionId !== 'all' && selectedCollectionId !== 'unassigned' && s.collectionId !== selectedCollectionId) return false;

      // 3. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesNotes = s.notes && s.notes.toLowerCase().includes(q);
        const matchesTags = s.tags && s.tags.some(t => t.toLowerCase().includes(q));
        const matchesUrl = s.urls.some(u => u.toLowerCase().includes(q));
        if (!matchesName && !matchesNotes && !matchesTags && !matchesUrl) return false;
      }

      return true;
    });
  }, [sessions, selectedCollectionId, statusTab, searchQuery]);

  // AVERAGE HEALTH SCORE GAUGE
  const profileHealthScore = useMemo(() => {
    if (filteredSessions.length === 0) return 100;
    const total = filteredSessions.reduce((acc, curr) => {
      return acc + calculateHealthScore(curr, analytics[curr.id]);
    }, 0);
    return Math.round(total / filteredSessions.length);
  }, [filteredSessions, analytics, calculateHealthScore]);

  return (
    <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 lg:flex-row min-w-0">
      
      {/* 1. LEFT SIDEBAR: Collections List & Quality Index */}
      <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-6">
        {/* Quality index card */}
        <div className="glass-card p-5 rounded-2xl border border-indigo-500/10 flex flex-col gap-3 relative overflow-hidden bg-gradient-to-tr from-slate-950/40 to-indigo-950/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Library Quality Index</span>
            <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Health</span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-slate-100 tracking-tight">{profileHealthScore}%</span>
            <span className="text-xs text-slate-500 font-semibold">Workspace Quality</span>
          </div>

          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden mt-1 border border-slate-900/60">
            <div 
              className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all duration-500" 
              style={{ width: `${profileHealthScore}%` }}
            />
          </div>
          
          <p className="text-[10px] text-slate-500 leading-normal">
            Improve your health score by saving, adding notes/tags, and favoriting workspaces.
          </p>
        </div>

        {/* Collections Tree Panel */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-200 light:text-slate-800">Workspace Collections</h3>
            <button
              onClick={() => setShowAddCollection(!showAddCollection)}
              className="p-1 rounded-lg hover:bg-slate-800 text-indigo-400"
              title="New Collection"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add collection Input */}
          {showAddCollection && (
            <form onSubmit={handleCreateCollection} className="flex gap-2">
              <input
                type="text"
                required
                placeholder="Collection name"
                className="flex-1 px-3 py-1.5 rounded-lg glass-input text-xs"
                value={newCollectionName}
                onChange={e => setNewCollectionName(e.target.value)}
              />
              <button
                type="submit"
                className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Add
              </button>
            </form>
          )}

          {/* Collections selection lists */}
          <nav className="flex flex-col gap-1 max-h-[350px] overflow-y-auto pr-1">
            <button
              onClick={() => setSelectedCollectionId('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-left transition ${
                selectedCollectionId === 'all'
                  ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <Folder size={14} />
                <span>All Workspaces</span>
              </div>
              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">{sessions.length}</span>
            </button>

            <button
              onClick={() => setSelectedCollectionId('unassigned')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-left transition ${
                selectedCollectionId === 'unassigned'
                  ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-sm'
                  : 'text-slate-400 hover:bg-slate-800/20 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <FolderHeart size={14} />
                <span>Unassigned</span>
              </div>
              <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-500">
                {sessions.filter(s => s.collectionId === null).length}
              </span>
            </button>

            <div className="h-[1px] bg-slate-900/60 my-1" />

            {/* Custom collections */}
            {collections.map(c => {
              const count = sessions.filter(s => s.collectionId === c.id).length;
              const isSelected = selectedCollectionId === c.id;

              return (
                <div key={c.id} className="group flex items-center justify-between w-full rounded-lg hover:bg-slate-800/20 pr-2">
                  {editingCollectionId === c.id ? (
                    <div className="flex items-center gap-1 p-1 w-full">
                      <input
                        type="text"
                        className="flex-1 px-2 py-0.5 rounded glass-input text-xs font-semibold"
                        value={editingCollectionName}
                        onChange={e => setEditingCollectionName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameCollection(c.id);
                          if (e.key === 'Escape') setEditingCollectionId(null);
                        }}
                        autoFocus
                      />
                      <button 
                        onClick={() => handleRenameCollection(c.id)}
                        className="text-emerald-400 p-0.5"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedCollectionId(c.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-left transition truncate ${
                        isSelected
                          ? 'bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/25'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{c.favorite ? '⭐' : '📁'}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  )}

                  {/* Actions (Rename, Delete, Favorite) */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition shrink-0">
                    <button
                      onClick={() => handleToggleCollectionFavorite(c.id)}
                      className={`p-1 hover:text-amber-400 ${c.favorite ? 'text-amber-500' : 'text-slate-500'}`}
                      title={c.favorite ? 'Remove Favorite' : 'Mark Favorite'}
                    >
                      <Star size={12} fill={c.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingCollectionId(c.id);
                        setEditingCollectionName(c.name);
                      }}
                      className="p-1 text-slate-500 hover:text-slate-300"
                      title="Rename"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(c.id, c.name)}
                      className="p-1 text-slate-500 hover:text-red-400"
                      title="Delete Collection"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE BROWSER AREA */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Toolbar & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search sessions, notes, URLs, tags..."
              className="w-full px-4 py-3 rounded-xl glass-input text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportBox(!showImportBox)}
              className="px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs flex items-center gap-1.5"
            >
              <ArrowDownToLine size={14} />
              Import JSON
            </button>
            
            <button
              onClick={() => {
                setSessionToEdit(null);
                setIsModalOpen(true);
              }}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/10 hover:scale-[1.02] transition"
            >
              <Plus size={16} />
              New Session
            </button>
          </div>
        </div>

        {/* JSON Import Box */}
        {showImportBox && (
          <form onSubmit={handleImportSessions} className="glass-card p-5 rounded-2xl border border-indigo-500/30 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Layers className="text-indigo-400" size={18} />
              <span className="text-sm font-bold text-slate-200">Import Sessions payload JSON</span>
            </div>
            <textarea
              rows={4}
              required
              className="px-3 py-2 rounded-xl glass-input text-xs font-mono"
              placeholder='Paste session JSON here'
              value={importJSON}
              onChange={e => setImportJSON(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportBox(false)}
                className="px-4 py-2 rounded-lg glass-button-secondary text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
              >
                Import Payload
              </button>
            </div>
          </form>
        )}

        {/* Status Filters Bar & Bulk Action trigger indicator */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-2">
            {/* Status tabs */}
            <div className="flex gap-2">
              {['Active', 'Archived', 'Favorites'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setStatusTab(tab)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition border ${
                    statusTab === tab
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-800/20 text-slate-400 light:text-slate-600 hover:text-slate-200 border-transparent'
                  }`}
                >
                  {tab} ({
                    sessions.filter(s => {
                      if (tab === 'Active') return s.status !== 'Archived';
                      if (tab === 'Archived') return s.status === 'Archived';
                      return s.favorite;
                    }).length
                  })
                </button>
              ))}
            </div>

            {/* Check/Uncheck Bulk toggle */}
            <button
              onClick={handleSelectAll}
              className="text-xs font-bold text-slate-500 hover:text-indigo-400 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-950/20 transition border border-transparent hover:border-slate-850"
            >
              <CheckSquare size={14} />
              {filteredSessions.every(s => selectedIds.includes(s.id)) && filteredSessions.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* BULK ACTIONS FLOATING TOOLBAR */}
          {selectedIds.length > 0 && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border border-indigo-500/30 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-in shadow-2xl">
              <span className="text-xs font-black tracking-wide text-indigo-300">
                {selectedIds.length} Session{selectedIds.length > 1 ? 's' : ''} Selected
              </span>

              <div className="flex flex-wrap gap-1.5 items-center">
                <button
                  onClick={handleBulkFavorite}
                  className="px-3 py-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 text-xs font-bold text-indigo-300 flex items-center gap-1 transition"
                >
                  <Heart size={12} fill="currentColor" />
                  Favorite
                </button>

                {statusTab !== 'Archived' ? (
                  <button
                    onClick={() => handleBulkArchive(true)}
                    className="px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/30 text-xs font-bold text-amber-300 flex items-center gap-1 transition"
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                ) : (
                  <button
                    onClick={() => handleBulkArchive(false)}
                    className="px-3 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center gap-1 transition"
                  >
                    <Play size={12} />
                    Unarchive
                  </button>
                )}

                <button
                  onClick={handleBulkExport}
                  className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 transition"
                >
                  <ArrowUpFromLine size={12} />
                  Export
                </button>

                {/* Move to Collection Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowBulkMoveDropdown(!showBulkMoveDropdown)}
                    className="px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1 transition"
                  >
                    <Folder size={12} />
                    Move to...
                  </button>

                  {showBulkMoveDropdown && (
                    <div className="absolute right-0 bottom-full mb-1.5 w-48 p-1 rounded-xl glass-card border border-indigo-500/20 shadow-2xl z-50 flex flex-col gap-0.5">
                      <button
                        onClick={() => handleBulkMoveToCollection(null)}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 rounded-lg"
                      >
                        -- Remove Collection --
                      </button>
                      {collections.map(c => (
                        <button
                          key={c.id}
                          onClick={() => handleBulkMoveToCollection(c.id)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-800/40 hover:text-slate-200 rounded-lg truncate"
                        >
                          📁 {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-xs font-bold text-red-300 flex items-center gap-1 transition"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSessions.length === 0 ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-slate-500 gap-2 border border-dashed border-slate-900 rounded-3xl">
              <HelpCircle size={40} className="stroke-[1.5]" />
              <h3 className="font-bold text-sm">No workspaces match filters</h3>
              <p className="text-xs">Try selecting a different collection, changing search terms, or create a new workspace.</p>
            </div>
          ) : (
            filteredSessions.map(session => {
              const isChecked = selectedIds.includes(session.id);
              const sessionAnalytics = analytics[session.id];
              const healthScore = calculateHealthScore(session, sessionAnalytics);

              return (
                <div 
                  key={session.id} 
                  className={`glass-card p-6 rounded-2xl border flex flex-col justify-between gap-5 transition hover:border-indigo-500/30 group relative ${
                    session.isTemplate 
                      ? 'border-indigo-500/10 bg-indigo-950/5' 
                      : 'border-slate-850 bg-slate-950/20'
                  } ${isChecked ? 'ring-2 ring-indigo-500 border-transparent bg-indigo-950/5' : ''}`}
                >
                  {/* Select Checkbox Checkmark */}
                  {!session.isTemplate && (
                    <button
                      onClick={() => handleToggleSelect(session.id)}
                      className={`absolute top-4 left-4 p-1 rounded-md border transition z-10 ${
                        isChecked 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'border-slate-800 bg-slate-950/40 text-transparent opacity-0 group-hover:opacity-100 hover:border-slate-700'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}

                  {/* Session Details */}
                  <div className={`flex flex-col gap-3 ${!session.isTemplate ? 'pl-6' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col truncate">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-extrabold text-slate-100 light:text-slate-900 group-hover:text-indigo-400 transition truncate text-sm" title={session.name}>
                            {session.name}
                          </span>
                          {session.favorite && (
                            <Star size={12} className="fill-amber-500 text-amber-500 shrink-0" />
                          )}
                          {session.status === 'Archived' && (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 shrink-0">
                              Archived
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          <span>{session.group}</span>
                          {session.collectionId && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400">
                                📁 {collections.find(c => c.id === session.collectionId)?.name || 'Collection'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Health Score Gauge Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                        healthScore >= 80 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : healthScore >= 50 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`} title="Workspace health (completeness index)">
                        Score: {healthScore}%
                      </span>
                    </div>

                    {/* Notes display */}
                    {session.notes && (
                      <p className="text-[11px] text-slate-400 italic bg-slate-950/15 p-2 rounded-lg border border-slate-900/60 leading-normal line-clamp-2">
                        {session.notes}
                      </p>
                    )}

                    {/* Tags Display */}
                    {session.tags && session.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {session.tags.map(tag => (
                          <span key={tag} className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                            <Tag size={8} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* URL Preview List */}
                    <div className="flex flex-col gap-1.5 mt-2 bg-slate-950/20 p-3 rounded-xl border border-slate-900">
                      {session.urls.slice(0, 3).map((url, idx) => (
                        <span key={idx} className="text-xs font-mono font-medium text-slate-400 truncate flex items-center gap-1.5">
                          <ExternalLink size={10} className="text-indigo-500" />
                          {url.replace(/(^\w+:|^)\/\//, '')}
                        </span>
                      ))}
                      {session.urls.length > 3 && (
                        <span className="text-[10px] text-slate-500 font-bold pl-4">
                          + {session.urls.length - 3} more link(s)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="flex justify-between items-center pt-4 border-t border-slate-900">
                    <div className="flex flex-col text-[10px] text-slate-500 font-bold leading-normal">
                      <span>{session.tabCount} tab(s) • {session.openMode === 'window' ? 'Windows' : 'Tabs'}</span>
                      {sessionAnalytics?.launchCount > 0 && (
                        <span className="text-[9px] text-indigo-500 mt-0.5">
                          Fired {sessionAnalytics.launchCount}x (Last: {new Date(sessionAnalytics.lastLaunched).toLocaleDateString()})
                        </span>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {/* Snapshot capture history trigger */}
                      {!session.isTemplate && (
                        <button
                          onClick={() => setSnapshotSession(session)}
                          className="p-2 rounded-xl hover:bg-slate-800 text-slate-500 hover:text-indigo-400 transition"
                          title="View Snapshots & History"
                        >
                          <Camera size={15} />
                        </button>
                      )}

                      {!session.isTemplate && (
                        <>
                          <button
                            onClick={() => handleDeleteSession(session.id, session.name)}
                            className="p-2 rounded-xl hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition"
                            title="Delete Workspace"
                          >
                            <Trash2 size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setSessionToEdit(session);
                              setIsModalOpen(true);
                            }}
                            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                            title="Edit Details"
                          >
                            <Edit3 size={15} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleLaunchSession(session)}
                        className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:scale-[1.02] transition"
                      >
                        <Play size={12} fill="white" />
                        Launch
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Session Modal */}
      <SessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveSession}
        sessionToEdit={sessionToEdit}
      />

      {/* Snapshot History Modal */}
      <SnapshotModal
        isOpen={snapshotSession !== null}
        onClose={() => setSnapshotSession(null)}
        session={snapshotSession}
        onSnapshotRestored={loadData}
      />
    </div>
  );
}
