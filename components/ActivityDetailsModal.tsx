
import React, { useState } from 'react';
import { 
  X, ShieldAlert, Sun, 
  Briefcase, Info, AlertCircle, Check, Plus, Trash2, Save
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
 * - Texto Justificado
 */
const formatFormattedText = (text: string) => {
  if (!text) return null;
  
  return text.split('\n').map((line, i) => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return <div key={i} className="h-2" />;

    const isListItem = trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ');
    const content = isListItem ? trimmedLine.substring(2) : trimmedLine;

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

/**
 * Componente interno para gestionar listas de strings (Qué llevar, Seguridad)
 */
function ListManager({ items, onUpdate, title, icon: Icon, colorClass, isAdmin, t }: any) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onUpdate([...(items || []), newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onUpdate((items || []).filter((_: any, i: number) => i !== index));
  };

  return (
    <section className="animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-xl ${colorClass}`}>{Icon}</div>
        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{title}</h4>
      </div>

      <div className="space-y-3">
        {isAdmin && (
          <div className="flex gap-2 mb-4">
            <input 
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Agregar nuevo ítem..."
              className="flex-1 bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-[#118AB2] transition-all"
            />
            <button 
              onClick={addItem}
              className="bg-[#118AB2] text-white p-2 rounded-xl shadow-lg active:scale-90 transition-all"
            >
              <Plus size={20}/>
            </button>
          </div>
        )}

        <div className="grid gap-2">
          {(!items || items.length === 0) && !isAdmin ? (
            <p className="text-[10px] text-slate-300 italic italic">Sin información específica aún.</p>
          ) : (
            (items || []).map((item: string, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-50 shadow-sm group">
                <Check size={12} className="text-[#118AB2] flex-shrink-0" />
                <span className="flex-1 text-xs font-bold text-slate-700 text-justify leading-tight">{item}</span>
                {isAdmin && (
                  <button onClick={() => removeItem(i)} className="text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                    <Trash2 size={14}/>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default function ActivityDetailsModal({ activity, onClose, language, t, isAdmin, onUpdate }: ActivityDetailsModalProps) {
  const extendedInfo = activity.extendedDescription || activity.description || '';

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

          <div className="p-8 pt-2 space-y-10">
            {/* SOBRE LA ACTIVIDAD */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl text-[#118AB2]"><Info size={18}/></div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.description}</h4>
                </div>
                {isAdmin && (
                  <span className="text-[7px] font-black text-[#118AB2] uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">
                    Modo Editor: Use ** para negritas
                  </span>
                )}
              </div>
              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                {isAdmin ? (
                   <EditableText 
                    isAdmin={true} 
                    text={activity.extendedDescription || activity.description || ''} 
                    multiline
                    onSave={(val) => onUpdate?.({ extendedDescription: val })}
                    className="leading-relaxed text-justify text-slate-700 font-medium text-sm"
                   />
                ) : (
                  <div className="leading-relaxed text-justify">
                    {formatFormattedText(extendedInfo)}
                  </div>
                )}
              </div>
            </section>

            <div className="grid sm:grid-cols-2 gap-8">
              {/* QUÉ LLEVAR */}
              <ListManager 
                items={activity.whatToBring} 
                onUpdate={(newItems: string[]) => onUpdate?.({ whatToBring: newItems })}
                title={t.activityDetails.whatToBring}
                icon={<Briefcase size={18}/>}
                colorClass="bg-amber-50 text-amber-600"
                isAdmin={isAdmin}
                t={t}
              />

              {/* MEJOR MOMENTO */}
              <section className="animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600"><Sun size={18}/></div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">{t.activityDetails.bestTime}</h4>
                </div>
                <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                  <EditableText 
                    isAdmin={!!isAdmin} 
                    text={activity.bestTime || 'Cualquier momento es ideal en este paraíso.'} 
                    onSave={(val) => onUpdate?.({ bestTime: val })}
                    className="text-emerald-800 text-[11px] font-bold leading-relaxed text-justify"
                  />
                </div>
              </section>
            </div>

            {/* SEGURIDAD Y AMBIENTE */}
            <ListManager 
              items={activity.safetyTips} 
              onUpdate={(newItems: string[]) => onUpdate?.({ safetyTips: newItems })}
              title={t.activityDetails.safety}
              icon={<ShieldAlert size={18}/>}
              colorClass="bg-rose-50 text-rose-600"
              isAdmin={isAdmin}
              t={t}
            />

            <div className="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
