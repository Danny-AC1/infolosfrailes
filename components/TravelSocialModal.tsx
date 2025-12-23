
import React from 'react';
import { X, Globe, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';

interface TravelSocialModalProps {
  onClose: () => void;
  t: any;
  link: string;
}

export default function TravelSocialModal({ onClose, t, link }: TravelSocialModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3.5rem] sm:rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl relative">
        
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#118AB2]/10 to-transparent pointer-events-none" />

        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full text-slate-400 hover:text-rose-500 shadow-lg active:scale-90 transition-all">
          <X size={24}/>
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar p-10 pt-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-[#118AB2] rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Globe size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tighter uppercase">{t.travel.socialLabel}</h3>
              <p className="text-[10px] font-black text-[#118AB2] uppercase tracking-[0.2em]">{t.travel.socialDetailTitle}</p>
            </div>
          </div>

          <div className="space-y-4 mb-10">
            {t.travel.socialFeatures.map((feature: string, idx: number) => (
              <div key={idx} className="flex items-start gap-4 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 transition-all hover:bg-white hover:shadow-md">
                <CheckCircle2 className="text-[#118AB2] flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm font-bold text-slate-700 leading-relaxed">{feature}</p>
              </div>
            ))}
          </div>

          <div className="bg-[#118AB2]/5 border-2 border-[#118AB2]/20 p-8 rounded-[2.5rem] text-center mb-10">
            <p className="text-sm font-black text-slate-800 leading-relaxed mb-6">
              {t.travel.socialCTA}
            </p>
            <a 
              href={link} 
              target="_blank" 
              rel="noreferrer" 
              className="w-full bg-[#118AB2] text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              {t.travel.enterSocial} <ExternalLink size={18}/>
            </a>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-slate-300 pb-4">
             <Sparkles size={14} />
             <span className="text-[8px] font-black uppercase tracking-widest">Ecuador Travel Social Network</span>
          </div>
        </div>
      </div>
    </div>
  );
}
