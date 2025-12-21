
import React, { useState, useEffect, useRef } from 'react';
import { 
  Info, Map as MapIcon, Globe, MessageSquare, ShieldCheck, 
  Ban, CheckCircle2, Car, Waves, Trash2, Utensils, 
  Eye, EyeOff, Send, Plus, Trash, ShoppingBag,
  MapPin, ExternalLink, Loader2, User, Image as ImageIcon, RefreshCw,
  Wallet, Phone, Calendar, ShoppingCart, X, CreditCard, DollarSign,
  Settings, Heart, Share2, Sparkles, Briefcase, Tag, ArrowRight
} from 'lucide-react';
import { 
  collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, setDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { SiteContent, Activity, Ally, Feedback, AllyItem } from './types';
import { GoogleGenAI } from "@google/genai";

// Components
import TabView from './components/TabView';
import EditableText from './components/EditableText';
import EditableImage from './components/EditableImage';
import ReservationModal from './components/ReservationModal';

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
    description: 'Nuestra red social dedicada a compartir la magia de Manabí. ¡Únete a la comunidad!',
    image: '',
    link: 'https://socialmanabitravel.vercel.app/'
  },
  tiendaPromo: {
    title: 'Arte Del Mar',
    description: 'Tienda Online de artesanías únicas. Apoya al talento local de nuestra comunidad.',
    image: '',
    link: 'https://arte-del-mar.web.app/'
  }
};

interface ActivityCardProps {
  activity: Activity;
  isAdmin: boolean;
  key?: React.Key;
}

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
  
  const [selectedAllyForBooking, setSelectedAllyForBooking] = useState<Ally | null>(null);
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

    const unsubFeedbacks = onSnapshot(query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc')), (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback & { id: string })));
    });

    return () => { unsubContent(); unsubActivities(); unsubAllies(); unsubFeedbacks(); };
  }, []);

  const handleAdminAction = async (action: () => Promise<void>) => {
    if (!isAdmin) return;
    try {
      await action();
    } catch (error) {
      console.error("Firebase Error:", error);
      alert("Error al guardar en la nube.");
    }
  };

  const toggleSectionVisibility = async (section: 'aliadosVisible' | 'tiendaVisible') => {
    await updateDoc(doc(db, 'content', 'main'), { [section]: !content[section] });
  };

  const updatePromo = async (key: 'ecuadorTravelPromo' | 'tiendaPromo', updates: any) => {
    await updateDoc(doc(db, 'content', 'main'), {
      [key]: { ...content[key], ...updates }
    });
  };

  const addAllyItem = async (allyId: string) => {
    const ally = allies.find(a => a.id === allyId);
    if (!ally) return;
    const newItem: AllyItem = {
      id: Date.now().toString(),
      name: 'Nuevo Item',
      price: '0.00',
      description: '...',
      image: ''
    };
    const updatedItems = [...(ally.items || []), newItem];
    await handleAdminAction(async () => {
      await updateDoc(doc(db, 'allies', allyId), { items: updatedItems });
    });
  };

  const updateAllyItem = async (allyId: string, itemId: string, updates: Partial<AllyItem>) => {
    const ally = allies.find(a => a.id === allyId);
    if (!ally) return;
    const updatedItems = (ally.items || []).map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    await handleAdminAction(async () => {
      await updateDoc(doc(db, 'allies', allyId), { items: updatedItems });
    });
  };

  const removeAllyItem = async (allyId: string, itemId: string) => {
    if (!confirm('¿Borrar item?')) return;
    const ally = allies.find(a => a.id === allyId);
    if (!ally) return;
    const updatedItems = (ally.items || []).filter(item => item.id !== itemId);
    await handleAdminAction(async () => {
      await updateDoc(doc(db, 'allies', allyId), { items: updatedItems });
    });
  };

  const getDirections = async (ally: Ally) => {
    setLoadingMap(ally.id);
    let latLng = undefined;
    
    // Intentar obtener ubicación para grounding real
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 6000 });
      });
      latLng = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (e) {
      console.warn("Geolocation permission denied or timed out.");
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Instrucciones de ruta para llegar a ${ally.name} en ${ally.address || 'Puerto López, Manabí'}. Mi ubicación actual es: ${latLng ? `${latLng.latitude}, ${latLng.longitude}` : 'Desconocida (asume que estoy en Los Frailes)'}.`,
        config: { 
          tools: [{ googleMaps: {} }],
          toolConfig: latLng ? {
            retrievalConfig: {
              latLng: latLng
            }
          } : undefined
        },
      });
      
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks = chunks.filter((c: any) => c.maps).map((c: any) => c.maps);
      
      setMapResults(prev => ({ 
        ...prev, 
        [ally.id]: { text: response.text || "Calculando mejor ruta...", links: mapsLinks } 
      }));
    } catch (err) {
      console.error(err);
      alert("No se pudo conectar con el servicio de mapas.");
    } finally {
      setLoadingMap(null);
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
      alert("Error al enviar opinión.");
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#F2E8CF] flex flex-col items-center justify-center z-[200]">
        <RefreshCw className="animate-spin text-[#118AB2] mb-4" size={40} />
        <p className="text-[#118AB2] font-black text-[10px] uppercase tracking-[0.3em]">Cargando experiencia...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F2E8CF] pb-24 font-['Montserrat'] overflow-x-hidden">
      {isAdmin && (
        <div className="bg-slate-900 text-white py-3 sticky top-0 z-[100] flex flex-wrap justify-center items-center gap-3 shadow-2xl px-4 border-b border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 mr-2 bg-white/10 px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-[9px] font-black uppercase tracking-widest">Admin</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => toggleSectionVisibility('aliadosVisible')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black border transition-all ${content.aliadosVisible ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}
            >
              {content.aliadosVisible ? <Eye size={12}/> : <EyeOff size={12}/>} LOCALES
            </button>
            <button 
              onClick={() => toggleSectionVisibility('tiendaVisible')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[8px] font-black border transition-all ${content.tiendaVisible ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-rose-500/20 border-rose-500 text-rose-400'}`}
            >
              {content.tiendaVisible ? <Eye size={12}/> : <EyeOff size={12}/>} TIENDA
            </button>
          </div>
          <button onClick={() => setIsAdmin(false)} className="bg-white/10 px-4 py-2 rounded-xl text-[9px] font-black border border-white/20">SALIR</button>
        </div>
      )}

      <header className="relative h-[48vh] md:h-[58vh] w-full shadow-2xl overflow-hidden bg-slate-200">
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
        <nav className="flex items-stretch bg-white rounded-[2.5rem] shadow-2xl p-1.5 mb-10 border border-slate-100 sticky top-6 z-[80] backdrop-blur-xl bg-white/80 overflow-x-auto no-scrollbar">
          {[
            { id: 'info', icon: Info, label: 'Info' },
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
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
          <div className="space-y-16 animate-in fade-in py-4">
            <section>
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <Waves className="text-[#118AB2]" size={28} />
                  <h2 className="text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter">Actividades</h2>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleAdminAction(async () => { 
                      await addDoc(collection(db, 'activities'), { title: 'Nueva Actividad', description: '...', image: '', price: '0.00', type: 'activity', timestamp: serverTimestamp() }); 
                    })} 
                    className="bg-[#118AB2] text-white p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"
                  >
                    <Plus size={20}/>
                  </button>
                )}
              </div>
              <div className="grid gap-8">
                {activities.filter(a => a.type === 'activity').map(activity => (
                  <ActivityCard key={activity.id} activity={activity} isAdmin={isAdmin} />
                ))}
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <Briefcase className="text-amber-500" size={28} />
                  <h2 className="text-3xl font-black text-slate-900 leading-none uppercase tracking-tighter">Servicios</h2>
                </div>
                {isAdmin && (
                  <button 
                    onClick={() => handleAdminAction(async () => { 
                      await addDoc(collection(db, 'activities'), { title: 'Nuevo Servicio', description: '...', image: '', price: '0.00', type: 'service', timestamp: serverTimestamp() }); 
                    })} 
                    className="bg-amber-500 text-white p-3 rounded-2xl shadow-xl hover:scale-110 active:scale-90 transition-all"
                  >
                    <Plus size={20}/>
                  </button>
                )}
              </div>
              <div className="grid gap-8">
                {activities.filter(a => a.type === 'service').map(service => (
                  <ActivityCard key={service.id} activity={service} isAdmin={isAdmin} />
                ))}
                {activities.filter(a => a.type === 'service').length === 0 && (
                  <p className="text-center py-10 bg-white/40 rounded-[2.5rem] border-2 border-dashed border-white/60 text-[10px] font-black uppercase tracking-widest text-slate-400">Próximamente más servicios locales</p>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="space-y-12 animate-in fade-in py-4">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tighter">Descubre Manabí</h2>
              <p className="text-[#118AB2] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                <Sparkles size={12}/> Vive la experiencia digital
              </p>
            </div>

            <div className="bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-white group relative">
               <div className="h-[300px] relative">
                 <EditableImage 
                   isAdmin={isAdmin} 
                   src={content.ecuadorTravelPromo.image} 
                   onSave={(url) => updatePromo('ecuadorTravelPromo', { image: url })} 
                   className="w-full h-full" 
                   alt="Ecuador Travel"
                 />
                 <div className="absolute top-8 left-8 bg-blue-600 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 backdrop-blur-md bg-blue-600/90">
                   <Share2 size={14}/> Red Social Turística
                 </div>
               </div>
               <div className="p-12 text-center">
                  <EditableText 
                   isAdmin={isAdmin} 
                   text={content.ecuadorTravelPromo.title} 
                   onSave={(val) => updatePromo('ecuadorTravelPromo', { title: val })} 
                   className="text-4xl font-black text-slate-900 mb-4 tracking-tight" 
                  />
                  <EditableText 
                   isAdmin={isAdmin} 
                   text={content.ecuadorTravelPromo.description} 
                   onSave={(val) => updatePromo('ecuadorTravelPromo', { description: val })} 
                   className="text-slate-500 text-base font-medium leading-relaxed mb-8 max-w-md mx-auto" 
                   multiline
                  />
                  {isAdmin && (
                    <div className="mb-8 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Enlace de la Red Social</label>
                      <EditableText 
                       isAdmin={isAdmin} 
                       text={content.ecuadorTravelPromo.link} 
                       onSave={(val) => updatePromo('ecuadorTravelPromo', { link: val })} 
                       className="text-[11px] font-bold text-blue-600 break-all underline" 
                      />
                    </div>
                  )}
                  <a 
                   href={content.ecuadorTravelPromo.link} 
                   target="_blank" 
                   rel="noreferrer"
                   className="inline-flex items-center gap-4 bg-blue-600 text-white px-12 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all shadow-blue-500/30"
                  >
                    Entrar a Ecuador Travel <ExternalLink size={18}/>
                  </a>
               </div>
            </div>

            {(content.tiendaVisible || isAdmin) && (
              <div className={`bg-white rounded-[3.5rem] overflow-hidden shadow-2xl border border-white group relative transition-all duration-500 ${!content.tiendaVisible && isAdmin ? 'opacity-60 grayscale scale-95' : ''}`}>
                 {!content.tiendaVisible && isAdmin && (
                   <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px] pointer-events-none">
                      <div className="bg-rose-600 text-white px-8 py-4 rounded-full font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center gap-3">
                        <EyeOff size={18}/> TIENDA DESHABILITADA
                      </div>
                      <p className="mt-4 text-rose-800 font-bold text-[10px] uppercase">Solo tú puedes ver esto</p>
                   </div>
                 )}
                 <div className="h-[300px] relative">
                   <EditableImage 
                     isAdmin={isAdmin} 
                     src={content.tiendaPromo.image} 
                     onSave={(url) => updatePromo('tiendaPromo', { image: url })} 
                     className="w-full h-full" 
                     alt="Arte Del Mar"
                   />
                   <div className="absolute top-8 right-8 bg-amber-500 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-2 backdrop-blur-md bg-amber-500/90">
                     <ShoppingBag size={14}/> Tienda Online
                   </div>
                 </div>
                 <div className="p-12 text-center">
                    <EditableText 
                     isAdmin={isAdmin} 
                     text={content.tiendaPromo.title} 
                     onSave={(val) => updatePromo('tiendaPromo', { title: val })} 
                     className="text-4xl font-black text-slate-900 mb-4 tracking-tight" 
                    />
                    <EditableText 
                     isAdmin={isAdmin} 
                     text={content.tiendaPromo.description} 
                     onSave={(val) => updatePromo('tiendaPromo', { description: val })} 
                     className="text-slate-500 text-base font-medium leading-relaxed mb-8 max-w-md mx-auto" 
                     multiline
                    />
                    {isAdmin && (
                      <div className="mb-8 p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Enlace de la Tienda</label>
                        <EditableText 
                         isAdmin={isAdmin} 
                         text={content.tiendaPromo.link} 
                         onSave={(val) => updatePromo('tiendaPromo', { link: val })} 
                         className="text-[11px] font-bold text-amber-600 break-all underline" 
                        />
                      </div>
                    )}
                    <a 
                     href={content.tiendaPromo.link} 
                     target="_blank" 
                     rel="noreferrer"
                     className="inline-flex items-center gap-4 bg-amber-500 text-white px-12 py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all shadow-amber-500/30"
                    >
                      Ir a Arte Del Mar <ShoppingCart size={18}/>
                    </a>
                 </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'aliados' && (
          <div className="space-y-10 animate-in fade-in">
             {!content.aliadosVisible && isAdmin && (
               <div className="bg-rose-50 border-2 border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-800 font-bold text-[10px] uppercase tracking-widest">
                 <EyeOff size={16}/> Aliados ocultos para turistas.
               </div>
             )}
             <div className="flex justify-between items-end mb-8 px-2">
               <h2 className="text-4xl font-black text-slate-900 leading-none">Locales</h2>
               {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={() => handleAdminAction(async () => { await addDoc(collection(db, 'allies'), { name: 'Hotel Nuevo', type: 'hospedaje', description: '...', address: '', image: '', timestamp: serverTimestamp() }); })} className="bg-amber-500 text-white px-4 py-2 rounded-xl shadow-lg font-black text-[9px] uppercase tracking-tighter flex items-center gap-1"><Plus size={14}/> Hotel</button>
                    <button onClick={() => handleAdminAction(async () => { await addDoc(collection(db, 'allies'), { name: 'Restaurante Nuevo', type: 'restaurante', description: '...', address: '', image: '', timestamp: serverTimestamp() }); })} className="bg-emerald-500 text-white px-4 py-2 rounded-xl shadow-lg font-black text-[9px] uppercase tracking-tighter flex items-center gap-1"><Plus size={14}/> Restaurante</button>
                  </div>
               )}
             </div>
             <div className="grid gap-12">
               {allies.map(ally => (
                 <div key={ally.id} className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-white">
                    <div className="h-64 relative bg-slate-100">
                      <EditableImage isAdmin={isAdmin} src={ally.image} onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { image: url }); })} className="w-full h-full" />
                      <div className={`absolute top-6 left-6 px-4 py-1.5 rounded-full text-white text-[9px] font-black uppercase tracking-widest shadow-xl backdrop-blur-md ${ally.type === 'restaurante' ? 'bg-emerald-500/80' : 'bg-amber-500/80'}`}>
                        {ally.type === 'restaurante' ? 'Restaurante' : 'Hospedaje'}
                      </div>
                    </div>
                    
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <EditableText isAdmin={isAdmin} text={ally.name} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { name: val }); })} className="text-3xl font-black text-slate-900 mb-1 leading-none" />
                          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
                            <MapPin size={12} className="text-[#118AB2]"/> <EditableText isAdmin={isAdmin} text={ally.address || 'Ubicación...'} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { address: val }); })} />
                          </div>
                        </div>
                        {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm('¿Borrar?')) await deleteDoc(doc(db, 'allies', ally.id)); })} className="text-rose-300 hover:text-rose-500 p-2"><Trash size={20}/></button>}
                      </div>

                      <EditableText isAdmin={isAdmin} text={ally.description} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { description: val }); })} className="text-slate-500 text-sm font-medium leading-relaxed mb-6" multiline />
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <button onClick={() => setSelectedAllyForBooking(ally)} className="py-4 rounded-[1.5rem] bg-[#118AB2] text-white font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all">
                          <Calendar size={16}/> RESERVAR
                        </button>
                        <button onClick={() => getDirections(ally)} disabled={!!loadingMap} className="py-4 rounded-[1.5rem] bg-slate-900 text-white font-black text-[10px] tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all disabled:bg-slate-300">
                          {loadingMap === ally.id ? <Loader2 className="animate-spin" size={16}/> : <MapIcon size={16}/>} LLEGAR
                        </button>
                      </div>

                      {/* Resultado de Ruta de Mapas Grounding */}
                      {mapResults[ally.id] && !loadingMap && (
                        <div className="mt-6 p-6 bg-blue-50 rounded-3xl border border-blue-100 animate-in zoom-in-95 shadow-lg">
                          <div className="flex items-center gap-3 mb-4">
                             <div className="bg-blue-600 text-white p-2 rounded-xl">
                               <MapIcon size={18}/>
                             </div>
                             <h4 className="text-[11px] font-black uppercase tracking-widest text-blue-900">Guía de Ruta</h4>
                          </div>
                          <p className="text-[12px] font-bold text-slate-700 leading-relaxed mb-6">{mapResults[ally.id].text}</p>
                          
                          {mapResults[ally.id].links.length > 0 ? (
                            <div className="grid gap-3">
                              {mapResults[ally.id].links.map((link, i) => (
                                <a 
                                  key={i} 
                                  href={link.uri} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="flex items-center justify-between bg-white p-5 rounded-[1.5rem] shadow-sm hover:shadow-md transition-all text-blue-600 hover:bg-blue-600 hover:text-white group"
                                >
                                  <div className="flex items-center gap-3">
                                    <ExternalLink size={16}/>
                                    <span className="text-[10px] font-black uppercase tracking-widest">{link.title || "Abrir en Google Maps"}</span>
                                  </div>
                                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <a 
                              href={`https://www.google.com/maps/search/${encodeURIComponent(ally.name + ' ' + (ally.address || 'Puerto López'))}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="flex items-center justify-center gap-3 bg-slate-900 text-white p-5 rounded-[1.5rem] shadow-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              BUSCAR EN MAPAS <ExternalLink size={16}/>
                            </a>
                          )}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="mt-8 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-200">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                              <ShoppingCart size={14}/> {ally.type === 'restaurante' ? 'Menú / Carta' : 'Habitaciones'}
                            </h4>
                            <button onClick={() => addAllyItem(ally.id)} className="bg-[#118AB2] text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-md active:scale-90">
                              <Plus size={12}/> AGREGAR
                            </button>
                          </div>
                          
                          <div className="space-y-4">
                            {(ally.items || []).map(item => (
                              <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative group">
                                <div className="flex gap-4">
                                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                                    <EditableImage 
                                      isAdmin={isAdmin} 
                                      src={item.image} 
                                      onSave={(url) => updateAllyItem(ally.id, item.id, { image: url })} 
                                      className="w-full h-full"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <EditableText 
                                        isAdmin={isAdmin} 
                                        text={item.name} 
                                        onSave={(val) => updateAllyItem(ally.id, item.id, { name: val })} 
                                        className="text-sm font-black text-slate-900" 
                                      />
                                      <div className="flex items-center bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                                        <DollarSign size={10}/>
                                        <EditableText 
                                          isAdmin={isAdmin} 
                                          text={item.price} 
                                          onSave={(val) => updateAllyItem(ally.id, item.id, { price: val })} 
                                          className="text-[10px] font-black" 
                                        />
                                      </div>
                                    </div>
                                    <EditableText 
                                      isAdmin={isAdmin} 
                                      text={item.description} 
                                      onSave={(val) => updateAllyItem(ally.id, item.id, { description: val })} 
                                      className="text-[10px] text-slate-500 font-medium" 
                                      multiline
                                    />
                                  </div>
                                  <button onClick={() => removeAllyItem(ally.id, item.id)} className="text-rose-300 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16}/>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
                            <div className="flex items-center gap-3">
                              <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Phone size={14}/></div>
                              <div className="flex-1">
                                <label className="text-[8px] font-black uppercase text-slate-400 block">WhatsApp de Reservas</label>
                                <EditableText isAdmin={isAdmin} text={ally.whatsapp || 'Sin WhatsApp'} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { whatsapp: val }); })} className="text-[10px] font-black" />
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-100 p-2 rounded-lg text-amber-600"><Wallet size={14}/></div>
                              <div className="flex-1">
                                <label className="text-[8px] font-black uppercase text-slate-400 block">Datos Bancarios</label>
                                <EditableText isAdmin={isAdmin} text={ally.bankDetails || 'Sin datos'} onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'allies', ally.id), { bankDetails: val }); })} className="text-[10px] font-black" multiline />
                              </div>
                            </div>
                          </div>
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
                        <span className="text-slate-300 text-[10px] font-bold">{f.timestamp?.toDate ? f.timestamp.toDate().toLocaleDateString('es-EC') : 'Ahora'}</span>
                     </div>
                     <p className="text-slate-600 font-semibold text-sm italic leading-relaxed">"{f.comment}"</p>
                     {isAdmin && <button onClick={() => handleAdminAction(async () => { if(confirm('¿Eliminar opinión?')) await deleteDoc(doc(db, 'feedbacks', f.id)); })} className="absolute top-4 right-4 text-rose-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash size={14}/></button>}
                   </div>
                 ))}
               </div>
             </div>
          </div>
        )}
      </main>

      {selectedAllyForBooking && (
        <ReservationModal ally={selectedAllyForBooking} onClose={() => setSelectedAllyForBooking(null)} />
      )}

      {showAdminLogin && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white w-full max-sm rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300">
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

function ActivityCard({ activity, isAdmin }: ActivityCardProps) {
  const handleAdminAction = async (action: () => Promise<void>) => {
    if (!isAdmin) return;
    try {
      await action();
    } catch (error) {
      console.error("Firebase Error:", error);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl flex flex-col sm:flex-row border border-slate-50 hover:shadow-2xl transition-all group/card">
      <div className="w-full sm:w-56 h-56 relative bg-slate-100 flex-shrink-0">
        <EditableImage 
          isAdmin={isAdmin} 
          src={activity.image} 
          onSave={(url) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { image: url }); })} 
          className="w-full h-full" 
        />
      </div>
      <div className="p-8 flex-1 relative flex flex-col justify-center">
        {isAdmin && (
          <button 
            onClick={() => handleAdminAction(async () => { if(confirm('¿Borrar?')) await deleteDoc(doc(db, 'activities', activity.id)); })} 
            className="absolute top-6 right-6 text-rose-300 hover:text-rose-500 transition-colors"
          >
            <Trash2 size={18}/>
          </button>
        )}
        
        <div className="absolute top-6 right-16 sm:right-6 flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
          <Tag size={12}/>
          <div className="flex items-center">
            <span className="text-[10px] font-black mr-0.5">$</span>
            <EditableText 
              isAdmin={isAdmin} 
              text={activity.price || '0.00'} 
              onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { price: val }); })} 
              className="text-[10px] font-black tracking-tight" 
            />
          </div>
        </div>

        <div className="mb-2 mt-4 sm:mt-0">
          <EditableText 
            isAdmin={isAdmin} 
            text={activity.title} 
            onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { title: val }); })} 
            className="text-2xl font-black text-slate-800 leading-tight" 
          />
        </div>
        <div className="max-w-md">
          <EditableText 
            isAdmin={isAdmin} 
            text={activity.description} 
            onSave={(val) => handleAdminAction(async () => { await updateDoc(doc(db, 'activities', activity.id), { description: val }); })} 
            className="text-slate-500 text-sm font-medium leading-relaxed" 
            multiline 
          />
        </div>
      </div>
    </div>
  );
}

function ListEditor({ items, field, title, icon: Icon, colorClass, isAdmin, content }: any) {
  const updateList = async (field: keyof SiteContent, index: number, newValue: string | null) => {
    const currentList = Array.isArray(content[field]) ? [...(content[field] as string[])] : [];
    if (newValue === null) currentList.splice(index, 1);
    else if (index === -1) currentList.push('Nueva información...');
    else currentList[index] = newValue;
    try {
      await updateDoc(doc(db, 'content', 'main'), { [field]: currentList });
    } catch (e) {
      alert("Error en Firebase.");
    }
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
