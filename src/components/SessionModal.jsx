import React, { useState, useEffect } from 'react';
import { X, FolderHeart, Save, AlertCircle, Share2, Clipboard, Heart } from 'lucide-react';
import { parseUrls } from '../utils/helpers';
import { getCollections } from '../utils/storage';

export default function SessionModal({ isOpen, onClose, onSave, sessionToEdit }) {
  const [name, setName] = useState('');
  const [urlsInput, setUrlsInput] = useState('');
  const [tabCount, setTabCount] = useState(1);
  const [openMode, setOpenMode] = useState('tab');
  const [group, setGroup] = useState('Work');
  const [customGroup, setCustomGroup] = useState('');
  const [collectionId, setCollectionId] = useState('');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState('');

  const groups = ['Work', 'Social', 'Entertainment', 'Custom'];
  const collections = getCollections();

  useEffect(() => {
    if (isOpen) {
      setError('');
      setShowShare(false);
      if (sessionToEdit) {
        setName(sessionToEdit.name || '');
        setUrlsInput(sessionToEdit.urls ? sessionToEdit.urls.join('\n') : '');
        setTabCount(sessionToEdit.tabCount || 1);
        setOpenMode(sessionToEdit.openMode || 'tab');
        setCollectionId(sessionToEdit.collectionId || '');
        setNotes(sessionToEdit.notes || '');
        setTagsInput(sessionToEdit.tags ? sessionToEdit.tags.join(', ') : '');
        setFavorite(sessionToEdit.favorite || false);
        
        if (groups.includes(sessionToEdit.group)) {
          setGroup(sessionToEdit.group);
          setCustomGroup('');
        } else {
          setGroup('Custom');
          setCustomGroup(sessionToEdit.group || '');
        }
      } else {
        setName('');
        setUrlsInput('');
        setTabCount(1);
        setOpenMode('tab');
        setGroup('Work');
        setCustomGroup('');
        setCollectionId('');
        setNotes('');
        setTagsInput('');
        setFavorite(false);
      }
    }
  }, [isOpen, sessionToEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Session name is required');
      return;
    }

    const parsed = parseUrls(urlsInput);
    const validUrls = parsed.filter(u => u.isValid).map(u => u.url);

    if (validUrls.length === 0) {
      setError('Please add at least one valid URL');
      return;
    }

    const finalGroup = group === 'Custom' ? (customGroup.trim() || 'Custom') : group;
    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    onSave({
      id: sessionToEdit?.id,
      name: name.trim(),
      urls: validUrls,
      tabCount: parseInt(tabCount) || 1,
      openMode,
      group: finalGroup,
      collectionId: collectionId || null,
      notes: notes.trim(),
      tags,
      favorite,
      status: sessionToEdit?.status || 'Active',
      version: '1.0'
    });
    
    onClose();
  };

  const getShareJSON = () => {
    const parsed = parseUrls(urlsInput);
    const validUrls = parsed.filter(u => u.isValid).map(u => u.url);
    const finalGroup = group === 'Custom' ? (customGroup.trim() || 'Custom') : group;
    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    
    const payload = {
      version: '1.0',
      name: name.trim() || 'Unnamed Session',
      urls: validUrls,
      tabCount: parseInt(tabCount) || 1,
      openMode,
      group: finalGroup,
      notes: notes.trim(),
      tags,
      favorite
    };
    return JSON.stringify(payload, null, 2);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(getShareJSON());
    alert('Session JSON copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div 
        className="w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl border border-indigo-500/20 my-8 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <FolderHeart size={20} />
            </div>
            <h3 className="font-extrabold text-lg text-slate-100 light:text-slate-900">
              {sessionToEdit ? 'Edit Launch Session' : 'Create New Session'}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-red-400 text-xs flex gap-2 items-center">
            <AlertCircle size={16} />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
              Session Name
            </label>
            <input
              type="text"
              required
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="e.g. Morning Routine, Work Launchpad"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
              URLs (One per line or comma-separated)
            </label>
            <textarea
              rows={4}
              required
              className="px-4 py-3 rounded-xl glass-input text-sm font-mono"
              placeholder="github.com&#10;chatgpt.com&#10;gmail.com"
              value={urlsInput}
              onChange={e => setUrlsInput(e.target.value)}
            />
            <p className="text-[10px] text-slate-500 font-medium">
              We'll automatically validate these and prepend https:// if missing.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Tab Count (Per URL)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                className="px-4 py-3 rounded-xl glass-input text-sm"
                value={tabCount}
                onChange={e => setTabCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Open Mode
              </label>
              <select
                className="px-4 py-3 rounded-xl glass-input text-sm bg-slate-900"
                value={openMode}
                onChange={e => setOpenMode(e.target.value)}
              >
                <option value="tab">New Tabs</option>
                <option value="window">New Windows</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Workspace Group
              </label>
              <select
                className="px-4 py-3 rounded-xl glass-input text-sm bg-slate-900"
                value={group}
                onChange={e => setGroup(e.target.value)}
              >
                {groups.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Assign to Collection
              </label>
              <select
                className="px-4 py-3 rounded-xl glass-input text-sm bg-slate-900 text-slate-200"
                value={collectionId}
                onChange={e => setCollectionId(e.target.value)}
              >
                <option value="">-- No Collection --</option>
                {collections.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {group === 'Custom' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
                Custom Group Name
              </label>
              <input
                type="text"
                required
                className="px-4 py-3 rounded-xl glass-input text-sm"
                placeholder="Enter custom category name"
                value={customGroup}
                onChange={e => setCustomGroup(e.target.value)}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              rows={2}
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="Add optional notes about what this workspace is for..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 light:text-slate-500 uppercase tracking-wide">
              Tags (Comma separated)
            </label>
            <input
              type="text"
              className="px-4 py-3 rounded-xl glass-input text-sm"
              placeholder="e.g. routine, social, daily-review"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              id="favorite"
              className="w-4 h-4 rounded text-indigo-600 border-indigo-500/30 bg-slate-900"
              checked={favorite}
              onChange={e => setFavorite(e.target.checked)}
            />
            <label htmlFor="favorite" className="text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer">
              <Heart size={14} className={favorite ? 'fill-red-500 text-red-500' : 'text-slate-400'} />
              Mark as Favorite Session
            </label>
          </div>

          <div className="h-[1px] bg-slate-800/40 my-2" />

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setShowShare(!showShare)}
              className="px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs flex items-center gap-1.5 text-slate-400"
            >
              <Share2 size={14} />
              Share Config
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/10"
              >
                <Save size={14} />
                Save Session
              </button>
            </div>
          </div>
        </form>

        {showShare && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800/60 flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">JSON Configuration Payload</span>
              <button
                onClick={handleCopyJSON}
                className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1"
              >
                <Clipboard size={10} />
                Copy JSON
              </button>
            </div>
            <pre className="text-[10px] font-mono text-slate-400 overflow-x-auto max-h-40 p-2 bg-slate-950/60 rounded border border-slate-900">
              {getShareJSON()}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
