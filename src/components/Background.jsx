import React from 'react';

export default function Background() {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none transition-colors duration-500" style={{ background: 'var(--bg-page-gradient)' }}>
      {/* Floating Glowing Orb 1 */}
      <div 
        className="absolute top-[10%] left-[15%] w-72 h-72 rounded-full bg-indigo-500 blur-[80px] animate-float-slow" 
        style={{ opacity: 'var(--orb-opacity-1)' }}
      />

      {/* Floating Glowing Orb 2 */}
      <div 
        className="absolute bottom-[20%] right-[10%] w-96 h-96 rounded-full bg-purple-500 blur-[100px] animate-float-slower" 
        style={{ opacity: 'var(--orb-opacity-2)' }}
      />

      {/* Floating Glowing Orb 3 */}
      <div 
        className="absolute top-[40%] right-[30%] w-64 h-64 rounded-full bg-emerald-500 blur-[60px] animate-pulse-slow" 
        style={{ opacity: 'var(--orb-opacity-3)' }}
      />
      
      {/* Grid Pattern overlay for depth */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
    </div>
  );
}
