import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Info, Map as MapIcon, Globe, MessageSquare, ShieldCheck, 
  Ban, CheckCircle2, Car, Waves, Trash2, Utensils, 
  Eye, EyeOff, Send, Plus, Trash, ShoppingBag,
  MapPin, ExternalLink, Loader2, User, RefreshCw,
  Calendar, ShoppingCart, X, Sparkles, Briefcase, Tag, 
  ArrowRight, Navigation, Languages, ClipboardList, Wand2, AlertTriangle
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { SiteContent, Activity, Ally, Feedback, Reservation } from './types';
import { GoogleGenAI, Type } from "@google/genai";
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

interface ActivityCardProps {
  // Fix: Explicitly include key in props interface to satisfy strict JSX prop checking if needed
  key?: React.Key;
  activity: Activity;
  isAdmin: boolean;
  t: any;
  onClick?: () => void;
  isAiReady: boolean;
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
  const [reservations, setReservations] = useState<Reservation[]>([]);
  
  const [translatedContent, setTranslatedContent] = useState<SiteContent | null>(null);
  const [translatedActivities, setTranslatedActivities] = useState<Activity[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showReservations, setShowReservations] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [newFeedback, setNewFeedback] = useState({ name: '', comment: '' });
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [activeTab, setActiveTab] = useState<'info' | 'explora' | 'travel' | 'feedback' | 'aliados'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState<string | null>(null);
  const [mapResults, setMapResults] = useState<Record<string, { text: string, links: any[] }>>({});
  
  const [selectedAllyForBooking, setSelectedAllyForBooking] = useState<Ally | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // La constante isAiReady verifica si la llave está presente en el entorno
  const isAiReady = useMemo(() => {
    return !!process.env.API_KEY && process.env.API_KEY !== 'undefined';
  }, []);

  useEffect(() => {
    localStorage.setItem('app_lang', language);
    if (language === 'en' && !isAdmin && isAiReady) {
      translateDynamicData();
    } else {
      setTranslatedContent(null);
      setTranslatedActivities([]);
    }
  }, [language, isAdmin, isAiReady]);

  const translateDynamicData = async () => {
    if (isTranslating || !isAiReady) return;
    setIsTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const sourceData = {
        content,
        activities: activities.slice(0, 5).map(a => ({ 
          id: a.id, title: a.title, description: a.description 
        }))
      };

      const prompt = `Translate this tourism app content to English. Return ONLY JSON. Context: Los Frailes Beach, Ecuador. Data: ${JSON.stringify(sourceData)}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || "{}");
      if (result.content) setTranslatedContent({ ...content, ...result.content });
      if (result.activities) {
        setTranslatedActivities(activities.map(original => {
          const trans = result.activities.find((a: any) => a.id === original.id);
          return trans ? { ...original, ...trans } : original;
        }));
      }
    } catch (e) {
      console.error("AI Translation Error:", e);
    } finally {
      setIsTranslating(false);
    }
  };

  const displayContent = useMemo(() => (language === 'en' && translatedContent) ? translatedContent : content, [language, translatedContent, content]);
  const displayActivities = useMemo(() => (language === 'en' && translatedActivities.length > 0) ? translatedActivities : activities, [language, translatedActivities, activities]);

  useEffect(() => {
    const unsubContent = onSnapshot(doc(db, 'content', 'main'), (snap) => {
      if (snap.exists()) setContent(prev => ({ ...prev, ...snap.data() as SiteContent }));
      else setDoc(doc(db, 'content', 'main'), INITIAL_CONTENT);
      setIsLoading(false);
    });

    const unsubActivities = onSnapshot(query(collection(db, 'activities'), orderBy('timestamp', 'desc')), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    const unsubAllies = onSnapshot(query(collection(db, 'allies'), orderBy('timestamp', 'desc')), (snap) => {
      setAllies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ally)));
    });

    const unsubFeedbacks = onSnapshot(query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc')), (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback & { id: string })));
    });

    const unsubReservations = onSnapshot(query(collection(db, 'reservations'), orderBy('timestamp', 'desc')), (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Reservation)));
    });

    return () => { unsubContent(); unsubActivities(); unsubAllies(); unsubFeedbacks(); unsubReservations(); };
  }, []);

  const toggleLanguage = () => setLanguage(prev => prev === 'es' ? 'en' : 'es');

  const handleAdminAction = async (action: () => Promise<void>) => {
    if (!isAdmin) return;
    try { await action(); } catch (error) { console.error("Firebase Error:", error); }
  };

  const getDirections = async (ally: Ally) => {
    if (!isAiReady) {
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(ally.name + ' ' + (ally.address || 'Puerto López'))}`, '_blank');
      return;
    }
    setLoadingMap(ally.id);
    let latLng = { latitude: -1.5544, longitude: -80.8206 };
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
      });
      latLng = { latitude: position.coords.latitude, longitude: position.coords.longitude };
    } catch (e) { console.warn("Geo fallback"); }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Instrucciones detalladas de cómo llegar a ${ally.name} en Manabí. Idioma: ${language === 'es' ? 'Español' : 'Inglés'}`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { tools: [{ googleMaps: {} }], toolConfig: { retrievalConfig: { latLng } } },
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks = chunks.filter((c: any) => c.maps).map((c: any) => c.maps);
      setMapResults(prev => ({ ...prev, [ally.id]: { text: response.text || "Calculando ruta...", links: mapsLinks } }));
    } catch (err) {
      console.error(err);
      window.open(`https://www.google.com/maps/search/${encodeURIComponent(ally.name)}`, '_blank');
    } finally { setLoadingMap(null); }
  };

  // Fix: Added missing submitFeedback function to handle user feedback submission
  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.name || !newFeedback.comment) return;
    setFeedbackStatus('sending');
    try {
      await addDoc(collection(db, 'feedbacks'), {
        ...newFeedback,
        timestamp: serverTimestamp()
      });
      setNewFeedback({ name: '', comment: '' });
      setFeedbackStatus('success');
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch (e) {
      console.error("Feedback Error:", e);
      setFeedbackStatus('idle');
    }
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
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${isAiReady ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
            {isAiReady ? <Sparkles size={12}/> : <AlertTriangle size={12}/>}
            <span className="text-[8px] font-black uppercase tracking-tighter">{isAiReady ? 'LLAVE OK' : 'FALTA LLAVE'}</span>
          </div>
          <button onClick={() => setShowReservations(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black border border-blue-500 bg-blue-500/20 text-blue-400">
            <ClipboardList size={12}/> {t.admin.reservations}
          </button>
          <button onClick={() => setIsAdmin(false)} className="bg-white/10 px-4 py-2 rounded-xl text-[9px] font-black border border-white/20">{t.admin.exit}</button>
        </div>
      )}

      <button onClick={toggleLanguage} className="fixed top-24 right-6 z-[100] w-12 h-12 bg-white rounded-full shadow-2xl border border-slate-100 flex items-center justify-center text-slate-900 active:scale-90 transition-all group">
        <Languages size={20} className="group-hover:rotate-12 transition-transform"/>
        <span className="absolute -bottom-1 -right-1 bg-[#118AB2] text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter border-2 border-white shadow-sm">{language}</span>
      </button>

      <header className="relative h-[48vh] md:h-[58vh] w-full shadow-2xl overflow-hidden bg-slate-200">
        <EditableImage isAdmin={isAdmin} src={displayContent.heroImage} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroImage: url }); })} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-8 sm:p-14 pointer-events-none">
          <div onClick={() => { if (isAdmin) return; setClickCount(c => c + 1); if (clickTimer.current) clearTimeout(clickTimer.current); clickTimer.current = setTimeout(() => setClickCount(0), 1500); if (clickCount + 1 >= 5) setShowAdminLogin(true); }} className="max-w-2xl cursor-pointer active:scale-[0.99] transition-transform pointer-events-auto">
            <EditableText isAdmin={isAdmin} text={displayContent.heroTitle} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroTitle: val }); })} className="text-4xl sm:text-6xl font-black text-white mb-2 drop-shadow-2xl" />
          </div>
          <div className="pointer-events-auto">
            <EditableText isAdmin={isAdmin} text={displayContent.heroSubtitle} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroSubtitle: val }); })} className="text-lg sm:text-2xl text-white/90 font-semibold leading-tight drop-shadow-md max-w-xl" />
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
                    <ListEditor items={displayContent.normativasPermitido} field="normativasPermitido" title={t.info.allowed} icon={CheckCircle2} colorClass="bg-emerald-50 border-emerald-200 text-emerald-800" isAdmin={isAdmin} content={displayContent} />
                    <ListEditor items={displayContent.normativasNoPermitido} field="normativasNoPermitido" title={t.info.notAllowed} icon={Ban} colorClass="bg-rose-50 border-rose-200 text-rose-800" isAdmin={isAdmin} content={displayContent} />
                  </div>
                )},
                { id: 'parqueadero', label: t.tabs.parqueadero, content: (
                  <ListEditor items={displayContent.parqueaderoItems} field="parqueaderoItems" title={t.info.parking} icon={Car} colorClass="bg-white border-slate-200 text-amber-700" isAdmin={isAdmin} content={displayContent} />
                )},
                { id: 'seguridad', label: t.tabs.seguridad, content: (
                  <ListEditor items={displayContent.seguridadItems} field="seguridadItems" title={t.info.safety} icon={ShieldCheck} colorClass="bg-white border-slate-200 text-blue-700" isAdmin={isAdmin} content={displayContent} />
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
                {displayActivities.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} isAdmin={isAdmin} t={t} onClick={() => !isAdmin && setSelectedActivity(activity)} isAiReady={isAiReady} />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'aliados' && (
          <div className="space-y-10 animate-in fade-in">
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
                        <EditableText isAdmin={isAdmin} text={ally.name} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { name: val }); })} className="text-3xl font-black text-slate-900 mb-1 leading-none" />
                        {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm(t.common.delete)) await deleteDoc(doc(db, 'allies', ally.id)); })} className="text-rose-300 hover:text-rose-500 p-2"><Trash size={20}/></button>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <button onClick={() => setSelectedAllyForBooking(ally)} className="py-4 rounded-[1.5rem] bg-[#118AB2] text-white font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"><Calendar size={16}/> {t.locales.reserve}</button>
                        <button onClick={() => getDirections(ally)} disabled={!!loadingMap} className="py-4 rounded-[1.5rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                          {loadingMap === ally.id ? <Loader2 className="animate-spin" size={16}/> : <MapIcon size={16}/>} {t.locales.directions}
                        </button>
                      </div>
                      {mapResults[ally.id] && (
                         <div className="mt-6 p-6 bg-blue-50 rounded-3xl border border-blue-100 animate-in zoom-in-95">
                            <p className="text-[12px] font-bold text-slate-700 leading-relaxed mb-4">{mapResults[ally.id].text}</p>
                            {mapResults[ally.id].links.map((link, i) => (
                              <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 text-[10px] font-black uppercase"><MapIcon size={14}/> {link.title || "Maps"}</a>
                            ))}
                         </div>
                      )}
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
               <div className="space-y-6">
                 {feedbacks.map(f => (
                   <div key={f.id} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative group transition-all hover:bg-white">
                     <span className="font-black text-slate-900 text-[13px]">{f.name}</span>
                     <p className="text-slate-600 font-semibold text-sm italic leading-relaxed mt-1">"{f.comment}"</p>
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

function ActivityCard({ activity, isAdmin, t, onClick, isAiReady }: ActivityCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateAIContent = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAiReady) return alert("No se detectó la clave de API. Agrégala en Vercel.");
    if (!activity.title || activity.title.includes('...')) return alert("Ingresa un nombre real para la actividad primero.");
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const prompt = `Actúa como un guía de Playa Los Frailes. Genera información para: "${activity.title}". JSON con: description (max 15 palabras), extendedDescription (3 párrafos), whatToBring (array 5), bestTime (texto), safetyTips (array 4).`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              extendedDescription: { type: Type.STRING },
              whatToBring: { type: Type.ARRAY, items: { type: Type.STRING } },
              bestTime: { type: Type.STRING },
              safetyTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["description", "extendedDescription", "whatToBring", "bestTime", "safetyTips"]
          }
        },
      });

      const result = JSON.parse(response.text || "{}");
      await updateDoc(doc(db, 'activities', activity.id), { ...result, timestamp: serverTimestamp() });
    } catch (err) {
      console.error(err);
      alert("Error al conectar con la IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div onClick={onClick} className={`bg-white rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col sm:flex-row border border-slate-50 hover:shadow-2xl transition-all group/card ${!isAdmin ? 'cursor-pointer' : ''}`}>
      <div className="w-full sm:w-56 h-56 relative bg-slate-100 flex-shrink-0">
        <EditableImage isAdmin={isAdmin} src={activity.image} onSave={(url) => updateDoc(doc(db, 'activities', activity.id), { image: url })} className="w-full h-full" />
      </div>
      <div className="p-8 flex-1 relative flex flex-col justify-center">
        {isAdmin && (
          <div className="absolute top-6 right-6 flex gap-2">
            <button onClick={generateAIContent} disabled={isGenerating || !isAiReady} className={`p-2.5 rounded-xl bg-blue-50 text-[#118AB2] hover:bg-[#118AB2] hover:text-white transition-all shadow-sm ${!isAiReady ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`}>
              {isGenerating ? <Loader2 className="animate-spin" size={20}/> : <Wand2 size={20}/>}
            </button>
            <button onClick={() => { if(confirm(t.common.delete)) deleteDoc(doc(db, 'activities', activity.id)); }} className="text-rose-300 hover:text-rose-500 p-2.5 bg-rose-50 rounded-xl"><Trash2 size={20}/></button>
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