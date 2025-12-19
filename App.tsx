
import React, { useState, useEffect, useRef } from 'react';
import { 
  Info, Map as MapIcon, Globe, MessageSquare, ShieldCheck, 
  Ban, CheckCircle2, Car, Camera, Waves, Footprints, 
  Trash2, Utensils, Edit3, Save, X, Eye, EyeOff, Send, Tag, Plus, Trash, Sparkles, ShoppingBag,
  Hotel, MapPin, ExternalLink, Loader2, User, Calendar
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
  heroImage: '',
  normativasPermitido: ['Ropa cómoda', 'Uso de protector solar biodegradable'],
  normativasNoPermitido: ['Mascotas', 'Alcohol', 'Fogatas'],
  parqueaderoItems: ['Área vigilada de 08:00 a 16:00', 'Capacidad para 50 vehículos'],
  seguridadItems: ['Respete las banderas de playa', 'No nade solo'],
  aliadosVisible: true,
  tiendaVisible: true,
  ecuadorTravelPromo: {
    title: 'Manabí Travel Social',
    description: 'Únete a nuestra red social turística y comparte tus aventuras en el corazón de Manabí.',
    image: '',
    link: 'https://socialmanabitravel.vercel.app/'
  },
  tiendaPromo: {
    title: 'Arte del Mar',
    description: 'Adquiere productos locales y artesanías únicas inspiradas en la belleza de nuestras costas.',
    image: '',
    link: 'https://arte-del-mar.web.app/'
  }
};

interface AllyCardProps {
  ally: Ally;
  isAdmin: boolean;
  updateAlly: (id: string, updates: Partial<Ally>) => void | Promise<void>;
  deleteAlly: (id: string) => void | Promise<void>;
  getDirections: (ally: Ally) => void | Promise<void>;
  loadingMap: string | null;
  mapResult: { text: string; links: any[] } | null;
}

const AllyCard: React.FC<AllyCardProps> = ({ 
  ally, 
  isAdmin, 
  updateAlly, 
  deleteAlly, 
  getDirections, 
  loadingMap, 
  mapResult 
}) => (
  <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 group">
    <div className="relative h-56">
      <EditableImage isAdmin={isAdmin} src={ally.image} onSave={(url) => updateAlly(ally.id, { image: url })} className="w-full h-full object-cover" />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest text-slate-800 shadow-sm flex items-center gap-2">
        {ally.type === 'hospedaje' ? <Hotel size={12}/> : <Utensils size={12}/>} {ally.type}
      </div>
    </div>
    <div className="p-8">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <EditableText isAdmin={isAdmin} text={ally.name} onSave={(val) => updateAlly(ally.id, { name: val })} className="text-2xl font-black text-slate-900" />
          <div className="flex items-center gap-1 text-slate-400 mt-1">
             <MapPin size={12}/>
             <EditableText isAdmin={isAdmin} text={ally.address || 'Puerto López, Manabí'} onSave={(val) => updateAlly(ally.id, { address: val })} className="text-[10px] font-bold uppercase tracking-tight" />
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => deleteAlly(ally.id)} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={20} /></button>
        )}
      </div>
      <EditableText isAdmin={isAdmin} text={ally.description} onSave={(val) => updateAlly(ally.id, { description: val })} className="text-slate-500 font-medium text-sm leading-relaxed mb-6" multiline />
      
      <button 
        onClick={() => getDirections(ally)}
        disabled={loadingMap === ally.id}
        className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-transform hover:bg-[#118AB2]"
      >
        {loadingMap === ally.id ? <Loader2 className="animate-spin" size={18}/> : <MapPin size={18}/>}
        {loadingMap === ally.id ? 'LOCALIZANDO...' : '¿CÓMO LLEGAR?'}
      </button>

      {mapResult && loadingMap === null && (
        <div className="mt-6 p-6 bg-[#F2E8CF]/50 rounded-3xl border border-[#F2E8CF] animate-in zoom-in-95 duration-300">
          <p className="text-xs font-bold text-slate-700 leading-relaxed mb-4">{mapResult.text}</p>
          {mapResult.links.map((link: any, i: number) => (
            <a key={i} href={link.uri} target="_blank" rel="noreferrer" className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow group">
              <span className="text-[10px] font-black uppercase text-[#118AB2]">{link.title || 'Ver en Google Maps'}</span>
              <ExternalLink size={14} className="text-[#118AB2] group-hover:translate-x-1 transition-transform" />
            </a>
          ))}
        </div>
      )}
    </div>
  </div>
);

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
  const [isImproving, setIsImproving] = useState(false);
  const [loadingMap, setLoadingMap] = useState<string | null>(null);
  const [mapResult, setMapResult] = useState<{ text: string, links: any[] } | null>(null);

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubContent = onSnapshot(doc(db, 'content', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SiteContent;
        setContent({ ...INITIAL_CONTENT, ...data });
      } else {
        setDoc(doc(db, 'content', 'main'), INITIAL_CONTENT);
      }
    });

    const unsubActivities = onSnapshot(collection(db, 'activities'), (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as Activity)));
    });

    const unsubAllies = onSnapshot(collection(db, 'allies'), (snap) => {
      setAllies(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ally)));
    });

    const feedbacksQuery = query(collection(db, 'feedbacks'), orderBy('timestamp', 'desc'));
    const unsubFeedbacks = onSnapshot(feedbacksQuery, (snap) => {
      setFeedbacks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Feedback & { id: string })));
    });

    return () => {
      unsubContent();
      unsubActivities();
      unsubAllies();
      unsubFeedbacks();
    };
  }, []);

  const handleEasterEggClick = () => {
    if (isAdmin) return; // Si ya es admin, no hacer nada
    
    setClickCount(prev => {
      const newCount = prev + 1;
      
      if (clickTimer.current) clearTimeout(clickTimer.current);
      
      clickTimer.current = setTimeout(() => {
        setClickCount(0);
      }, 2000); // Tienes 2 segundos entre pulsaciones

      if (newCount >= 5) {
        setShowAdminLogin(true);
        return 0;
      }
      return newCount;
    });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '1996') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert("Clave incorrecta");
    }
  };

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
    } catch (err) {
      console.error(err);
      setFeedbackStatus('idle');
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!isAdmin || !confirm("¿Eliminar opinión?")) return;
    await deleteDoc(doc(db, 'feedbacks', id));
  };

  const improveWithAI = async (text: string, context: string, onUpdate: (val: string) => void) => {
    setIsImproving(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mejora este texto: "${text}"`,
        config: {
          systemInstruction: `Eres un experto en turismo para Playa Los Frailes. Contexto: ${context}. Responde solo con el texto mejorado.`,
        },
      });
      const improvedText = response.text?.trim();
      if (improvedText) onUpdate(improvedText);
    } catch (err) {
      console.error(err);
    } finally {
      setIsImproving(false);
    }
  };

  const getDirections = async (ally: Ally) => {
    setLoadingMap(ally.id);
    setMapResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      let lat = -1.4883; 
      let lng = -80.7514;
      
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, () => reject());
        }).catch(() => null);
        
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `¿Cómo llego a ${ally.name} ubicado en Puerto López/Machalilla, Manabí? Dame una descripción breve y el enlace directo de Google Maps.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude: lat, longitude: lng }
            }
          }
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const mapsLinks = groundingChunks.filter((chunk: any) => chunk.maps).map((chunk: any) => chunk.maps);

      setMapResult({
        text: response.text || "Buscando ubicación...",
        links: mapsLinks
      });
    } catch (err) {
      console.error(err);
      alert("Error al obtener direcciones.");
    } finally {
      setLoadingMap(null);
    }
  };

  const updateContent = async (updates: Partial<SiteContent>) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'content', 'main'), updates);
  };

  const addAlly = async () => {
    if (!isAdmin) return;
    await addDoc(collection(db, 'allies'), {
      name: 'Nuevo Aliado',
      type: 'restaurante',
      description: 'Descripción del establecimiento.',
      image: '',
      address: 'Puerto López, Manabí'
    });
  };

  const updateAlly = async (id: string, updates: Partial<Ally>) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'allies', id), updates);
  };

  const deleteAlly = async (id: string) => {
    if (!isAdmin || !confirm("¿Eliminar aliado?")) return;
    await deleteDoc(doc(db, 'allies', id));
  };

  const addActivity = async (type: 'activity' | 'service') => {
    if (!isAdmin) return;
    await addDoc(collection(db, 'activities'), {
      title: 'Nuevo Item',
      description: 'Descripción breve.',
      image: '',
      type,
      price: type === 'service' ? '$0.00' : ''
    });
  };

  const updateActivity = async (id: string, updates: Partial<Activity>) => {
    if (!isAdmin) return;
    await updateDoc(doc(db, 'activities', id), updates);
  };

  const deleteActivity = async (id: string) => {
    if (!isAdmin || !confirm("¿Eliminar actividad?")) return;
    await deleteDoc(doc(db, 'activities', id));
  };

  const ActivityCard: React.FC<{ item: Activity }> = ({ item }) => (
    <div className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-slate-100 group relative">
      <div className="relative h-48">
        <EditableImage
          isAdmin={isAdmin}
          src={item.image}
          onSave={(url) => updateActivity(item.id, { image: url })}
          className="w-full h-full object-cover"
        />
        {item.price && !isAdmin && (
          <div className="absolute top-4 right-4 bg-[#118AB2] text-white px-4 py-1.5 rounded-full font-black text-sm shadow-lg">
            <Tag size={14} className="inline mr-1" /> {item.price}
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="flex-1">
            <EditableText isAdmin={isAdmin} text={item.title} onSave={(val) => updateActivity(item.id, { title: val })} className="text-xl font-black text-slate-800" />
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => improveWithAI(item.description, `Descripción de la actividad/servicio: ${item.title}`, (val) => updateActivity(item.id, { description: val }))}
                className="text-indigo-400 hover:text-indigo-600 p-1"
                disabled={isImproving}
              >
                <Sparkles size={18} className={isImproving ? 'animate-pulse' : ''} />
              </button>
              <button onClick={() => deleteActivity(item.id)} className="text-rose-400 hover:text-rose-600 p-1">
                <Trash size={18} />
              </button>
            </div>
          )}
        </div>
        <EditableText isAdmin={isAdmin} text={item.description} onSave={(val) => updateActivity(item.id, { description: val })} className="text-slate-500 font-medium text-sm leading-relaxed" multiline />
        {isAdmin && (
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
            <Tag size={14} className="text-[#118AB2]" />
            <EditableText isAdmin={isAdmin} text={item.price || 'Sin precio'} onSave={(val) => updateActivity(item.id, { price: val })} className="text-[#118AB2] font-black text-xs uppercase" />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#F2E8CF] pb-24 font-['Montserrat']">
      {isAdmin && (
        <div className="bg-emerald-600 text-white text-center py-2 sticky top-0 z-[60] flex flex-wrap justify-center items-center gap-3 shadow-md px-4">
          <div className="flex items-center gap-2">
            <Edit3 size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Admin Mode</span>
          </div>
          <button onClick={() => updateContent({ aliadosVisible: !content.aliadosVisible })} className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${content.aliadosVisible ? 'bg-white/40' : 'bg-rose-500/40'}`}>
            {content.aliadosVisible ? <Eye size={12} className="inline mr-1"/> : <EyeOff size={12} className="inline mr-1"/>} ALIADOS
          </button>
          <button onClick={() => updateContent({ tiendaVisible: !content.tiendaVisible })} className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${content.tiendaVisible ? 'bg-white/40' : 'bg-rose-500/40'}`}>
            {content.tiendaVisible ? <ShoppingBag size={12} className="inline mr-1"/> : <EyeOff size={12} className="inline mr-1"/>} TIENDA
          </button>
          <button onClick={() => setIsAdmin(false)} className="bg-white/30 px-3 py-1 rounded text-[10px] font-black">CERRAR</button>
        </div>
      )}

      <header className="relative h-[40vh] md:h-[50vh] w-full">
        <EditableImage isAdmin={isAdmin} src={content.heroImage} onSave={(url) => updateContent({ heroImage: url })} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
          <div onClick={handleEasterEggClick} className="cursor-default select-none active:opacity-90">
            <EditableText isAdmin={isAdmin} text={content.heroTitle} onSave={(val) => updateContent({ heroTitle: val })} className="text-4xl font-black text-white mb-2" />
          </div>
          <EditableText isAdmin={isAdmin} text={content.heroSubtitle} onSave={(val) => updateContent({ heroSubtitle: val })} className="text-lg text-white/80 font-medium" />
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 mt-8">
        <nav className="flex items-stretch bg-white rounded-[2rem] shadow-xl p-1.5 mb-8 border border-white overflow-x-auto no-scrollbar">
          {[
            { id: 'info', icon: Info, label: 'Info' },
            { id: 'explora', icon: MapIcon, label: 'Explora' },
            { id: 'travel', icon: Globe, label: 'Travel' },
            { id: 'aliados', icon: Utensils, label: '', hidden: !content.aliadosVisible && !isAdmin },
            { id: 'feedback', icon: MessageSquare, label: 'Opinión' }
          ].filter(t => !t.hidden).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 min-w-[64px] flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${activeTab === tab.id ? 'bg-[#118AB2] text-white shadow-lg' : 'text-slate-400'}`}>
              <tab.icon size={20} />
              {tab.label && <span className="text-[9px] mt-1 font-black uppercase tracking-wider">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {activeTab === 'info' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
             <TabView
              tabs={[
                { id: 'normativas', label: 'Normativas', content: (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                      <h3 className="flex items-center gap-2 text-emerald-700 font-black mb-4"><CheckCircle2 size={20}/> PERMITIDO</h3>
                      <ul className="space-y-2">
                        {content.normativasPermitido.map((n, i) => <li key={i} className="text-sm font-bold text-emerald-900">• {n}</li>)}
                      </ul>
                    </div>
                    <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                      <h3 className="flex items-center gap-2 text-rose-700 font-black mb-4"><Ban size={20}/> PROHIBIDO</h3>
                      <ul className="space-y-2">
                        {content.normativasNoPermitido.map((n, i) => <li key={i} className="text-sm font-bold text-rose-900">• {n}</li>)}
                      </ul>
                    </div>
                  </div>
                )},
                { id: 'parqueadero', label: 'Parqueadero', content: <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                   <h3 className="font-black mb-4 flex items-center gap-2"><Car className="text-amber-500" /> INFORMACIÓN</h3>
                   {content.parqueaderoItems.map((item, i) => <p key={i} className="text-sm font-medium text-slate-600 mb-2">• {item}</p>)}
                </div> },
                { id: 'seguridad', label: 'Seguridad', content: <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                   <h3 className="font-black mb-4 flex items-center gap-2"><ShieldCheck className="text-blue-500" /> PROTOCOLOS</h3>
                   {content.seguridadItems.map((item, i) => <p key={i} className="text-sm font-medium text-slate-600 mb-2">• {item}</p>)}
                </div> }
              ]}
            />
          </div>
        )}

        {activeTab === 'explora' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 py-4">
             <section>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800">Actividades</h2>
                 {isAdmin && <button onClick={() => addActivity('activity')} className="bg-emerald-500 text-white p-2 rounded-xl"><Plus size={20} /></button>}
               </div>
               <div className="grid grid-cols-1 gap-6">{activities.filter(a => a.type === 'activity').map(activity => <ActivityCard key={activity.id} item={activity} />)}</div>
             </section>
             <section>
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-black text-slate-800">Servicios</h2>
                 {isAdmin && <button onClick={() => addActivity('service')} className="bg-[#118AB2] text-white p-2 rounded-xl"><Plus size={20} /></button>}
               </div>
               <div className="grid grid-cols-1 gap-6">{activities.filter(a => a.type === 'service').map(service => <ActivityCard key={service.id} item={service} />)}</div>
             </section>
          </div>
        )}

        {activeTab === 'aliados' && (content.aliadosVisible || isAdmin) && (
          <div className="animate-in fade-in slide-in-from-bottom-6 space-y-8 py-4">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-black text-slate-900">Nuestros Aliados</h2>
              {isAdmin && <button onClick={addAlly} className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg active:scale-95"><Plus/></button>}
            </div>
            
            {!content.aliadosVisible && isAdmin && (
              <div className="bg-rose-500 text-white p-4 rounded-2xl text-center font-black text-xs uppercase tracking-widest">Sección Oculta para el Público</div>
            )}

            <div className="grid grid-cols-1 gap-10">
              {allies.length > 0 ? (
                allies.map(ally => (
                  <AllyCard 
                    key={ally.id} 
                    ally={ally} 
                    isAdmin={isAdmin}
                    updateAlly={updateAlly}
                    deleteAlly={deleteAlly}
                    getDirections={getDirections}
                    loadingMap={loadingMap}
                    mapResult={loadingMap === ally.id ? null : mapResult}
                  />
                ))
              ) : (
                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                  <Utensils className="mx-auto text-slate-200 mb-4" size={48} />
                  <p className="text-slate-400 font-bold">Próximamente más aliados locales...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'travel' && (
          <div className="animate-in space-y-12 py-4">
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border border-white">
              <EditableImage isAdmin={isAdmin} src={content.ecuadorTravelPromo.image} onSave={(url) => updateContent({ ecuadorTravelPromo: { ...content.ecuadorTravelPromo, image: url } })} className="w-full h-64 object-cover" />
              <div className="p-8">
                <EditableText isAdmin={isAdmin} text={content.ecuadorTravelPromo.title} onSave={(val) => updateContent({ ecuadorTravelPromo: { ...content.ecuadorTravelPromo, title: val } })} className="text-3xl font-black text-slate-800 mb-4" />
                <EditableText isAdmin={isAdmin} text={content.ecuadorTravelPromo.description} onSave={(val) => updateContent({ ecuadorTravelPromo: { ...content.ecuadorTravelPromo, description: val } })} className="text-slate-500 text-lg mb-8 font-medium" multiline />
                <a href={content.ecuadorTravelPromo.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full bg-[#118AB2] text-white py-5 rounded-2xl font-black text-lg shadow-lg">VISITAR RED SOCIAL <Globe className="ml-2" size={20}/></a>
              </div>
            </div>
            {(content.tiendaVisible || isAdmin) && (
              <div className={`bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 transition-all ${!content.tiendaVisible ? 'border-rose-500 opacity-60' : 'border-slate-800'}`}>
                <EditableImage isAdmin={isAdmin} src={content.tiendaPromo.image} onSave={(url) => updateContent({ tiendaPromo: { ...content.tiendaPromo, image: url } })} className="w-full h-64 object-cover" />
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-4"><ShoppingBag className="text-amber-400" size={24} /><EditableText isAdmin={isAdmin} text={content.tiendaPromo.title} onSave={(val) => updateContent({ tiendaPromo: { ...content.tiendaPromo, title: val } })} className="text-3xl font-black text-white" /></div>
                  <EditableText isAdmin={isAdmin} text={content.tiendaPromo.description} onSave={(val) => updateContent({ tiendaPromo: { ...content.tiendaPromo, description: val } })} className="text-slate-400 text-lg mb-8 font-medium" multiline />
                  <a href={content.tiendaPromo.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center w-full bg-amber-400 text-slate-900 py-5 rounded-2xl font-black text-lg shadow-lg">IR A LA TIENDA</a>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 py-4 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-white overflow-hidden">
              <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                <MessageSquare className="text-[#118AB2]" size={32} />
                Danos tu Opinión
              </h2>
              
              <form onSubmit={submitFeedback} className="space-y-4 mb-10">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Nombre</label>
                  <input 
                    type="text" 
                    value={newFeedback.name} 
                    onChange={(e) => setNewFeedback({ ...newFeedback, name: e.target.value })} 
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-[#118AB2] rounded-2xl p-4 font-bold outline-none transition-all"
                    placeholder="Tu nombre aquí..."
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Comentario</label>
                  <textarea 
                    value={newFeedback.comment} 
                    onChange={(e) => setNewFeedback({ ...newFeedback, comment: e.target.value })} 
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-[#118AB2] rounded-2xl p-4 font-bold outline-none transition-all min-h-[120px]"
                    placeholder="Comparte tu experiencia o sugerencia..."
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={feedbackStatus === 'sending'}
                  className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all ${feedbackStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-[#118AB2] active:scale-95 shadow-lg'}`}
                >
                  {feedbackStatus === 'sending' ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                  {feedbackStatus === 'sending' ? 'ENVIANDO...' : feedbackStatus === 'success' ? '¡GRACIAS!' : 'ENVIAR OPINIÓN'}
                </button>
              </form>

              <div className="space-y-6 pt-8 border-t border-slate-100">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Experiencias Recientes</h3>
                {feedbacks.length > 0 ? (
                  feedbacks.map((f) => (
                    <div key={f.id} className="bg-slate-50 p-6 rounded-[2rem] relative group border border-slate-100/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#118AB2]/10 flex items-center justify-center text-[#118AB2]">
                            <User size={16} />
                          </div>
                          <span className="font-black text-slate-900 text-sm">{f.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-[9px] font-bold">
                          <Calendar size={12} />
                          {f.timestamp?.toDate ? f.timestamp.toDate().toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recién enviado'}
                        </div>
                      </div>
                      <p className="text-slate-600 font-medium text-sm leading-relaxed italic">"{f.comment}"</p>
                      {isAdmin && (
                        <button 
                          onClick={() => deleteFeedback(f.id)}
                          className="absolute -top-2 -right-2 bg-rose-500 text-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-50">
                    <Footprints className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Aún no hay opiniones. ¡Sé el primero!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {showAdminLogin && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-sm rounded-[2rem] p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2"><ShieldCheck className="text-[#118AB2]" /> Acceso Admin</h2>
            <form onSubmit={handleAdminLogin} className="space-y-6">
              <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-[#118AB2]/20 focus:border-[#118AB2] rounded-2xl p-4 outline-none text-center text-2xl font-black tracking-widest" placeholder="****" autoFocus />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAdminLogin(false)} className="flex-1 font-bold text-slate-400">Cerrar</button>
                <button type="submit" className="flex-1 bg-[#118AB2] text-white py-4 rounded-xl font-black">ENTRAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
