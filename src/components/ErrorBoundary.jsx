import React from 'react';
import { AlertOctagon, RotateCw, RefreshCw } from 'lucide-react';
import { getCheckpoints, loadWorkspace, saveWorkspace } from '../utils/storage';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRestoreCheckpoint = () => {
    const checkpoints = getCheckpoints();
    if (checkpoints.length > 0) {
      const latest = checkpoints[0];
      const ws = loadWorkspace();
      
      const prof = latest.currentProfile;
      if (ws.profiles[prof]) {
        ws.profiles[prof].sessions = latest.workspaceState.sessions || [];
        ws.profiles[prof].collections = latest.workspaceState.collections || [];
        saveWorkspace(ws);
        alert('Workspace restored to last checkpoint. Reloading page...');
        window.location.reload();
      } else {
        alert('Could not find profile for latest checkpoint.');
      }
    } else {
      alert('No recovery checkpoints available.');
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-6 min-h-[400px]">
          <div className="glass-card max-w-md w-full p-8 rounded-2xl border border-red-500/20 text-center flex flex-col items-center gap-6 shadow-xl shadow-red-500/5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
              <AlertOctagon size={32} />
            </div>
            
            <div className="flex flex-col gap-2">
              <h3 className="text-xl font-extrabold text-slate-100">Something went wrong.</h3>
              <p className="text-xs text-slate-400 font-medium">
                An unexpected error occurred in this section of the workspace.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 px-4 py-3 rounded-xl glass-button-secondary font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 hover:text-indigo-400"
              >
                <RotateCw size={14} />
                Reload Page
              </button>
              
              <button
                onClick={this.handleRestoreCheckpoint}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-red-500/10"
              >
                <RefreshCw size={14} />
                Restore Checkpoint
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
