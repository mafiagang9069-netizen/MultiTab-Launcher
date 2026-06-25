import React, { useState, useEffect } from 'react';

export default function StatCard({ title, value, icon: IconComponent, description, color = 'indigo' }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value) || 0;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    const duration = 1200; // ms
    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad formula
      const easeProgress = progress * (2 - progress);
      const currentVal = Math.floor(easeProgress * end);
      
      setDisplayValue(currentVal);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  const colorStyles = {
    indigo: {
      border: 'border-[var(--card-border-indigo)] hover:border-[var(--card-border-indigo-hover)]',
      iconBg: 'bg-[var(--card-icon-indigo-bg)] text-[var(--card-icon-indigo-text)]',
      shadow: 'hover:shadow-indigo-500/5'
    },
    violet: {
      border: 'border-[var(--card-border-violet)] hover:border-[var(--card-border-violet-hover)]',
      iconBg: 'bg-[var(--card-icon-violet-bg)] text-[var(--card-icon-violet-text)]',
      shadow: 'hover:shadow-violet-500/5'
    },
    emerald: {
      border: 'border-[var(--card-border-emerald)] hover:border-[var(--card-border-emerald-hover)]',
      iconBg: 'bg-[var(--card-icon-emerald-bg)] text-[var(--card-icon-emerald-text)]',
      shadow: 'hover:shadow-emerald-500/5'
    },
    amber: {
      border: 'border-[var(--card-border-amber)] hover:border-[var(--card-border-amber-hover)]',
      iconBg: 'bg-[var(--card-icon-amber-bg)] text-[var(--card-icon-amber-text)]',
      shadow: 'hover:shadow-amber-500/5'
    }
  }[color] || {
    border: 'border-[var(--card-border)] hover:border-[var(--card-border-indigo-hover)]',
    iconBg: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
    shadow: ''
  };

  return (
    <div className={`glass-card p-6 rounded-2xl flex flex-col gap-4 border transition-all duration-300 ${colorStyles.border} ${colorStyles.shadow}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wide text-slate-400 light:text-slate-500 uppercase">
          {title}
        </span>
        <div className={`p-2.5 rounded-xl ${colorStyles.iconBg}`}>
          <IconComponent size={20} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1">
        <span className="text-3xl font-extrabold tracking-tight text-slate-100 light:text-slate-900">
          {displayValue.toLocaleString()}
        </span>
        <span className="text-xs text-slate-500 font-medium">
          {description}
        </span>
      </div>
    </div>
  );
}
