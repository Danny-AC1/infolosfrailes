
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
      <div className="flex bg-white/50 p-1.5 rounded-2xl border border-white overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[100px] whitespace-nowrap py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-md scale-100'
                : 'text-slate-400 hover:text-slate-600 scale-95 opacity-70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[300px]">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
