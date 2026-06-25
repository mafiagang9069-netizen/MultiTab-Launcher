import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldAlert, FolderHeart, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Bulk URL Launcher',
      desc: 'Smart validation auto-corrects URLs like google.com to https://google.com on the fly.',
      icon: Zap
    },
    {
      title: 'Saved Workspaces',
      desc: 'Group URLs into custom categories like Work, Marketing, or Social, and launch with one click.',
      icon: FolderHeart
    },
    {
      title: 'Blocker Diagnostics',
      desc: 'Built-in Browser Capability Scanner checks permissions and scans your popup settings.',
      icon: ShieldAlert
    }
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
      {/* Hero Section */}
      <section className="text-center max-w-3xl flex flex-col items-center gap-6 mt-6 md:mt-12">
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold uppercase tracking-wider animate-pulse-slow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Production-Ready Suite v1.0
        </div>

        <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none text-slate-100 light:text-slate-900">
          Launch 1 URL in{' '}
          <span className="bg-gradient-to-r from-brand-primary via-brand-accent to-pink-500 bg-clip-text text-transparent">
            100 Tabs
          </span>{' '}
          Instantly
        </h1>
        
        <p className="text-base md:text-lg text-slate-400 light:text-slate-600 font-medium leading-relaxed max-w-xl">
          A premium browser automation dashboard that groups tabs into sessions, tests pop-up blocking capabilities, and queues launches securely.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
          <button
            onClick={() => navigate('/launcher')}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-extrabold text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:scale-[1.03] transition duration-200"
          >
            <Play size={18} fill="white" />
            Open Launcher
          </button>
          
          <button
            onClick={() => navigate('/sessions')}
            className="px-8 py-4 rounded-xl glass-button-secondary font-extrabold text-base flex items-center justify-center gap-2 hover:scale-[1.03] transition duration-200"
          >
            Explore Workspace Templates
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Trust factors */}
      <div className="flex flex-wrap justify-center gap-6 md:gap-12 mt-12 text-slate-500 text-xs font-bold uppercase tracking-widest">
        <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-brand-success" /> Fast</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-brand-success" /> Secure</span>
        <span className="flex items-center gap-1.5"><CheckCircle2 size={16} className="text-brand-success" /> Offline Ready</span>
      </div>

      {/* Feature Showcase Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-16 md:mt-24 w-full">
        {features.map((feat, index) => {
          const IconComponent = feat.icon;
          return (
            <div 
              key={index} 
              className="glass-card p-6 rounded-2xl border border-slate-800/60 light:border-slate-200 flex flex-col gap-4 hover:border-indigo-500/30 transition-all duration-300 group"
            >
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 w-fit group-hover:scale-110 transition duration-300">
                <IconComponent size={24} />
              </div>
              <h3 className="font-extrabold text-lg text-slate-100 light:text-slate-900 group-hover:text-indigo-400 transition">
                {feat.title}
              </h3>
              <p className="text-sm text-slate-400 light:text-slate-600 font-medium leading-relaxed">
                {feat.desc}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
