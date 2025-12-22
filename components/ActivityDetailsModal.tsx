
import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Loader2, ShieldAlert, Sun, 
  Briefcase, Info, Waves, ChevronRight, AlertCircle, Save, Edit3, Wand2
} from 'lucide-react';
import { Activity } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import EditableText from './EditableText';

interface ActivityDetailsModalProps {
  activity: Activity;
  onClose: () => void;
  language: 'es' | 'en';
  t: any;
  isAdmin?: boolean;
  onUpdate?: (updates: Partial<Activity>) => void;
}

export default function ActivityDetailsModal({ activity, onClose, language, t, isAdmin, onUpdate }: ActivityDetailsModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAIContent = async () => {
    if (!isAdmin || !onUpdate) return;
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Genera una guía de experto detallada para la actividad: "${activity.title}" localizada en Playa Los Frailes, Parque Nacional Machalilla. 
      Idioma: ${language === 'es' ? 'Español' : 'Inglés'}. 
      Responde en JSON con: 
      - extendedDescription (3 párrafos cortos explicando la actividad paso a paso).
      - whatToBring (array de 5 strings con ítems esenciales).
      - bestTime (frase corta indicando mejor hora para evitar multitudes o calor).
      - safetyTips (array de 4 consejos de seguridad específicos del lugar).`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              extendedDescription: { type: Type.STRING },
              whatToBring: { type: Type.ARRAY, items: { type: Type.STRING } },
              bestTime: { type: Type.STRING },
              safetyTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["extendedDescription", "whatToBring", "bestTime", "safetyTips"]
          }
        },
      });

      const result = JSON.parse(response.text || "{}");
      onUpdate(result);
    } catch (err) {
      console.error(err);
      alert("Lo sentimos, no pudimos generar el contenido inteligente en este momento.");
    } finally {
      setIsGenerating(false);
    }
  };

  const hasData = activity.extendedDescription || activity.whatToBring || activity.bestTime || activity.safetyTips;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3.5rem] sm:rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl relative">
        
        {/* Decorative elements */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#118AB2]/10 to-transparent pointer-events-none" />

        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full text-slate-400 hover:text-rose-500 shadow-lg active:scale-90 transition-all">
          <X size={24}/>
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          {/* Cover */}
          <div className="h-64 w-full relative">
            <img 
              src={activity.image || 'https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&q=80&w=800'} 
              className="w-full h-full object-cover" 
              alt={activity.title}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
            <div className="absolute bottom-6 left-8 right-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-[#118AB2] text-white text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                  <Sparkles size={10}/> AI Guide
                </span>
                {isAdmin && (
                  <button 
                    onClick={generateAIContent}
                    disabled={isGenerating}
                    className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-[#118AB2] transition-colors active:scale-95"
                  >
                    {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10}/>} 
                    {hasData ? 'Regenerar con IA' : 'Generar Guía'}
                  </button>
                )}
              </div>
              <h3 className="text-3xl font-black text-slate-900 leading-none tracking-tighter uppercase">{activity.title}</h3>
            </div>
          </div>

          <div className="p-8 pt-2 space-y-8">
            {!hasData && !isAdmin ? (
               <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                 <AlertCircle className="text-slate-200 mb-4" size={48} />
                 <p className="text-slate-400 font-bold text-sm leading-relaxed italic">Esta actividad aún no tiene una guía inteligente disponible.</p>
               </div>
            ) : (
              <>
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-xl text-[#118AB2]"><Info size={18}/></div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.description}</h4>
                  </div>
                  <div className="text-slate-600 text-sm font-medium leading-relaxed bg-slate-50 p-6 rounded-[2rem] border border-slate-100 italic relative group">
                    <EditableText 
                      isAdmin={!!isAdmin} 
                      text={activity.extendedDescription || 'No hay descripción detallada disponible.'} 
                      multiline
                      onSave={(val) => onUpdate?.({ extendedDescription: val })}
                      className="italic leading-relaxed"
                    />
                  </div>
                </section>

                <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Briefcase size={18}/></div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.whatToBring}</h4>
                    </div>
                    <ul className="space-y-2">
                      {isAdmin ? (
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                           <EditableText 
                            isAdmin={true} 
                            text={activity.whatToBring?.join('\n') || ''} 
                            multiline
                            onSave={(val) => onUpdate?.({ whatToBring: val.split('\n').filter(Boolean) })}
                            className="text-xs font-bold text-slate-700"
                           />
                           <p className="text-[7px] text-slate-300 mt-2 uppercase font-black text-center tracking-widest">Ingresa un ítem por cada línea</p>
                        </div>
                      ) : (
                        activity.whatToBring?.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                            <ChevronRight size={12} className="text-amber-500" /> {item}
                          </li>
                        )) || <li className="text-[10px] text-slate-300 italic">No hay datos</li>
                      )}
                    </ul>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Sun size={18}/></div>
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.bestTime}</h4>
                    </div>
                    <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100 text-emerald-800 text-[11px] font-bold leading-relaxed">
                      <EditableText 
                        isAdmin={!!isAdmin} 
                        text={activity.bestTime || 'Cualquier momento es ideal.'} 
                        onSave={(val) => onUpdate?.({ bestTime: val })}
                      />
                    </div>
                  </section>
                </div>

                <section className="animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-rose-50 rounded-xl text-rose-600"><ShieldAlert size={18}/></div>
                    <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.safety}</h4>
                  </div>
                  <div className="grid gap-3">
                    {isAdmin ? (
                       <div className="bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                         <EditableText 
                          isAdmin={true} 
                          text={activity.safetyTips?.join('\n') || ''} 
                          multiline
                          onSave={(val) => onUpdate?.({ safetyTips: val.split('\n').filter(Boolean) })}
                          className="text-[11px] font-semibold text-rose-900"
                         />
                       </div>
                    ) : (
                      activity.safetyTips?.map((tip, i) => (
                        <div key={i} className="flex items-start gap-4 bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                          <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                          <p className="text-[11px] font-semibold text-rose-900 leading-tight">{tip}</p>
                        </div>
                      )) || <div className="text-[10px] text-slate-300 italic">No hay consejos disponibles</div>
                    )}
                  </div>
                </section>
              </>
            )}
            <div className="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
