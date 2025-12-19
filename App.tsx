
import React, { useState, useEffect, useRef } from 'react';
import { 
  Info, Map as MapIcon, Globe, MessageSquare, ShieldCheck, 
  Ban, CheckCircle2, Car, Waves, Trash2, Utensils, 
  Eye, EyeOff, Send, Plus, Trash, ShoppingBag,
  Hotel, MapPin, ExternalLink, Loader2, User, Image as ImageIcon, RefreshCw
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { SiteContent, Activity, Ally, Feedback } from './types';
import { GoogleGenAI } from "@google/genai";

// Components
import TabView from './components/TabView';
import EditableText from './components/EditableText';
import EditableImage from './components/EditableImage';

const INITIAL_CONTENT: SiteContent = {
  id: 'main',
  heroTitle: 'Playa Los Frailes',
  heroSubtitle: 'El secreto mejor guardado del Parque Nacional Machalilla',
  heroImage: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=2000',
  normativasPermitido: ['Ropa cómoda', 'Uso de protector solar biodegradable'],
  normativasNoPermitido: ['Mascotas', 'Alcohol', 'Fogatas'],
  parqueaderoItems: ['Horario: 08:00 - 16:00', 'Capacidad: 50 vehículos'],
  seguridadItems: ['Atención a banderas', 'No nadar solo'],
  aliadosVisible: true,
  tiendaVisible: true,
  ecuadorTravelPromo: {
    title: 'Manabí Travel Social',
    description: 'Nuestra red social dedicada a compartir la magia de Manabí.',
    image: 'https://images.unsplash.com/photo-1582967788606-a171c1080cb0?auto=format&fit=crop&q=80&w=1000',
    link: 'https://socialmanabitravel.vercel.app/'
  },
  tiendaPromo: {
    title: 'Tienda Online Los Frailes',
    description: 'Artesanías únicas de nuestra comunidad.',
    image: 'https://images.unsplash.com/photo-1605647540924-852290f6b0d5?auto=format&fit=crop&q=80&w=1000',
    link: 'https://arte-del-mar.web.app/'
  }
};

export default function App() {
  const [content, setContent] = useState<SiteContent>(INITIAL_CONTENT);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [allies, setAllies] = useState<Ally[]>([]);
  const [feedbacks, setFeedbacks] = useState<(Feedback & { id: string })[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [newFeedback, setNewFeedback] = useState({ name: '', comment: '' });
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [activeTab, setActiveTab] = useState<'info' | 'explora' | 'travel' | 'feedback' | 'aliados'>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState<string | null>(null);
  const [mapResults, setMapResults] = useState<Record<string, { text: string, links: any[] }>>({});

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubContent = onSnapshot(doc(db, 'content', 'main'), (snap) => {
      if (snap.exists()) {
        setContent(prev => ({ ...prev, ...snap.data() as SiteContent }));
      } else {
        setDoc(doc(db, 'content', 'main'), INITIAL_CONTENT);
      }
      setIsLoading(false);
    }, () => setIsLoading(false));

    const unsubActivities = onSnapshot(query(collection(db, 'activities'), orderBy('timestamp', 'desc')), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    const unsubAllies = onSnapshot(query(collection(db, 'allies'), orderBy('timestamp', 'desc')), (snap) => {
      setAllies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ally)));
    });

    const feedbacksQuery = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));
    const unsubFeedbacks = onSnapshot(feedbacksQuery, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback & { id: string })));
    });

    return () => {
      unsubContent(); unsubActivities(); unsubAllies(); unsubFeedbacks();
    };
  }, []);

  const handleAdminAction = async (action: () => Promise<void>) => {
    if (!isAdmin) return;
    try {
      await action();
    } catch (error) {
      console.error("Admin Error:", error);
      alert("Error al procesar la acción de administrador.");
    }
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.name.trim() || !newFeedback.comment.trim()) return;
    setFeedbackStatus('sending');
    try {
      await addDoc(collection(db, 'feedbacks'), {
        ...newFeedback,
        timestamp: serverTimestamp()
      });
      setFeedbackStatus('success');
      setNewFeedback({ name: '', comment: '' });
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch (err) {
      setFeedbackStatus('idle');
    }
  };

  const getDirections = async (ally: Ally) => {
    setLoadingMap(ally.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Guía para llegar a ${ally.name} en ${ally.address || 'Puerto López, Manabí'}.`,
        config: { tools: [{ googleMaps: {} }] },
      });
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks = chunks.filter((c: any) => c.maps).map((c: any) => c.maps);
      setMapResults(prev => ({ 
        ...prev, 
        [ally.id]: { text: response.text || "Ubicación lista.", links: mapsLinks } 
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMap(null);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#F2E8CF] flex flex-col items-center justify-center z-[200]">
        <RefreshCw className="animate-spin text-[#118AB2] mb-4" size={40} />
        <p className="text-[#118AB2] font-black text-[10px] uppercase tracking-[0.3em]">Conectando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F2E8CF] pb-24 font-['Montserrat'] overflow-x-hidden">
      {isAdmin && (
        <div className="bg-slate-900 text-white py-3 sticky top-0 z-[100] flex flex-wrap justify-center items-center gap-3 shadow-2xl px-4 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 mr-2 bg-white/10 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} className="text-[#118AB2]" />
            <span className="text-[9px] font-black uppercase tracking-widest">Editor</span>
          </div>
          <button 
            onClick={() => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { aliadosVisible: !content.aliadosVisible }); })} 
            className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all flex items-center gap-2 ${content.aliadosVisible ? 'bg-emerald-500' : 'bg-rose-500'}`}
          >
            {content.aliadosVisible ? <Eye size={12}/> : <EyeOff size={12}/>} LOCALES
          </button>
          <button 
            onClick={() => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { tiendaVisible: !content.tiendaVisible }); })} 
            className={`px-4 py-2 rounded-xl text-[9px] font-black transition-all flex items-center gap-2 ${content.tiendaVisible ? 'bg-amber-500' : 'bg-slate-700'}`}
          >
            <ShoppingBag size={12}/> TIENDA
          </button>
          <button onClick={() => setIsAdmin(false)} className="bg-white/10 text-white px-4 py-2 rounded-xl text-[9px] font-black border border-white/20">SALIR</button>
        </div>
      )}

      <header className="relative h-[48vh] md:h-[58vh] w-full shadow-2xl overflow-hidden group">
        <EditableImage 
          isAdmin={isAdmin} 
          src={content.heroImage} 
          onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroImage: url }); })} 
          className="w-full h-full" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent flex flex-col justify-end p-8 sm:p-14 pointer-events-none">
          <div 
            onClick={() => {
              if (isAdmin) return;
              setClickCount(c => c + 1);
              if (clickTimer.current) clearTimeout(clickTimer.current);
              clickTimer.current = setTimeout(() => setClickCount(0), 1500);
              if (clickCount + 1 >= 5) setShowAdminLogin(true);
            }} 
            className="max-w-2xl cursor-pointer active:scale-[0.99] transition-transform pointer-events-auto"
          >
            <EditableText isAdmin={isAdmin} text={content.heroTitle} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroTitle: val }); })} className="text-4xl sm:text-6xl font-black text-white mb-2 drop-shadow-2xl" />
          </div>
          <div className="pointer-events-auto">
            <EditableText isAdmin={isAdmin} text={content.heroSubtitle} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { heroSubtitle: val }); })} className="text-lg sm:text-2xl text-white/90 font-semibold leading-tight drop-shadow-md max-w-xl" />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 mt-8">
        <nav className="flex items-stretch bg-white rounded-[2.5rem] shadow-2xl p-1.5 mb-10 border border-slate-100 overflow-x-auto no-scrollbar sticky top-6 z-[80] backdrop-blur-xl bg-white/80">
          {[
            { id: 'info', icon: Info, label: 'Guía' },
            { id: 'explora', icon: Waves, label: 'Explora' },
            { id: 'travel', icon: Globe, label: 'Turismo' },
            { id: 'aliados', icon: Utensils, label: 'Locales', hidden: !content.aliadosVisible && !isAdmin },
            { id: 'feedback', icon: MessageSquare, label: 'Opiniones' }
          ].filter(t => !t.hidden).map((tab) => (
            <button 
              key={tab.id} 
              onClick={() => setActiveTab(tab.id as any)} 
              className={`flex-1 min-w-[70px] flex flex-col items-center justify-center py-4 rounded-[2rem] transition-all duration-300 ${activeTab === tab.id ? 'bg-[#118AB2] text-white shadow-xl scale-100' : 'text-slate-400 hover:text-slate-600 scale-95 opacity-80'}`}
            >
              <tab.icon size={20} />
              <span className="text-[9px] mt-1.5 font-black uppercase tracking-widest">{tab.label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TabView
              tabs={[
                { id: 'normativas', label: 'Normativas', content: (
                  <div className="space-y-6">
                    <ListEditor items={content.normativasPermitido} field="normativasPermitido" title="Sí se permite" icon={CheckCircle2} colorClass="bg-emerald-50 border-emerald-200 text-emerald-800" isAdmin={isAdmin} content={content} />
                    <ListEditor items={content.normativasNoPermitido} field="normativasNoPermitido" title="No se permite" icon={Ban} colorClass="bg-rose-50 border-rose-200 text-rose-800" isAdmin={isAdmin} content={content} />
                  </div>
                )},
                { id: 'parqueadero', label: 'Parqueadero', content: (
                  <ListEditor items={content.parqueaderoItems} field="parqueaderoItems" title="Info Vehicular" icon={Car} colorClass="bg-white border-slate-200 text-amber-700" isAdmin={isAdmin} content={content} />
                )},
                { id: 'seguridad', label: 'Seguridad', content: (
                  <ListEditor items={content.seguridadItems} field="seguridadItems" title="Zona Segura" icon={ShieldCheck} colorClass="bg-white border-slate-200 text-blue-700" isAdmin={isAdmin} content={content} />
                )}
              ]}
            />
          </div>
        )}

        {activeTab === 'explora' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            <section>
              <div className="flex justify-between items-end mb-6 px-2">
                <h2 className="text-3xl font-black text-slate-900 leading-none">Actividades</h2>
                {isAdmin && (
                  <button 
                    onClick={() => handleAdminAction(async () => { 
                      await addDoc(collection(db, 'activities'), { 
                        title: 'Nueva Actividad', 
                        description: 'Editar descripción...', 
                        image: '', 
                        type: 'activity', 
                        timestamp: serverTimestamp() 
                      }); 
                    })} 
                    className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl hover:scale-105 active:scale-90 transition-all"
                  >
                    <Plus size={20}/>
                  </button>
                )}
              </div>
              <div className="grid gap-8">
                {activities.filter(a => a.type === 'activity').map(activity => (
                  <div key={activity.id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col sm:flex-row border border-slate-50">
                    <div className="w-full sm:w-56 h-56 relative bg-slate-50">
                      <EditableImage isAdmin={isAdmin} src={activity.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { image: url }); })} className="w-full h-full" />
                    </div>
                    <div className="p-8 flex-1 relative flex flex-col justify-center">
                      {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm('¿Borrar?')) await deleteDoc(doc(db, 'activities', activity.id)); })} className="absolute top-6 right-6 text-rose-300 hover:text-rose-500"><Trash2 size={18}/></button>}
                      <EditableText isAdmin={isAdmin} text={activity.title} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { title: val }); })} className="text-2xl font-black text-slate-800 mb-2" />
                      <EditableText isAdmin={isAdmin} text={activity.description} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { description: val }); })} className="text-slate-500 text-sm font-medium leading-relaxed" multiline />
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            <section>
              <div className="flex justify-between items-end mb-6 px-2">
                <h2 className="text-3xl font-black text-slate-900 leading-none">Servicios</h2>
                {isAdmin && (
                  <button 
                    onClick={() => handleAdminAction(async () => { 
                      await addDoc(collection(db, 'activities'), { 
                        title: 'Nuevo Servicio', 
                        description: 'Editar servicio...', 
                        image: '', 
                        type: 'service', 
                        price: '$0.00', 
                        timestamp: serverTimestamp() 
                      }); 
                    })} 
                    className="bg-[#118AB2] text-white p-3 rounded-2xl shadow-xl hover:scale-105 active:scale-90 transition-all"
                  >
                    <Plus size={20}/>
                  </button>
                )}
              </div>
              <div className="grid gap-6">
                {activities.filter(a => a.type === 'service').map(service => (
                  <div key={service.id} className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-slate-50 p-6 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 relative bg-slate-50">
                      <EditableImage isAdmin={isAdmin} src={service.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', service.id), { image: url }); })} className="w-full h-full" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <EditableText isAdmin={isAdmin} text={service.title} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', service.id), { title: val }); })} className="text-lg font-black text-slate-800" />
                        <div className="flex items-center gap-2">
                           <EditableText isAdmin={isAdmin} text={service.price || ''} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', service.id), { price: val }); })} className="text-sm font-black text-[#118AB2]" />
                           {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm('¿Borrar?')) await deleteDoc(doc(db, 'activities', service.id)); })} className="text-rose-300 hover:text-rose-500"><Trash2 size={14}/></button>}
                        </div>
                      </div>
                      <EditableText isAdmin={isAdmin} text={service.description} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', service.id), { description: val }); })} className="text-xs text-slate-400 font-medium mt-1" multiline />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-12 animate-in fade-in duration-600">
             <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-slate-50">
               <div className="h-72 relative bg-slate-50">
                 <EditableImage isAdmin={isAdmin} src={content.ecuadorTravelPromo.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'ecuadorTravelPromo.image': url }); })} className="w-full h-full" />
               </div>
               <div className="p-10 text-center">
                 <EditableText isAdmin={isAdmin} text={content.ecuadorTravelPromo.title} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'ecuadorTravelPromo.title': val }); })} className="text-3xl font-black text-slate-900 mb-4" />
                 <EditableText isAdmin={isAdmin} text={content.ecuadorTravelPromo.description} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'ecuadorTravelPromo.description': val }); })} className="text-slate-500 font-medium mb-8 leading-relaxed text-sm" multiline />
                 <a href={content.ecuadorTravelPromo.link} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xs tracking-widest uppercase shadow-xl hover:bg-[#118AB2] active:scale-95 transition-all">VISITAR RED SOCIAL</a>
               </div>
             </div>

             {(content.tiendaVisible || isAdmin) && (
               <div className={`bg-slate-900 rounded-[3.5rem] overflow-hidden shadow-2xl border-2 transition-all duration-700 ${!content.tiendaVisible ? 'opacity-30 grayscale border-rose-500/50' : 'border-slate-800'}`}>
                 <div className="h-72 relative bg-slate-800">
                   <EditableImage isAdmin={isAdmin} src={content.tiendaPromo.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'tiendaPromo.image': url }); })} className="w-full h-full" />
                   {!content.tiendaVisible && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                       <span className="bg-rose-500 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-2xl">Oculto</span>
                     </div>
                   )}
                 </div>
                 <div className="p-10 text-center">
                   <EditableText isAdmin={isAdmin} text={content.tiendaPromo.title} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'tiendaPromo.title': val }); })} className="text-3xl font-black text-white mb-4" />
                   <EditableText isAdmin={isAdmin} text={content.tiendaPromo.description} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'content', 'main'), { 'tiendaPromo.description': val }); })} className="text-slate-400 font-medium mb-8 leading-relaxed text-sm" multiline />
                   <a href={content.tiendaPromo.link} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full bg-amber-400 text-slate-950 py-6 rounded-[2rem] font-black text-xs tracking-widest uppercase shadow-xl hover:brightness-110 active:scale-95 transition-all">IR A LA TIENDA</a>
                 </div>
               </div>
             )}
          </div>
        )}

        {activeTab === 'aliados' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="flex justify-between items-end mb-8 px-2">
               <h2 className="text-4xl font-black text-slate-900 leading-none">Aliados</h2>
               {isAdmin && (
                  <button 
                    onClick={() => handleAdminAction(async () => { 
                      await addDoc(collection(db, 'allies'), { 
                        name: 'Nuevo Aliado', 
                        type: 'restaurante', 
                        description: 'Editar aliado...', 
                        address: 'Puerto López', 
                        image: '', 
                        timestamp: serverTimestamp() 
                      }); 
                    })} 
                    className="bg-emerald-500 text-white p-3 rounded-2xl shadow-xl hover:scale-105 active:scale-90 transition-all"
                  >
                    <Plus size={24}/>
                  </button>
               )}
             </div>
             <div className="grid gap-10">
               {allies.map(ally => (
                 <div key={ally.id} className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-slate-50">
                    <div className="h-64 relative bg-slate-50 overflow-hidden">
                      <EditableImage isAdmin={isAdmin} src={ally.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { image: url }); })} className="w-full h-full" />
                    </div>
                    <div className="p-10">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <EditableText isAdmin={isAdmin} text={ally.name} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { name: val }); })} className="text-3xl font-black text-slate-900 mb-1 leading-none" />
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
                            <MapPin size={12} className="text-[#118AB2]"/> <EditableText isAdmin={isAdmin} text={ally.address || 'Ubicación...'} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { address: val }); })} />
                          </div>
                        </div>
                        {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm('¿Borrar?')) await deleteDoc(doc(db, 'allies', ally.id)); })} className="text-rose-300 hover:text-rose-500 p-2"><Trash size={20}/></button>}
                      </div>
                      <EditableText isAdmin={isAdmin} text={ally.description} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { description: val }); })} className="text-slate-500 text-sm font-medium leading-relaxed mb-8" multiline />
                      <button onClick={() => getDirections(ally)} disabled={!!loadingMap} className="w-full py-5 rounded-[1.5rem] bg-slate-950 text-white font-black text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-[#118AB2] disabled:bg-slate-300 shadow-xl">
                        {loadingMap === ally.id ? <Loader2 className="animate-spin" size={16}/> : <MapIcon size={16}/>} CÓMO LLEGAR
                      </button>
                      {mapResults[ally.id] && !loadingMap && (
                        <div className="mt-6 p-6 bg-[#F2E8CF]/60 rounded-3xl border border-[#F2E8CF] animate-in zoom-in-95 shadow-inner">
                          <p className="text-[11px] font-bold text-slate-700 leading-relaxed mb-4">{mapResults[ally.id].text}</p>
                          {mapResults[ally.id].links.map((link, i) => (
                            <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-[#118AB2] text-[9px] font-black uppercase tracking-widest">VER EN MAPA <ExternalLink size={14}/></a>
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
          <div className="animate-in fade-in zoom-in-95 duration-500 py-4">
             <div className="bg-white rounded-[3.5rem] p-10 shadow-2xl border border-white">
               <h2 className="text-3xl font-black text-slate-900 mb-8 text-center flex items-center justify-center gap-3">
                 <MessageSquare className="text-[#118AB2]" size={32} /> Tu opinión
               </h2>
               <form onSubmit={submitFeedback} className="space-y-6 mb-12">
                 <input type="text" value={newFeedback.name} onChange={(e) => setNewFeedback(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#118AB2] rounded-[1.5rem] p-5 font-bold outline-none transition-all shadow-inner" placeholder="Tu nombre" required />
                 <textarea value={newFeedback.comment} onChange={(e) => setNewFeedback(p => ({ ...p, comment: e.target.value }))} className="w-full bg-slate-50 border-2 border-transparent focus:border-[#118AB2] rounded-[1.5rem] p-5 font-bold outline-none transition-all min-h-[140px] shadow-inner" placeholder="Escribe tu mensaje..." required />
                 <button type="submit" disabled={feedbackStatus !== 'idle'} className={`w-full py-6 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${feedbackStatus === 'success' ? 'bg-emerald-500 text-white' : feedbackStatus === 'sending' ? 'bg-slate-400 text-white' : 'bg-slate-900 text-white hover:bg-[#118AB2]'}`}>
                    {feedbackStatus === 'sending' ? <Loader2 className="animate-spin" /> : feedbackStatus === 'success' ? <CheckCircle2 size={24} /> : <Send size={24} />}
                    {feedbackStatus === 'sending' ? 'ENVIANDO...' : feedbackStatus === 'success' ? '¡GRACIAS!' : 'PUBLICAR'}
                 </button>
               </form>
               <div className="space-y-6">
                 {feedbacks.map(f => (
                   <div key={f.id} className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100 relative group transition-all hover:bg-white">
                     <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-[#118AB2] shadow-sm"><User size={16}/></div>
                           <span className="font-black text-slate-900 text-[13px]">{f.name}</span>
                        </div>
                        <span className="text-slate-300 text-[10px] font-bold">{f.timestamp?.toDate ? f.timestamp.toDate().toLocaleDateString('es-EC') : 'Recién'}</span>
                     </div>
                     <p className="text-slate-600 font-semibold text-sm italic leading-relaxed">"{f.comment}"</p>
                     {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm('¿Borrar opinión?')) await deleteDoc(doc(db, 'feedbacks', f.id)); })} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={14}/></button>}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-2xl font-black text-slate-900 mb-6 text-center">Acceso Maestro</h2>
            <form onSubmit={(e) => { e.preventDefault(); if (adminPassword === '1996') { setIsAdmin(true); setShowAdminLogin(false); setAdminPassword(''); } else alert("Clave incorrecta."); }} className="space-y-6">
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 focus:border-[#118AB2] rounded-[1.5rem] p-5 outline-none text-center text-5xl font-black tracking-widest" placeholder="****" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 font-black text-slate-400 py-4 uppercase text-[10px] tracking-widest">Cerrar</button>
                <button type="submit" className="flex-1 bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-[#118AB2] shadow-xl transition-all">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ListEditor({ items, field, title, icon: Icon, colorClass, isAdmin, content }: any) {
  const updateList = async (field: keyof SiteContent, index: number, newValue: string | null) => {
    // Asegurar que siempre sea un array
    const currentList = Array.isArray(content[field]) ? [...(content[field] as string[])] : [];
    
    if (newValue === null) {
      currentList.splice(index, 1);
    } else if (index === -1) {
      currentList.push('Nueva información...');
    } else {
      currentList[index] = newValue;
    }

    try {
      await updateDoc(doc(db, 'content', 'main'), { [field]: currentList });
    } catch (e) {
      console.error("Error updating list:", e);
      alert("No se pudo actualizar el registro.");
    }
  };

  return (
    <div className={`${colorClass} p-6 rounded-[2.5rem] border shadow-sm transition-all`}>
      <div className="flex justify-between items-center mb-5 px-2">
        <h3 className="flex items-center gap-2 font-black uppercase tracking-widest text-[9px] opacity-80"><Icon size={14}/> {title}</h3>
        {isAdmin && (
          <button 
            onClick={() => updateList(field, -1, '')} 
            className="bg-white/60 hover:bg-white p-1 rounded-lg shadow-sm hover:scale-110 active:scale-90 transition-all"
          >
            <Plus size={14} />
          </button>
        )}
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
        {(!items || items.length === 0) && isAdmin && (
          <p className="text-[10px] text-slate-400 italic text-center py-2">Haz clic en + para agregar información.</p>
        )}
      </ul>
    </div>
  );
}
