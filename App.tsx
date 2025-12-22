
import React, { useState, useEffect, useRef } from 'react';
import { 
  Info, Map as MapIcon, Globe, MessageSquare, ShieldCheck, 
  Ban, CheckCircle2, Car, Waves, Trash2, Utensils, 
  Plus, Trash, RefreshCw, Languages, ClipboardList, Sparkles,
  ShoppingBag, ExternalLink, Eye, EyeOff, Briefcase, Send, Loader2,
  ShoppingCart
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { db } from './firebase';
import { SiteContent, Activity, Ally, Feedback } from './types';
import { translations } from './translations';

// Components
import TabView from './components/TabView';
import EditableText from './components/EditableText';
import EditableImage from './components/EditableImage';
import ReservationModal from './components/ReservationModal';
import ActivityDetailsModal from './components/ActivityDetailsModal';

const INITIAL_CONTENT: SiteContent = {
  id: 'main',
  heroTitle: 'Playa Los Frailes',
  heroSubtitle: 'Tu guía digital para el paraíso de Manabí',
  heroImage: '', 
  normativasPermitido: ['Ropa cómoda'],
  normativasNoPermitido: ['Mascotas', 'Alcohol'],
  parqueaderoItems: ['Horario: 08:00 - 16:00'],
  seguridadItems: ['Atención a banderas'],
  aliadosVisible: true,
  tiendaVisible: true,
  ecuadorTravelPromo: {
    title: 'Ecuador Travel',
    description: 'Nuestra red social dedicada a compartir la magia de Manabí.',
    image: '',
    link: 'https://socialmanabitravel.vercel.app/'
  },
  tiendaPromo: {
    title: 'Arte Del Mar',
    description: 'Tienda Online de artesanías únicas.',
    image: '',
    link: 'https://arte-del-mar.web.app/'
  }
};

// Fixed: Added 'key' to ActivityCardProps to resolve TypeScript JSX validation errors
interface ActivityCardProps {
  activity: Activity;
  isAdmin: boolean;
  t: any;
  onClick?: () => void;
  onGenerateIA?: (id: string, title: string) => Promise<void> | void;
  isGenerating?: boolean;
  key?: React.Key;
}

// Fixed: Moved ActivityCard above App component for better hoisting and scope clarity
function ActivityCard({ activity, isAdmin, t, onClick, onGenerateIA, isGenerating }: ActivityCardProps) {
  return (
    <div onClick={onClick} className={`bg-white rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col sm:flex-row border border-slate-50 hover:shadow-2xl transition-all group/card ${!isAdmin ? 'cursor-pointer' : ''}`}>
      <div className="w-full sm:w-56 h-56 relative bg-slate-100 flex-shrink-0">
        <EditableImage isAdmin={isAdmin} src={activity.image} onSave={(url) => updateDoc(doc(db, 'activities', activity.id), { image: url })} className="w-full h-full" />
      </div>
      <div className="p-8 flex-1 relative flex flex-col justify-center">
        {isAdmin && (
          <div className="absolute top-6 right-6 flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); onGenerateIA?.(activity.id, activity.title); }} 
              disabled={isGenerating}
              className={`p-2.5 rounded-xl transition-all shadow-md ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-blue-500 text-white hover:bg-blue-600 active:scale-90'}`}
            >
              {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20}/>}
            </button>
            <button onClick={(e) => { e.stopPropagation(); if(confirm(t.common.delete)) deleteDoc(doc(db, 'activities', activity.id)); }} className="text-rose-300 hover:text-rose-500 p-2.5 bg-rose-50 rounded-xl transition-all"><Trash2 size={20}/></button>
          </div>
        )}
        <div className="mb-2">
          <EditableText isAdmin={isAdmin} text={activity.title} onSave={(val) => updateDoc(doc(db, 'activities', activity.id), { title: val })} className="text-2xl font-black text-slate-800 leading-tight" />
        </div>
        <EditableText isAdmin={isAdmin} text={activity.description} onSave={(val) => updateDoc(doc(db, 'activities', activity.id), { description: val })} className="text-slate-500 text-sm font-medium leading-relaxed" multiline />
        {!isAdmin && (
          <div className="mt-4 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-[#118AB2] opacity-0 group-hover/card:opacity-100 transition-opacity">
            <Sparkles size={10} /> {t.explora.tapToSee}
          </div>
        )}
      </div>
    </div>
  );
}

// Fixed: Moved ListEditor above App component for better hoisting and scope clarity
function ListEditor({ items, field, title, icon: Icon, colorClass, isAdmin, content }: any) {
  const updateList = async (field: string, index: number, newValue: string | null) => {
    const currentList = Array.isArray(content[field]) ? [...(content[field] as string[])] : [];
    if (newValue === null) currentList.splice(index, 1);
    else if (index === -1) currentList.push('...');
    else currentList[index] = newValue;
    await updateDoc(doc(db, 'content', 'main'), { [field]: currentList });
  };

  return (
    <div className={`${colorClass} p-6 rounded-[2.5rem] border shadow-sm transition-all`}>
      <div className="flex justify-between items-center mb-5 px-2">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-widest text-[9px] opacity-80"><Icon size={14}/> {title}</h3>
        {isAdmin && <button onClick={() => updateList(field, -1, '')} className="bg-white/60 hover:bg-white p-1 rounded-lg shadow-sm active:scale-90 transition-all"><Plus size={14} /></button>}
      </div>
      <ul className="space-y-3">
        {(items || []).map((n: string, i: number) => (
          <li key={i} className="flex items-start gap-2 group bg-white/40 p-2.5 rounded-2xl border border-white/20">
            <div className="flex-1">
              <EditableText isAdmin={isAdmin} text={n} onSave={(val: string) => updateList(field, i, val)} className="text-[12px] font-bold text-slate-800 leading-tight" multiline={isAdmin} />
            </div>
            {isAdmin && <button onClick={() => updateList(field, i, null)} className="text-slate-400 opacity-0 group-hover:opacity-100 p-1 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [language, setLanguage] = useState<'es' | 'en'>(() => {
    return (localStorage.getItem('app_lang') as 'es' | 'en') || 'es';
  });
  const t = translations[language];

  const [content, setContent] = useState<SiteContent>(INITIAL_CONTENT);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allies, setAllies] = useState<Ally[]>([]);
  const [feedbacks, setFeedbacks] = useState<(Feedback & { id: string })[]>([]);
  
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'explora' | 'travel' | 'feedback' | 'aliados'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingIA, setIsGeneratingIA] = useState<string | null>(null);
  
  const [selectedAllyForBooking, setSelectedAllyForBooking] = useState<Ally | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [newFeedback, setNewFeedback] = useState({ name: '', comment: '' });
  
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.setItem('app_lang', language);
  }, [language]);

  useEffect(() => {
    // SEGURIDAD: Temporizador para forzar el fin de carga si Firebase no responde
    const safetyTimeout = setTimeout(() => {
      console.warn("Firebase tardó demasiado. Cargando contenido local por defecto.");
      setIsLoading(false);
    }, 5000);

    const errorLogger = (err: any) => {
      console.error("Firebase Snapshot Error:", err);
      setIsLoading(false);
    };

    const unsubContent = onSnapshot(doc(db, 'content', 'main'), (snap) => {
      if (snap.exists()) setContent(prev => ({ ...prev, ...snap.data() as SiteContent }));
      else setDoc(doc(db, 'content', 'main'), INITIAL_CONTENT);
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    }, errorLogger);

    const unsubActivities = onSnapshot(query(collection(db, 'activities'), orderBy('timestamp', 'desc')), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    }, errorLogger);

    const unsubAllies = onSnapshot(query(collection(db, 'allies'), orderBy('timestamp', 'desc')), (snap) => {
      setAllies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ally)));
    }, errorLogger);

    const unsubFeedbacks = onSnapshot(query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc')), (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback & { id: string })));
    }, errorLogger);

    return () => { 
      clearTimeout(safetyTimeout);
      unsubContent(); 
      unsubActivities(); 
      unsubAllies(); 
      unsubFeedbacks(); 
    };
  }, []);

  const handleGenerateIA = async (id: string, title: string) => {
    if (!isAdmin) return;
    setIsGeneratingIA(id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Genera información detallada para la actividad turística "${title}" en Playa Los Frailes, Manabí, Ecuador. Sé creativo y profesional.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING, description: "Resumen breve de la actividad" },
              extendedDescription: { type: Type.STRING, description: "Descripción detallada y atractiva" },
              whatToBring: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de 5 cosas necesarias" },
              bestTime: { type: Type.STRING, description: "Mejor horario o temporada para realizarla" },
              safetyTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 consejos de seguridad o ambientales" }
            },
            required: ["description", "extendedDescription", "whatToBring", "bestTime", "safetyTips"]
          }
        }
      });

      const data = JSON.parse(response.text);
      await updateDoc(doc(db, 'activities', id), data);
    } catch (error) {
      console.error("IA Error:", error);
      alert("Error al generar información. Intenta de nuevo.");
    } finally {
      setIsGeneratingIA(null);
    }
  };

  const handleAdminAction = async (action: () => Promise<void>) => {
    if (!isAdmin) return;
    try { await action(); } catch (error) { console.error("Firebase Error:", error); }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.name || !newFeedback.comment) return;
    setFeedbackStatus('sending');
    try {
      await addDoc(collection(db, 'feedbacks'), { ...newFeedback, timestamp: serverTimestamp() });
      setNewFeedback({ name: '', comment: '' });
      setFeedbackStatus('success');
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch (e) { console.error(e); setFeedbackStatus('idle'); }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#F2E8CF] flex flex-col items-center justify-center z-[200]">
        <RefreshCw className="animate-spin text-[#118AB2] mb-4" size={40} />
        <p className="text-[#118AB2] font-black text-[10px] uppercase tracking-[0.3em]">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F2E8CF] pb-24 font-['Montserrat'] overflow-x-hidden">
      {isAdmin && (
        <div className="bg-slate-900 text-white py-3 sticky top-0 z-[150] flex flex-wrap justify-center items-center gap-3 shadow-2xl px-4 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 mr-2 bg-white/10 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">{t.admin.mode}</span>
          </div>
          <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { aliadosVisible: !content.aliadosVisible }); })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black transition-all ${content.aliadosVisible ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'}`}
            >
              {content.aliadosVisible ? <Eye size={12}/> : <EyeOff size={12}/>} {t.admin.locales}
            </button>
            <button 
              onClick={() => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { tiendaVisible: !content.tiendaVisible }); })}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black transition-all ${content.tiendaVisible ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-400'}`}
            >
              {content.tiendaVisible ? <Eye size={12}/> : <EyeOff size={12}/>} {t.admin.tienda}
            </button>
          </div>
          <button onClick={() => setIsAdmin(false)} className="bg-white/10 px-4 py-2 rounded-xl text-[9px] font-black border border-white/20">{t.admin.exit}</button>
        </div>
      )}

      <button onClick={() => setLanguage(prev => prev === 'es' ? 'en' : 'es')} className="fixed top-24 right-6 z-[100] w-12 h-12 bg-white rounded-full shadow-2xl border border-slate-100 flex items-center justify-center text-slate-900 active:scale-90 transition-all group">
        <Languages size={20} className="group-hover:rotate-12 transition-transform"/>
        <span className="absolute -bottom-1 -right-1 bg-[#118AB2] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter border-2 border-white shadow-sm">{language}</span>
      </button>

      <header className="relative h-[48vh] md:h-[58vh] w-full shadow-2xl overflow-hidden bg-slate-200">
        <EditableImage isAdmin={isAdmin} src={content.heroImage} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroImage: url }); })} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-8 sm:p-14 pointer-events-none">
          <div onClick={() => { if (isAdmin) return; setClickCount(c => c + 1); if (clickTimer.current) clearTimeout(clickTimer.current); clickTimer.current = setTimeout(() => setClickCount(0), 1500); if (clickCount + 1 >= 5) setShowAdminLogin(true); }} className="max-w-2xl cursor-pointer pointer-events-auto">
            <EditableText isAdmin={isAdmin} text={content.heroTitle} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroTitle: val }); })} className="text-4xl sm:text-6xl font-black text-white mb-2 drop-shadow-2xl" />
          </div>
          <div className="pointer-events-auto">
            <EditableText isAdmin={isAdmin} text={content.heroSubtitle} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroSubtitle: val }); })} className="text-lg sm:text-2xl text-white/90 font-semibold leading-tight drop-shadow-md max-w-xl" />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 mt-8">
        <nav className="flex items-stretch bg-white rounded-[2.5rem] shadow-2xl p-1.5 mb-10 border border-slate-100 sticky top-6 z-[80] backdrop-blur-xl bg-white/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'info', icon: Info, label: t.nav.info },
            { id: 'explora', icon: Waves, label: t.nav.explora },
            { id: 'travel', icon: Globe, label: t.nav.travel },
            { id: 'aliados', icon: Utensils, label: t.nav.aliados, hidden: !content.aliadosVisible && !isAdmin },
            { id: 'feedback', icon: MessageSquare, label: t.nav.feedback }
          ].filter(t => !t.hidden).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-4 rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-[#118AB2] text-white shadow-xl scale-100' : 'text-slate-400 hover:text-slate-600 scale-95 opacity-80'}`}>
              <tab.icon size={20} />
              <span className="text-[9px] mt-1.5 font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <TabView tabs={[
                { id: 'normativas', label: t.tabs.normativas, content: (
                  <div className="space-y-6">
                    <ListEditor items={content.normativasPermitido} field="normativasPermitido" title={t.info.allowed} icon={CheckCircle2} colorClass="bg-emerald-50 border-emerald-200 text-emerald-800" isAdmin={isAdmin} content={content} />
                    <ListEditor items={content.normativasNoPermitido} field="normativasNoPermitido" title={t.info.notAllowed} icon={Ban} colorClass="bg-rose-50 border-rose-200 text-rose-800" isAdmin={isAdmin} content={content} />
                  </div>
                )},
                { id: 'parqueadero', label: t.tabs.parqueadero, content: (
                  <ListEditor items={content.parqueaderoItems} field="parqueaderoItems" title={t.info.parking} icon={Car} colorClass="bg-white border-slate-200 text-amber-700" isAdmin={isAdmin} content={content} />
                )},
                { id: 'seguridad', label: t.tabs.seguridad, content: (
                  <ListEditor items={content.seguridadItems} field="seguridadItems" title={t.info.safety} icon={ShieldCheck} colorClass="bg-white border-slate-200 text-blue-700" isAdmin={isAdmin} content={content} />
                )}
            ]} />
          </div>
        )}

        {activeTab === 'explora' && (
          <div className="space-y-16 animate-in fade-in py-4">
            <section>
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <Waves className="text-[#118AB2]" size={28} />
                  <h2 className="text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter">{t.explora.activities}</h2>
                </div>
                {isAdmin && (
                  <button onClick={() => handleAdminAction(async () => { await addDoc(collection(db, 'activities'), { title: 'Nueva Actividad', description: '...', image: '', price: '0.00', type: 'activity', timestamp: serverTimestamp() }); })} className="bg-[#118AB2] text-white p-3 rounded-2xl shadow-xl active:scale-90 transition-all"><Plus size={20}/></button>
                )}
              </div>
              <div className="grid gap-8">
                {activities.filter(a => a.type === 'activity').map(activity => (
                  <ActivityCard key={activity.id} activity={activity} isAdmin={isAdmin} t={t} onClick={() => !isAdmin && setSelectedActivity(activity)} onGenerateIA={handleGenerateIA} isGenerating={isGeneratingIA === activity.id} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <Briefcase className="text-[#118AB2]" size={28} />
                  <h2 className="text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter">{t.explora.services}</h2>
                </div>
                {isAdmin && (
                  <button onClick={() => handleAdminAction(async () => { await addDoc(collection(db, 'activities'), { title: 'Nuevo Servicio', description: '...', image: '', price: '0.00', type: 'service', timestamp: serverTimestamp() }); })} className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl active:scale-90 transition-all"><Plus size={20}/></button>
                )}
              </div>
              <div className="grid gap-8">
                {activities.filter(a => a.type === 'service').map(service => (
                  <ActivityCard key={service.id} activity={service} isAdmin={isAdmin} t={t} onClick={() => !isAdmin && setSelectedActivity(service)} onGenerateIA={handleGenerateIA} isGenerating={isGeneratingIA === service.id} />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 py-4">
            <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-white">
              <div className="h-64 relative bg-slate-100">
                <EditableImage isAdmin={isAdmin} src={content.ecuadorTravelPromo.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'ecuadorTravelPromo.image': url }); })} className="w-full h-full" />
                <div className="absolute top-6 left-6"><span className="bg-[#118AB2] text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg flex items-center gap-2"><Globe size={12}/> {t.travel.socialLabel}</span></div>
              </div>
              <div className="p-10">
                <EditableText isAdmin={isAdmin} text={content.ecuadorTravelPromo.title} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'ecuadorTravelPromo.title': val }); })} className="text-3xl font-black text-slate-900 mb-3" />
                <EditableText isAdmin={isAdmin} text={content.ecuadorTravelPromo.description} multiline onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'ecuadorTravelPromo.description': val }); })} className="text-slate-500 font-medium leading-relaxed mb-8" />
                <a href={content.ecuadorTravelPromo.link} target="_blank" rel="noreferrer" className="w-full bg-[#118AB2] text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                  {t.travel.enterSocial} <ExternalLink size={18}/>
                </a>
              </div>
            </div>

            {content.tiendaVisible && (
              <div className="bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl border border-white/10">
                <div className="h-64 relative bg-slate-800">
                  <EditableImage isAdmin={isAdmin} src={content.tiendaPromo.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'tiendaPromo.image': url }); })} className="w-full h-full" />
                  <div className="absolute top-6 left-6"><span className="bg-amber-500 text-white text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg flex items-center gap-2"><ShoppingBag size={12}/> {t.travel.storeLabel}</span></div>
                </div>
                <div className="p-10">
                  <EditableText isAdmin={isAdmin} text={content.tiendaPromo.title} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'tiendaPromo.title': val }); })} className="text-3xl font-black text-white mb-3" />
                  <EditableText isAdmin={isAdmin} text={content.tiendaPromo.description} multiline onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'tiendaPromo.description': val }); })} className="text-white/60 font-medium leading-relaxed mb-8" />
                  <a href={content.tiendaPromo.link} target="_blank" rel="noreferrer" className="w-full bg-amber-500 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all">
                    {t.travel.goStore} <ExternalLink size={18}/>
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'aliados' && (
          <div className="space-y-10 animate-in fade-in py-4">
             <div className="flex justify-between items-end mb-8 px-2">
               <h2 className="text-4xl font-black text-slate-900 leading-none">{t.locales.title}</h2>
               {isAdmin && (
                  <button onClick={() => handleAdminAction(async () => { await addDoc(collection(db, 'allies'), { name: 'Nuevo Local', type: 'restaurante', description: '...', address: '', image: '', timestamp: serverTimestamp() }); })} className="bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg font-black text-[9px] uppercase tracking-tighter flex items-center gap-1"><Plus size={14}/> {t.locales.add}</button>
               )}
             </div>
             <div className="grid gap-12">
               {allies.map(ally => (
                 <div key={ally.id} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white">
                    <div className="h-64 relative bg-slate-100">
                      <EditableImage isAdmin={isAdmin} src={ally.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { image: url }); })} className="w-full h-full" />
                    </div>
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <EditableText isAdmin={isAdmin} text={ally.name} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { name: val }); })} className="text-3xl font-black text-slate-900 mb-1 leading-none" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{ally.type === 'hospedaje' ? t.locales.hotel : t.locales.restaurant}</span>
                        </div>
                        {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm(t.common.delete)) await deleteDoc(doc(db, 'allies', ally.id)); })} className="text-rose-300 hover:text-rose-500 p-2"><Trash size={20}/></button>}
                      </div>
                      <EditableText isAdmin={isAdmin} text={ally.description} multiline onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { description: val }); })} className="text-slate-500 font-medium text-sm leading-relaxed mb-6" />
                      <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setSelectedAllyForBooking(ally)} className="py-4 rounded-[1.5rem] bg-[#118AB2] text-white font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"><ShoppingCart size={16}/> {t.locales.reserve}</button>
                        <a href={`https://www.google.com/maps/search/${encodeURIComponent(ally.name + ' Manabi')}`} target="_blank" rel="noreferrer" className="py-4 rounded-[1.5rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"><MapIcon size={16}/> {t.locales.directions}</a>
                      </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="animate-in fade-in zoom-in-95 py-4">
             <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-white">
               <h2 className="text-3xl font-black text-slate-900 mb-8 text-center flex items-center justify-center gap-3"><MessageSquare className="text-[#118AB2]" size={32} /> {t.feedback.title}</h2>
               <form onSubmit={submitFeedback} className="space-y-6 mb-12">
                 <input type="text" value={newFeedback.name} onChange={(e) => setNewFeedback(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#118AB2] rounded-[1.5rem] p-5 font-bold outline-none transition-all shadow-inner" placeholder={t.feedback.name} required />
                 <textarea value={newFeedback.comment} onChange={(e) => setNewFeedback(p => ({ ...p, comment: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#118AB2] rounded-[1.5rem] p-5 font-bold outline-none transition-all min-h-[140px] shadow-inner" placeholder={t.feedback.message} required />
                 <button type="submit" disabled={feedbackStatus !== 'idle'} className={`w-full py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${feedbackStatus === 'success' ? 'bg-emerald-500 text-white' : feedbackStatus === 'sending' ? 'bg-slate-400 text-white' : 'bg-slate-900 text-white hover:bg-[#118AB2]'}`}>
                    {feedbackStatus === 'sending' ? <Loader2 className="animate-spin" /> : feedbackStatus === 'success' ? <CheckCircle2 size={24} /> : <Send size={24} />}
                    {feedbackStatus === 'sending' ? t.feedback.sending : feedbackStatus === 'success' ? t.feedback.thanks : t.feedback.publish}
                 </button>
               </form>
               <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar">
                 {feedbacks.map(f => (
                   <div key={f.id} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative group transition-all hover:bg-white">
                     <span className="font-black text-slate-900 text-[13px]">{f.name}</span>
                     <p className="text-slate-600 font-semibold text-sm italic leading-relaxed mt-1">"{f.comment}"</p>
                     {isAdmin && <button onClick={() => handleAdminAction(async () => { await deleteDoc(doc(db, 'feedbacks', f.id)); })} className="absolute top-4 right-4 text-rose-300 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-all"><Trash size={14}/></button>}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </main>

      {selectedAllyForBooking && <ReservationModal ally={selectedAllyForBooking} onClose={() => setSelectedAllyForBooking(null)} language={language} />}
      {selectedActivity && <ActivityDetailsModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} language={language} t={t} isAdmin={isAdmin} onUpdate={(updates) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', selectedActivity.id), updates); })} />}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">{t.admin.access}</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (adminPassword === '1996') { setIsAdmin(true); setShowAdminLogin(false); setAdminPassword(''); } else alert("Error"); }} className="space-y-6">
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#118AB2] rounded-[1.5rem] p-5 outline-none text-center text-5xl font-black tracking-widest" placeholder="****" autoFocus />
              <div className="flex gap-4"><button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 font-black text-slate-400 py-4 uppercase text-[10px] tracking-widest">{t.admin.close}</button><button type="submit" className="flex-1 bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#118AB2] shadow-xl transition-all">{t.admin.enter}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
