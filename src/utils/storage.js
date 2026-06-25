const ROOT_KEY = 'mt_enterprise_workspace_v1';

const DEFAULT_SETTINGS = {
  theme: 'dark',
  defaultTabCount: 5,
  defaultOpenMode: 'tab',
  autoSaveHistory: true,
  enableShortcuts: true,
  restoreOnStartup: true,
  currentProfile: 'Development',
  cleanShutdown: true,
  lastHeartbeat: Date.now(),
  keepLauncherOnTop: false,
  autoAdvanceDelay: 2,
  autoOpenWorkspaceManager: false
};

// Seed templates per profile
const SEED_TEMPLATES = {
  'Development': [
    { id: 'tpl-dev-front', name: 'Frontend Workspace', urls: ['https://github.com', 'https://react.dev', 'https://tailwindcss.com'], tabCount: 1, openMode: 'tab', group: 'Development', favorite: false, status: 'Active', tags: ['frontend', 'react'], notes: 'Frontend development environment.', version: '1.0' },
    { id: 'tpl-dev-back', name: 'Backend Workspace', urls: ['https://nodejs.org', 'https://expressjs.com', 'https://mongodb.com'], tabCount: 1, openMode: 'tab', group: 'Development', favorite: false, status: 'Active', tags: ['backend', 'database'], notes: 'Backend development environment.', version: '1.0' },
    { id: 'tpl-dev-ai', name: 'AI Workspace', urls: ['https://chatgpt.com', 'https://claude.ai', 'https://github.com'], tabCount: 1, openMode: 'tab', group: 'Development', favorite: true, status: 'Active', tags: ['ai', 'copilot'], notes: 'AI assistance for coding.', version: '1.0' }
  ],
  'Marketing': [
    { id: 'tpl-mkt-social', name: 'Social Media', urls: ['https://facebook.com', 'https://instagram.com', 'https://linkedin.com', 'https://twitter.com'], tabCount: 1, openMode: 'tab', group: 'Marketing', favorite: true, status: 'Active', tags: ['social', 'marketing'], notes: 'Social channel management.', version: '1.0' },
    { id: 'tpl-mkt-analytics', name: 'Analytics', urls: ['https://analytics.google.com', 'https://search.google.com/search-console'], tabCount: 1, openMode: 'tab', group: 'Marketing', favorite: false, status: 'Active', tags: ['seo', 'analytics'], notes: 'Search engine performance trackers.', version: '1.0' },
    { id: 'tpl-mkt-content', name: 'Content Creation', urls: ['https://canva.com', 'https://unsplash.com', 'https://pinterest.com'], tabCount: 1, openMode: 'tab', group: 'Marketing', favorite: false, status: 'Active', tags: ['design', 'assets'], notes: 'Design tool presets.', version: '1.0' }
  ],
  'Personal': [
    { id: 'tpl-pers-ent', name: 'Entertainment Workspace', urls: ['https://youtube.com', 'https://netflix.com', 'https://spotify.com'], tabCount: 1, openMode: 'tab', group: 'Personal', favorite: false, status: 'Active', tags: ['media', 'leisure'], notes: 'Streaming and audio.', version: '1.0' },
    { id: 'tpl-pers-news', name: 'News & Reading', urls: ['https://news.ycombinator.com', 'https://reddit.com', 'https://medium.com'], tabCount: 1, openMode: 'tab', group: 'Personal', favorite: true, status: 'Active', tags: ['reading', 'tech-news'], notes: 'Tech updates and discussions.', version: '1.0' }
  ],
  'AI Research': [
    { id: 'tpl-ai-research', name: 'AI Tools Workspace', urls: ['https://chatgpt.com', 'https://claude.ai', 'https://gemini.google.com', 'https://perplexity.ai'], tabCount: 1, openMode: 'tab', group: 'AI Research', favorite: true, status: 'Active', tags: ['research', 'llm'], notes: 'AI research assistant list.', version: '1.0' }
  ]
};

// Initial state model
const createDefaultWorkspace = () => {
  const workspace = {
    version: '1.0',
    profiles: {
      'Development': { sessions: [...SEED_TEMPLATES['Development']], collections: [], history: [], analytics: {}, snapshots: [], schedules: [] },
      'Marketing': { sessions: [...SEED_TEMPLATES['Marketing']], collections: [], history: [], analytics: {}, snapshots: [], schedules: [] },
      'Personal': { sessions: [...SEED_TEMPLATES['Personal']], collections: [], history: [], analytics: {}, snapshots: [], schedules: [] },
      'AI Research': { sessions: [...SEED_TEMPLATES['AI Research']], collections: [], history: [], analytics: {}, snapshots: [], schedules: [] }
    },
    settings: { ...DEFAULT_SETTINGS },
    recoveryCheckpoints: [],
    auditLogs: []
  };
  return workspace;
};

// SCHEMA VALIDATION LAYER
export const validateWorkspaceSchema = (data) => {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== '1.0') return false;
  if (!data.profiles || typeof data.profiles !== 'object') return false;
  if (!data.settings || typeof data.settings !== 'object') return false;

  const requiredProfiles = ['Development', 'Marketing', 'Personal', 'AI Research'];
  for (const prof of requiredProfiles) {
    if (!data.profiles[prof] || typeof data.profiles[prof] !== 'object') return false;
    const p = data.profiles[prof];
    if (!Array.isArray(p.sessions)) return false;
    if (!Array.isArray(p.collections)) return false;
    if (!Array.isArray(p.history)) return false;
    if (typeof p.analytics !== 'object') return false;
    if (!Array.isArray(p.snapshots)) return false;
    if (!Array.isArray(p.schedules)) return false;
  }
  return true;
};

// ABSTRACT LOAD / SAVE WORKSPACE INTERFACES (Cloud Sync Preparation)
export const loadWorkspace = () => {
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    if (!raw) {
      // Check legacy migration
      return migrateStorage();
    }
    const parsed = JSON.parse(raw);
    if (!validateWorkspaceSchema(parsed)) {
      console.warn('Malformed workspace schema. Repairing...');
      const fallback = createDefaultWorkspace();
      // Attempt partial repair
      if (parsed.profiles) fallback.profiles = { ...fallback.profiles, ...parsed.profiles };
      if (parsed.settings) fallback.settings = { ...fallback.settings, ...parsed.settings };
      if (parsed.recoveryCheckpoints) fallback.recoveryCheckpoints = parsed.recoveryCheckpoints;
      if (parsed.auditLogs) fallback.auditLogs = parsed.auditLogs;
      saveWorkspace(fallback);
      return fallback;
    }
    return parsed;
  } catch (e) {
    console.error('Error loading workspace', e);
    return createDefaultWorkspace();
  }
};

export const saveWorkspace = (data) => {
  try {
    if (!validateWorkspaceSchema(data)) {
      console.error('Refusing to save malformed workspace data');
      return false;
    }
    localStorage.setItem(ROOT_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving workspace', e);
    return false;
  }
};

// STORAGE MIGRATION RUNNER
export const migrateStorage = () => {
  try {
    const workspace = createDefaultWorkspace();
    const legacySessions = localStorage.getItem('mt_sessions_v1');
    const legacyHistory = localStorage.getItem('mt_history_v1');
    const legacySettings = localStorage.getItem('mt_settings_v1');
    const legacySchedules = localStorage.getItem('mt_schedules_v1');

    let migrated = false;

    if (legacySessions) {
      const parsedSess = JSON.parse(legacySessions);
      if (Array.isArray(parsedSess)) {
        workspace.profiles['Development'].sessions = parsedSess.map(s => ({
          version: '1.0',
          id: s.id || 'sess_' + Date.now(),
          name: s.name || 'Migrated Session',
          urls: s.urls || [],
          tabCount: s.tabCount || 1,
          openMode: s.openMode || 'tab',
          group: s.group || 'Development',
          status: 'Active',
          favorite: false,
          tags: s.tags || [],
          notes: s.notes || ''
        }));
        migrated = true;
      }
    }

    if (legacyHistory) {
      const parsedHist = JSON.parse(legacyHistory);
      if (Array.isArray(parsedHist)) {
        workspace.profiles['Development'].history = parsedHist;
        migrated = true;
      }
    }

    if (legacySettings) {
      const parsedSettings = JSON.parse(legacySettings);
      workspace.settings = { ...workspace.settings, ...parsedSettings };
      migrated = true;
    }

    if (legacySchedules) {
      const parsedSchedules = JSON.parse(legacySchedules);
      if (Array.isArray(parsedSchedules)) {
        workspace.profiles['Development'].schedules = parsedSchedules;
        migrated = true;
      }
    }

    // Save migrated data
    saveWorkspace(workspace);

    // Prune old keys
    localStorage.removeItem('mt_sessions_v1');
    localStorage.removeItem('mt_history_v1');
    localStorage.removeItem('mt_settings_v1');
    localStorage.removeItem('mt_schedules_v1');

    if (migrated) {
      console.log('Migrated storage schema to version 1.0 successfully.');
    }
    return workspace;
  } catch (e) {
    console.error('Storage migration failed, fallback initialized', e);
    const workspace = createDefaultWorkspace();
    saveWorkspace(workspace);
    return workspace;
  }
};

// PROFILE GETTERS / MUTATORS
export const getActiveProfile = () => {
  const ws = loadWorkspace();
  return ws.settings.currentProfile || 'Development';
};

export const setActiveProfile = (profileName) => {
  const ws = loadWorkspace();
  ws.settings.currentProfile = profileName;
  saveWorkspace(ws);
  addAuditLog('PROFILE_SWITCHED', profileName);
};

export const getProfileData = () => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  return ws.profiles[prof];
};

export const updateProfileData = (updaterFn) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  ws.profiles[prof] = updaterFn(ws.profiles[prof]);
  saveWorkspace(ws);
};

// SETTINGS APIS
export const getSettings = () => {
  const ws = loadWorkspace();
  return ws.settings;
};

export const saveSettings = (settings) => {
  const ws = loadWorkspace();
  ws.settings = { ...ws.settings, ...settings };
  saveWorkspace(ws);
  return ws.settings;
};

export const resetSettings = () => {
  const ws = loadWorkspace();
  ws.settings = { ...DEFAULT_SETTINGS };
  saveWorkspace(ws);
  return ws.settings;
};

// SESSIONS APIS (WITH STORAGE SAFETY LIMITS: 500)
export const getSessions = () => {
  return getProfileData().sessions;
};

export const saveSession = (session) => {
  let created = false;
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  const newSession = {
    version: '1.0',
    id: session.id || 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    name: session.name,
    urls: session.urls,
    tabCount: session.tabCount || 1,
    openMode: session.openMode || 'tab',
    group: session.group || 'Custom',
    collectionId: session.collectionId || null,
    notes: session.notes || '',
    tags: session.tags || [],
    status: session.status || 'Active',
    favorite: session.favorite || false
  };

  const idx = profile.sessions.findIndex(s => s.id === newSession.id);
  if (idx > -1) {
    profile.sessions[idx] = newSession;
  } else {
    profile.sessions.push(newSession);
    created = true;
  }

  // Enforce Safety Limits: 500 sessions
  if (profile.sessions.length > 500) {
    profile.sessions.shift();
  }

  ws.profiles[prof] = profile;
  saveWorkspace(ws);

  if (created) {
    addAuditLog('SESSION_CREATED', newSession.name);
  }
  return newSession;
};

export const deleteSession = (id) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];
  
  const sess = profile.sessions.find(s => s.id === id);
  const name = sess ? sess.name : 'Unknown';

  profile.sessions = profile.sessions.filter(s => s.id !== id);
  ws.profiles[prof] = profile;
  saveWorkspace(ws);

  addAuditLog('SESSION_DELETED', name);
  return true;
};

// HISTORY APIS
export const getHistory = () => {
  return getProfileData().history;
};

export const addHistoryEntry = (entry) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  const newEntry = {
    id: 'hist_' + Date.now(),
    timestamp: new Date().toISOString(),
    urls: Array.isArray(entry.urls) ? entry.urls : [entry.url],
    tabCount: entry.tabCount,
    openMode: entry.openMode,
    starred: false,
    sessionName: entry.sessionName || null
  };

  profile.history.unshift(newEntry);
  if (profile.history.length > 200) {
    profile.history.pop();
  }

  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return newEntry;
};

export const toggleHistoryStar = (id) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  profile.history = profile.history.map(item => {
    if (item.id === id) {
      return { ...item, starred: !item.starred };
    }
    return item;
  });

  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return true;
};

export const deleteHistoryEntry = (id) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  profile.history = profile.history.filter(item => item.id !== id);
  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return true;
};

export const clearHistory = () => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  ws.profiles[prof].history = [];
  saveWorkspace(ws);
  return true;
};

// COLLECTIONS APIS (WITH STORAGE SAFETY LIMITS: 100)
export const getCollections = () => {
  return getProfileData().collections || [];
};

export const saveCollection = (collection) => {
  let created = false;
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  if (!profile.collections) profile.collections = [];

  const newCollection = {
    id: collection.id || 'coll_' + Date.now(),
    name: collection.name,
    favorite: collection.favorite || false
  };

  const idx = profile.collections.findIndex(c => c.id === newCollection.id);
  if (idx > -1) {
    profile.collections[idx] = newCollection;
  } else {
    profile.collections.push(newCollection);
    created = true;
  }

  // Enforce safety limits: 100 collections
  if (profile.collections.length > 100) {
    profile.collections.shift();
  }

  ws.profiles[prof] = profile;
  saveWorkspace(ws);

  if (created) {
    addAuditLog('COLLECTION_CREATED', newCollection.name);
  }
  return newCollection;
};

export const deleteCollection = (id) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  const coll = (profile.collections || []).find(c => c.id === id);
  const name = coll ? coll.name : 'Unknown';

  profile.collections = (profile.collections || []).filter(c => c.id !== id);
  // Unset collectionId for any sessions linked to this collection
  profile.sessions = profile.sessions.map(s => {
    if (s.collectionId === id) {
      return { ...s, collectionId: null };
    }
    return s;
  });

  ws.profiles[prof] = profile;
  saveWorkspace(ws);

  addAuditLog('COLLECTION_DELETED', name);
  return true;
};

// SCHEDULES APIS
export const getSchedules = () => {
  return getProfileData().schedules || [];
};

export const saveSchedule = (schedule) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  if (!profile.schedules) profile.schedules = [];

  const newSchedule = {
    id: schedule.id || 'sch_' + Date.now(),
    sessionId: schedule.sessionId,
    sessionName: schedule.sessionName,
    time: schedule.time,
    frequency: schedule.frequency,
    active: schedule.active !== undefined ? schedule.active : true
  };

  const idx = profile.schedules.findIndex(s => s.id === newSchedule.id);
  if (idx > -1) {
    profile.schedules[idx] = newSchedule;
  } else {
    profile.schedules.push(newSchedule);
  }

  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return newSchedule;
};

export const deleteSchedule = (id) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  profile.schedules = (profile.schedules || []).filter(s => s.id !== id);
  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return true;
};

// ANALYTICS APIS
export const getAnalytics = () => {
  return getProfileData().analytics || {};
};

export const trackSessionLaunch = (sessionId, tabCount) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  if (!profile.analytics) profile.analytics = {};

  const current = profile.analytics[sessionId] || {
    launchCount: 0,
    lastLaunched: null,
    averageTabs: 0,
    totalTabsOpened: 0
  };

  const count = current.launchCount + 1;
  const total = current.totalTabsOpened + tabCount;
  const avg = Math.round((total / count) * 10) / 10;

  profile.analytics[sessionId] = {
    sessionId,
    launchCount: count,
    lastLaunched: new Date().toISOString(),
    averageTabs: avg,
    totalTabsOpened: total
  };

  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  addAuditLog('SESSION_RESTORED', profile.sessions.find(s => s.id === sessionId)?.name || 'Ad-hoc');
};

// SNAPSHOT APIS (WITH SAFETY LIMIT: 1000)
export const getSnapshots = (sessionId) => {
  const snaps = getProfileData().snapshots || [];
  return snaps.filter(s => s.sessionId === sessionId);
};

export const saveSnapshot = (sessionId, urls, notes = '') => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  if (!profile.snapshots) profile.snapshots = [];

  const newSnap = {
    id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    sessionId,
    timestamp: new Date().toISOString(),
    urls,
    notes
  };

  profile.snapshots.unshift(newSnap);

  // Enforce Safety Limits: 1000 snapshots
  if (profile.snapshots.length > 1000) {
    profile.snapshots.pop();
  }

  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return newSnap;
};

export const deleteSnapshot = (id) => {
  const ws = loadWorkspace();
  const prof = getActiveProfile();
  const profile = ws.profiles[prof];

  profile.snapshots = (profile.snapshots || []).filter(s => s.id !== id);
  ws.profiles[prof] = profile;
  saveWorkspace(ws);
  return true;
};

// RECOVERY CHECKPOINTS APIS (WITH SAFETY LIMIT: 10)
export const getCheckpoints = () => {
  const ws = loadWorkspace();
  return ws.recoveryCheckpoints || [];
};

export const saveCheckpoint = (activeTabs, currentProfile) => {
  const ws = loadWorkspace();
  if (!ws.recoveryCheckpoints) ws.recoveryCheckpoints = [];

  const cleanTabs = activeTabs.map(t => ({
    id: t.id,
    url: t.url,
    openedAt: t.openedAt,
    status: t.status,
    pinned: t.pinned || false
  }));

  const checkpoint = {
    id: 'chk_' + Date.now(),
    timestamp: new Date().toISOString(),
    activeTabs: cleanTabs,
    currentProfile,
    workspaceState: {
      sessions: ws.profiles[currentProfile]?.sessions || [],
      collections: ws.profiles[currentProfile]?.collections || []
    }
  };

  ws.recoveryCheckpoints.unshift(checkpoint);

  // Enforce Limit: 10 checkpoints
  if (ws.recoveryCheckpoints.length > 10) {
    ws.recoveryCheckpoints.pop();
  }

  saveWorkspace(ws);
  return checkpoint;
};

export const clearCheckpoints = () => {
  const ws = loadWorkspace();
  ws.recoveryCheckpoints = [];
  saveWorkspace(ws);
};

// AUDIT LOG SYSTEM APIS (WITH SAFETY LIMIT: 200)
export const getAuditLogs = () => {
  const ws = loadWorkspace();
  return ws.auditLogs || [];
};

export const addAuditLog = (action, details = '') => {
  try {
    const ws = loadWorkspace();
    if (!ws.auditLogs) ws.auditLogs = [];

    const newLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      action,
      details,
      timestamp: new Date().toISOString(),
      profile: ws.settings.currentProfile || 'Development'
    };

    ws.auditLogs.unshift(newLog);

    if (ws.auditLogs.length > 200) {
      ws.auditLogs.pop();
    }

    saveWorkspace(ws);
    return newLog;
  } catch (e) {
    console.error('Failed to write audit log', e);
  }
};

// IMPORT / EXPORT ENTIRE SYSTEM BACKUP
export const exportBackupJSON = () => {
  const ws = loadWorkspace();
  const blob = new Blob([JSON.stringify(ws, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `multitab_launcher_backup_${Date.now()}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  addAuditLog('WORKSPACE_EXPORTED', 'Full backup file');
};

export const importBackupJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!validateWorkspaceSchema(parsed)) {
      return { success: false, error: 'Malformed backup schema. Import rejected.' };
    }
    const success = saveWorkspace(parsed);
    if (success) {
      addAuditLog('WORKSPACE_IMPORTED', 'Full backup file');
      return { success: true };
    }
    return { success: false, error: 'Failed to write backup to localStorage.' };
  } catch (e) {
    return { success: false, error: 'Invalid JSON file format.' };
  }
};

// SESSION MULTI-IMPORT/EXPORT
export const importSessionsJSON = (jsonString) => {
  try {
    const parsed = JSON.parse(jsonString);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    let importedCount = 0;

    list.forEach(item => {
      if (item.name && Array.isArray(item.urls)) {
        saveSession({
          name: item.name,
          urls: item.urls,
          tabCount: item.tabCount || 1,
          openMode: item.openMode || 'tab',
          group: item.group || 'Imported',
          collectionId: item.collectionId || null,
          notes: item.notes || '',
          tags: item.tags || []
        });
        importedCount++;
      }
    });

    if (importedCount > 0) {
      addAuditLog('WORKSPACE_IMPORTED', `${importedCount} sessions`);
      return { success: true, count: importedCount };
    }
    return { success: false, error: 'No valid sessions found in JSON' };
  } catch (e) {
    return { success: false, error: 'Invalid JSON format' };
  }
};
