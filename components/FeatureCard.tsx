
import React from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer glass p-8 rounded-[2rem] hover:border-white/20 hover:bg-zinc-900/40 transition-all duration-700 flex items-center gap-8 relative overflow-hidden"
    >
      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white group-hover:bg-white group-hover:text-black transition-all duration-500 shadow-xl border border-white/10 group-hover:scale-110">
        {icon}
      </div>
      <div className="flex-1 space-y-1">
        <h3 className="text-xl font-bold tracking-tight text-white group-hover:translate-x-1 transition-transform">{title}</h3>
        <p className="text-zinc-500 text-sm leading-relaxed font-light">{description}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </div>
    </div>
  );
};
