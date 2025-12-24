
import React from 'react';
import { 
  X, ShieldAlert, Sun, 
  Briefcase, Info, AlertCircle, Check
} from 'lucide-react';
import { Activity } from '../types';
import EditableText from './EditableText';

interface ActivityDetailsModalProps {
  activity: Activity;
  onClose: () => void;
  language: 'es' | 'en';
  t: any;
  isAdmin?: boolean;
  onUpdate?: (updates: Partial<Activity>) => void;
}

/**
 * Procesa el texto para soportar:
 * - Negritas: **texto**
 * - Listas: Líneas que empiezan con "-" o "*"
 * - Saltos de línea: Párrafos separados
 * - Texto Justificado: Aplicado a cada bloque
 */
const formatFormattedText = (text: string) => {
  if (!text) return null;
  
  return text.split('\n').map((line, i) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={i} className="h-2" />; // Espacio para líneas vacías

    // Detectar si es un ítem de lista
    const isListItem = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');
    const content = isListItem ? trimmedLine.substring(2) : trimmedLine;

    // Procesar negrita: **texto**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const renderedContent = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="text-slate-900 font-black">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (isListItem) {
      return (
        <div key={i} className="flex gap-3 mb-2 ml-2 text-justify">
          <span className="text-[#118AB2] font-black">•</span>
          <div className="flex-1 text-slate-600 text-sm font-medium">{renderedContent}</div>
        </div>
      );
    }

    return (
      <p key={i} className="mb-3 last:mb-0 text-justify text-slate-600 text-sm font-medium leading-relaxed">
        {renderedContent}
      </p>
    );
  });
};

export default function ActivityDetailsModal({ activity, onClose, language, t, isAdmin, onUpdate }: ActivityDetailsModalProps) {
  // Se considera que hay datos si cualquiera de los campos principales tiene contenido
  // O si el admin lo está editando (para permitirle agregar datos nuevos)
  const extendedInfo = activity.extendedDescription || activity.description || '';
  
  const hasAdvancedData = !!(
    (activity.extendedDescription && activity.extendedDescription.trim() !== '') || 
    (activity.whatToBring && activity.whatToBring.length > 0) || 
    activity.bestTime || 
    (activity.safetyTips && activity.safetyTips.length > 0)
  );

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl h-[92vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3.5rem] sm:rounded-[3.5rem] flex flex-col overflow-hidden shadow-2xl relative">
        
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-[#118AB2]/10 to-transparent pointer-events-none" />

        <button onClick={onClose} className="absolute top-8 right-8 z-50 p-3 bg-white/80 backdrop-blur-md rounded-full text-slate-400 hover:text-rose-500 shadow-lg active:scale-90 transition-all">
          <X size={24}/>
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar relative">
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
                   {activity.type === 'activity' ? 'Actividad' : 'Servicio Local'}
                </span>
                {activity.price && (
                  <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-[0.3em] px-3 py-1 rounded-full shadow-lg">
                    $ {activity.price}
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-black text-slate-900 leading-none tracking-tighter uppercase">{activity.title}</h3>
            </div>
          </div>

          <div className="p-8 pt-2 space-y-8">
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl text-[#118AB2]"><Info size={18}/></div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.description}</h4>
                </div>
                {isAdmin && (
                  <span className="text-[7px] font-black text-[#118AB2] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">
                    Formato: **Negrita** y guión (-) para listas
                  </span>
                )}
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative group">
                {isAdmin ? (
                   <EditableText 
                    isAdmin={true} 
                    text={activity.extendedDescription || activity.description || ''} 
                    multiline
                    onSave={(val) => onUpdate?.({ extendedDescription: val })}
                    className="leading-relaxed text-justify"
                   />
                ) : (
                  <div className="leading-relaxed text-justify">
                    {formatFormattedText(extendedInfo)}
                  </div>
                )}
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
                       <p className="text-[7px] text-slate-300 mt-2 uppercase font-black text-center tracking-widest">Un ítem por línea</p>
                    </div>
                  ) : (
                    activity.whatToBring?.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-justify">
                        <Check size={12} className="text-amber-500 flex-shrink-0" /> {item}
                      </li>
                    )) || <li className="text-[10px] text-slate-300 italic">Sin datos específicos</li>
                  )}
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Sun size={18}/></div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.bestTime}</h4>
                </div>
                <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100 text-emerald-800 text-[11px] font-bold leading-relaxed text-justify">
                  <EditableText 
                    isAdmin={!!isAdmin} 
                    text={activity.bestTime || 'Cualquier momento es ideal en este paraíso.'} 
                    onSave={(val) => onUpdate?.({ bestTime: val })}
                    className="text-justify"
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
                      className="text-[11px] font-semibold text-rose-900 text-justify"
                     />
                     <p className="text-[7px] text-rose-300 mt-2 uppercase font-black text-center tracking-widest">Un consejo por línea</p>
                   </div>
                ) : (
                  activity.safetyTips?.map((tip, i) => (
                    <div key={i} className="flex items-start gap-4 bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                      <div className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                      <div className="text-[11px] font-semibold text-rose-900 leading-tight text-justify">
                        {formatFormattedText(tip)}
                      </div>
                    </div>
                  )) || <div className="text-[10px] text-slate-300 italic">Siga las normas generales del parque.</div>
                )}
              </div>
            </section>
            <div className="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
