import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', action = null) => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substr(2, 5);
    setToasts((prev) => [...prev, { id, message, type, action }]);
    
    // Auto-remove toast after 5 seconds if there is no interactive action
    if (!action) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Portal/Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm px-4 md:px-0">
        {toasts.map((toast) => (
          <ToastCard 
            key={toast.id} 
            toast={toast} 
            onClose={() => removeToast(toast.id)} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard = ({ toast, onClose }) => {
  const { message, type, action } = toast;

  const config = {
    success: {
      bg: 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400',
      icon: CheckCircle2,
      bar: 'bg-emerald-500'
    },
    error: {
      bg: 'bg-red-950/90 border-red-500/30 text-red-400',
      icon: AlertCircle,
      bar: 'bg-red-500'
    },
    warning: {
      bg: 'bg-amber-950/90 border-amber-500/30 text-amber-400',
      icon: AlertTriangle,
      bar: 'bg-amber-500'
    },
    info: {
      bg: 'bg-slate-900/95 border-indigo-500/30 text-indigo-400',
      icon: Info,
      bar: 'bg-indigo-500'
    }
  }[type] || {
    bg: 'bg-slate-900/95 border-slate-700 text-slate-300',
    icon: Info,
    bar: 'bg-indigo-500'
  };

  const IconComponent = config.icon;

  return (
    <div 
      className={`relative flex gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 transform translate-y-0 animate-float-slow ${config.bg}`}
      role="alert"
    >
      <div className="mt-0.5 shrink-0">
        <IconComponent size={20} />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <p className="text-sm font-medium leading-relaxed text-slate-200">
          {message}
        </p>
        {action && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                action.onClick();
                onClose();
              }}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-3 py-1.5 rounded-lg transition"
            >
              {action.label}
            </button>
            {action.secondaryLabel && (
              <button
                onClick={onClose}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-3 py-1.5 rounded-lg transition"
              >
                {action.secondaryLabel}
              </button>
            )}
          </div>
        )}
      </div>
      <button 
        onClick={onClose}
        className="shrink-0 p-1 hover:bg-slate-800/40 rounded-lg text-slate-400 hover:text-slate-200 transition"
      >
        <X size={16} />
      </button>

      {/* Auto-dismiss progress bar */}
      {!action && (
        <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden rounded-b-xl">
          <div className={`h-full w-full origin-left animate-[shrink_5s_linear] ${config.bar}`} style={{
            animationName: 'shrink',
            animationDuration: '5000ms',
            animationTimingFunction: 'linear',
            animationFillMode: 'forwards'
          }} />
        </div>
      )}

      {/* Injecting CSS Keyframes inline */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shrink {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}} />
    </div>
  );
};
