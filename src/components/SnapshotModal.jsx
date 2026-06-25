import React, { useState, useEffect } from 'react';
import { X, Camera, Clock, RefreshCcw, Eye, ArrowRight, Plus, AlertCircle, FileDiff } from 'lucide-react';
import { getSnapshots, saveSnapshot, deleteSnapshot, saveSession } from '../utils/storage';
import { formatDate } from '../utils/helpers';
import { useToast } from './Toast';

export default function SnapshotModal({ isOpen, onClose, session, onSnapshotRestored }) {
  const { showToast } = useToast();
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapA, setSelectedSnapA] = useState(null);
  const [selectedSnapB, setSelectedSnapB] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => {
    if (isOpen && session) {
      loadSnaps();
      setSelectedSnapA(null);
      setSelectedSnapB(null);
      setShowDiff(false);
      setNotesInput('');
    }
  }, [isOpen, session]);

  const loadSnaps = () => {
    if (session) {
      setSnapshots(getSnapshots(session.id));
    }
  };

  const handleCreateSnapshot = (e) => {
    e.preventDefault();
    if (!session) return;

    saveSnapshot(session.id, session.urls, notesInput.trim() || 'Manual Snapshot');
    setNotesInput('');
    loadSnaps();
    showToast('Snapshot captured successfully!', 'success');
  };

  const handleDeleteSnapshot = (id) => {
    if (confirm('Delete this snapshot?')) {
      deleteSnapshot(id);
      loadSnaps();
      showToast('Snapshot removed.', 'info');
      if (selectedSnapA?.id === id) setSelectedSnapA(null);
      if (selectedSnapB?.id === id) setSelectedSnapB(null);
      setShowDiff(false);
    }
  };

  const handleRestoreSnapshot = (snap) => {
    if (!session) return;
    if (confirm(`Restore workspace session to version from ${formatDate(snap.timestamp)}?`)) {
      saveSession({
        ...session,
        urls: snap.urls,
        notes: snap.notes || session.notes
      });
      showToast('Workspace session reverted to snapshot!', 'success');
      if (onSnapshotRestored) onSnapshotRestored();
      onClose();
    }
  };

  // Diff Logic
  const getDiffResults = () => {
    if (!selectedSnapA || !selectedSnapB) return null;

    const urlsA = selectedSnapA.urls || [];
    const urlsB = selectedSnapB.urls || [];

    const setA = new Set(urlsA);
    const setB = new Set(urlsB);

    const deleted = urlsA.filter(url => !setB.has(url));
    const added = urlsB.filter(url => !setA.has(url));
    const unchanged = urlsA.filter(url => setB.has(url));

    return { added, deleted, unchanged };
  };

  const diff = getDiffResults();

  if (!isOpen || !session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="w-full max-w-2xl glass-card rounded-2xl p-6 shadow-2xl border border-indigo-500/20 my-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 light:text-slate-900 leading-tight">
                Snapshots for "{session.name}"
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase mt-1">
                Version History and Comparisons
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Create Snapshot & History List */}
          <div className="flex flex-col gap-5">
            {/* Create form */}
            <form onSubmit={handleCreateSnapshot} className="p-4 rounded-xl bg-slate-950/30 border border-slate-800/60 flex flex-col gap-3">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={14} className="text-indigo-400" />
                Capture Current State
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Snapshot description (optional)"
                  className="flex-1 px-3 py-2 rounded-lg glass-input text-xs"
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <Camera size={13} />
                  Capture
                </button>
              </div>
            </form>

            {/* List */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Snapshot History ({snapshots.length})</span>
              
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {snapshots.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-900 rounded-xl">
                    No snapshots captured yet.
                  </div>
                ) : (
                  snapshots.map(snap => {
                    const isA = selectedSnapA?.id === snap.id;
                    const isB = selectedSnapB?.id === snap.id;

                    return (
                      <div 
                        key={snap.id} 
                        className={`p-3 rounded-xl border flex flex-col gap-2 transition hover:bg-slate-800/20 ${
                          isA ? 'border-amber-500/40 bg-amber-500/5' : isB ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-850 bg-slate-950/20'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-300">
                              {snap.notes || 'Unnamed Snapshot'}
                            </span>
                            <span className="text-[9px] text-slate-500 mt-0.5">
                              {formatDate(snap.timestamp)}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteSnapshot(snap.id)}
                            className="text-slate-500 hover:text-red-400 p-0.5"
                            title="Delete snapshot"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-900/60 pt-2 mt-1">
                          <span className="text-[9px] text-slate-500 font-bold">
                            {snap.urls.length} link{snap.urls.length > 1 ? 's' : ''}
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (isA) setSelectedSnapA(null);
                                else {
                                  setSelectedSnapA(snap);
                                  setSelectedSnapB(null);
                                  setShowDiff(false);
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                                isA 
                                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' 
                                  : 'border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/20'
                              }`}
                            >
                              Version A
                            </button>

                            <button
                              onClick={() => {
                                if (isB) setSelectedSnapB(null);
                                else {
                                  setSelectedSnapB(snap);
                                  setShowDiff(false);
                                }
                              }}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                                isB 
                                  ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400' 
                                  : 'border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/20'
                              }`}
                              disabled={selectedSnapA?.id === snap.id}
                            >
                              Version B
                            </button>

                            <button
                              onClick={() => handleRestoreSnapshot(snap)}
                              className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition"
                              title="Restore this version"
                            >
                              <RefreshCcw size={10} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Comparison Diffs */}
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-slate-950/20 border border-slate-850 h-full flex flex-col gap-4">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileDiff size={14} className="text-indigo-400" />
                Snapshot Compare Engine
              </span>

              {/* Version Selectors status */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-900 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Version A</span>
                  <span className="text-xs font-bold text-amber-500 truncate">
                    {selectedSnapA ? (selectedSnapA.notes || formatDate(selectedSnapA.timestamp)) : 'None selected'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-900 flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Version B</span>
                  <span className="text-xs font-bold text-indigo-400 truncate">
                    {selectedSnapB ? (selectedSnapB.notes || formatDate(selectedSnapB.timestamp)) : 'None selected'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowDiff(true)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  selectedSnapA && selectedSnapB
                    ? 'bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white'
                    : 'bg-slate-900 border border-slate-850 text-slate-500 cursor-not-allowed'
                }`}
                disabled={!selectedSnapA || !selectedSnapB}
              >
                Compare Versions
              </button>

              <div className="h-[1px] bg-slate-900 my-1" />

              {/* Diff Viewer Area */}
              <div className="flex-1 min-h-[180px] max-h-[220px] overflow-y-auto pr-1">
                {!showDiff ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-xs p-4 gap-2">
                    <AlertCircle size={20} className="text-slate-600" />
                    <span>Select two different versions from the list and click "Compare" to view URL modifications.</span>
                  </div>
                ) : diff ? (
                  <div className="flex flex-col gap-2.5">
                    {/* Additions list */}
                    {diff.added.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Added (+ {diff.added.length})</span>
                        {diff.added.map((url, idx) => (
                          <div key={idx} className="text-[10px] font-mono text-emerald-400 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 truncate">
                            + {url}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Deletions list */}
                    {diff.deleted.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider">Removed (- {diff.deleted.length})</span>
                        {diff.deleted.map((url, idx) => (
                          <div key={idx} className="text-[10px] font-mono text-red-400 line-through bg-red-500/5 px-2 py-1 rounded border border-red-500/10 truncate">
                            - {url}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Unchanged summary */}
                    <div className="text-[9px] text-slate-500 font-bold">
                      {diff.unchanged.length} URL{diff.unchanged.length > 1 ? 's' : ''} remain unchanged between versions.
                    </div>

                    {diff.added.length === 0 && diff.deleted.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                        Versions are identical!
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
