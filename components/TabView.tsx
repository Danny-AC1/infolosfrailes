
import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabViewProps {
  tabs: Tab[];
}

export default function TabView({ tabs }: TabViewProps) {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex bg-white/60 p-1.5 rounded-2xl border border-white shadow-sm overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[100px] whitespace-nowrap py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-md scale-100'
                : 'text-slate-400 hover:text-slate-600 scale-95 opacity-70 hover:opacity-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[250px] animate-in fade-in slide-in-from-top-1">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
