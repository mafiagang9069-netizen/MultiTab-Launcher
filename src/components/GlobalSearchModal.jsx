import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Folder, FolderHeart, Tag, ExternalLink, Play, Clock, Sparkles, X } from 'lucide-react';
import { loadWorkspace, getActiveProfile, getCollections } from '../utils/storage';
import { useToast } from './Toast';

export default function GlobalSearchModal({ isOpen, onClose, onLaunchQueue }) {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(null);
  const inputRef = useRef(null);

  // Rebuild index ONLY when the modal opens or data changes
  useEffect(() => {
    if (isOpen) {
      buildSearchIndex();
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const buildSearchIndex = () => {
    try {
      const ws = loadWorkspace();
      const currentProfileName = ws.settings.currentProfile || 'Development';
      const profile = ws.profiles[currentProfileName];
      const collections = profile.collections || [];
      const sessions = profile.sessions || [];

      // Structure of cached search items
      const searchItems = [];

      sessions.forEach(sess => {
        const collName = collections.find(c => c.id === sess.collectionId)?.name || '';
        
        searchItems.push({
          type: 'session',
          id: sess.id,
          name: sess.name,
          collectionId: sess.collectionId,
          collectionName: collName,
          tags: sess.tags || [],
          urls: sess.urls || [],
          notes: sess.notes || '',
          group: sess.group || 'Custom',
          tabCount: sess.tabCount || 1,
          openMode: sess.openMode || 'tab',
          favorite: sess.favorite || false,
          sessionObj: sess
        });
      });

      collections.forEach(coll => {
        searchItems.push({
          type: 'collection',
          id: coll.id,
          name: coll.name,
          favorite: coll.favorite || false
        });
      });

      setIndex(searchItems);
    } catch (e) {
      console.error('Failed to build search index', e);
      setIndex([]);
    }
  };

  const results = useMemo(() => {
    if (!query.trim() || !index) return [];

    const q = query.toLowerCase().trim();
    const rankedMatches = [];

    index.forEach(item => {
      let score = 0;
      const matches = [];

      if (item.type === 'session') {
        // 1. Session Name Match (+100)
        if (item.name.toLowerCase().includes(q)) {
          score += 100;
          matches.push('name');
        }
        // 2. Collection Match (+80)
        if (item.collectionName.toLowerCase().includes(q)) {
          score += 80;
          matches.push('collection');
        }
        // 3. Tag Match (+60)
        if (item.tags.some(t => t.toLowerCase().includes(q))) {
          score += 60;
          matches.push('tag');
        }
        // 4. URL Match (+45)
        const matchingUrls = item.urls.filter(u => u.toLowerCase().includes(q));
        if (matchingUrls.length > 0) {
          score += 45;
          matches.push('url');
        }
        // 5. Notes Match (+20)
        if (item.notes.toLowerCase().includes(q)) {
          score += 20;
          matches.push('notes');
        }

        if (score > 0) {
          rankedMatches.push({
            ...item,
            score,
            matchTypes: matches,
            matchingUrls
          });
        }
      } else if (item.type === 'collection') {
        // Collection match: Name match (+80)
        if (item.name.toLowerCase().includes(q)) {
          score += 80;
          matches.push('collection-name');
          rankedMatches.push({
            ...item,
            score,
            matchTypes: matches
          });
        }
      }
    });

    // Sort descending by score
    return rankedMatches.sort((a, b) => b.score - a.score);
  }, [query, index]);

  const handleSelectResult = (item) => {
    if (item.type === 'session') {
      onLaunchQueue(item.urls, item.tabCount, item.openMode, item.name);
      showToast(`Launching session "${item.name}"...`, 'success');
      onClose();
    } else if (item.type === 'collection') {
      showToast(`Collection: ${item.name}`, 'info');
      onClose();
    }
  };

  const handleLaunchSingleUrl = (url) => {
    onLaunchQueue([url], 1, 'tab');
    showToast(`Opening: ${url.replace(/(^\w+:|^)\/\//, '')}`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl glass-card rounded-2xl p-6 border border-indigo-500/20 shadow-2xl mt-12 md:mt-24 flex flex-col gap-4 animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 bg-slate-950/40 px-4 py-3 rounded-xl border border-slate-900 focus-within:border-indigo-500/30 transition">
          <Search size={18} className="text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-0 outline-0 p-0 text-sm text-slate-100 placeholder-slate-500"
            placeholder="Global search (Sessions, Collections, URLs, Notes, Tags)..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results indicator */}
        {query.trim().length > 0 && (
          <div className="flex items-center justify-between px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>Search Results ({results.length})</span>
            <span>Ranked by Match Score</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
          {query.trim().length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12 text-slate-500 gap-2">
              <Sparkles size={28} className="text-indigo-500/60 animate-pulse" />
              <h4 className="text-xs font-bold text-slate-400">Indexed Search Engine</h4>
              <p className="text-[10px] max-w-xs leading-normal">
                Press <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-850 font-sans">Ctrl + Shift + F</kbd> to query this window. Scores matches dynamically.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs font-medium border border-dashed border-slate-900 rounded-2xl">
              No matching records found in this profile.
            </div>
          ) : (
            results.map((item, idx) => (
              <div 
                key={item.id + '_' + idx}
                className="group p-3 rounded-xl bg-slate-950/20 hover:bg-slate-800/20 border border-slate-900 hover:border-indigo-500/20 flex items-center justify-between gap-4 transition cursor-pointer"
                onClick={() => handleSelectResult(item)}
              >
                <div className="flex-1 flex gap-3 min-w-0">
                  {/* Icon Indicator */}
                  <div className={`p-2.5 rounded-lg shrink-0 flex items-center justify-center ${
                    item.type === 'session' 
                      ? 'bg-indigo-500/10 text-indigo-400' 
                      : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {item.type === 'session' ? <FolderHeart size={16} /> : <Folder size={16} />}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition truncate">
                        {item.name}
                      </span>
                      {item.type === 'session' && item.favorite && (
                        <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.2 rounded border border-amber-500/10 font-black">
                          Fav
                        </span>
                      )}
                      <span className="text-[8px] bg-slate-900 text-slate-500 px-1.5 py-0.2 rounded font-bold uppercase tracking-wider">
                        {item.type}
                      </span>
                    </div>

                    {/* Metadata indicators */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      {item.type === 'session' && (
                        <>
                          <span>{item.group}</span>
                          {item.collectionName && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-400">📁 {item.collectionName}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{item.urls.length} link(s)</span>
                        </>
                      )}
                      {item.type === 'collection' && (
                        <span>Collection Container</span>
                      )}
                    </div>

                    {/* Show matching sub-items: Tags, URLs, Notes */}
                    {item.type === 'session' && (
                      <div className="flex flex-col gap-1 mt-2">
                        {/* Notes Match */}
                        {item.notes && item.notes.toLowerCase().includes(q) && (
                          <p className="text-[10px] text-slate-400 italic bg-slate-900/40 p-1 px-2 rounded border border-slate-900 leading-normal line-clamp-1">
                            Notes: "{item.notes}"
                          </p>
                        )}

                        {/* Tag Match */}
                        {item.tags && item.tags.some(t => t.toLowerCase().includes(q)) && (
                          <div className="flex gap-1 items-center">
                            <Tag size={8} className="text-indigo-400" />
                            <span className="text-[9px] text-indigo-400 font-bold">
                              Tags: {item.tags.filter(t => t.toLowerCase().includes(q)).join(', ')}
                            </span>
                          </div>
                        )}

                        {/* URL Match */}
                        {item.matchingUrls && item.matchingUrls.length > 0 && (
                          <div className="flex flex-col gap-1 pl-1 border-l border-slate-800 mt-1">
                            {item.matchingUrls.slice(0, 2).map((url, uidx) => (
                              <button
                                key={uidx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLaunchSingleUrl(url, item);
                                }}
                                className="flex items-center gap-1 text-[9px] font-mono text-indigo-300 hover:text-indigo-100 text-left truncate w-fit"
                              >
                                <ExternalLink size={8} />
                                {url.replace(/(^\w+:|^)\/\//, '')}
                              </button>
                            ))}
                            {item.matchingUrls.length > 2 && (
                              <span className="text-[8px] text-slate-500 font-bold pl-3">
                                + {item.matchingUrls.length - 2} more URL matches
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score badge & launch controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-extrabold">{item.score || 0} pts</span>
                    <span className="text-[8px] text-slate-600 font-bold">Score</span>
                  </div>

                  {item.type === 'session' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectResult(item);
                      }}
                      className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 transition"
                      title="Launch entire workspace"
                    >
                      <Play size={12} fill="currentColor" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
