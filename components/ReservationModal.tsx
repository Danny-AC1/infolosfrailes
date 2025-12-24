
import React, { useState } from 'react';
import { Ally, AllyItem } from '../types';
import { 
  X, CheckCircle2, CreditCard, Send, User, 
  Calendar, Phone, Info, ShoppingCart, ArrowRight, Wallet,
  Utensils, Bed, DollarSign, Loader2, Clock, Image as ImageIcon
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

interface ReservationModalProps {
  ally: Ally;
  onClose: () => void;
  language?: 'es' | 'en';
}

type Step = 'select' | 'details' | 'payment' | 'finish';

const modalTranslations = {
  es: {
    steps: { details: 'Paso 2 de 3: Tus datos', select: 'Selección' },
    labels: {
      room: 'Reserva de Habitaciones',
      menu: 'Reserva de Mesa / Platos',
      selectRoom: 'Selecciona tu habitación',
      selectMenu: 'Selecciona tu menú',
      empty: 'No hay opciones disponibles',
      customerName: 'Tu Nombre Completo',
      resDate: 'Fecha de la Reserva',
      resTime: 'Hora de la Reserva',
      transfer: 'Pago por Transferencia',
      transferDesc: 'Para confirmar tu reserva, el local requiere el pago anticipado. Copia los datos y adjunta el comprobante.',
      bankInfo: 'Información Bancaria',
      total: 'Total a Transferir',
      taxes: 'Incluye impuestos',
      continue: 'CONTINUAR',
      back: 'ATRÁS',
      goPayment: 'IR AL PAGO',
      sendProof: 'ENVIAR COMPROBANTE',
      placeholderName: 'Ej: Juan Pérez',
      waGreeting: '¡Hola!',
      waBooking: 'Me gustaría realizar una reserva:',
      waCustomer: 'Cliente',
      waDate: 'Fecha',
      waTime: 'Hora',
      waOrder: 'Pedido',
      waTotal: 'Total',
      waFoot: 'Escribo para confirmar disponibilidad y proceder con el pago.',
      viewGallery: 'Ver Fotos'
    }
  },
  en: {
    steps: { details: 'Step 2 of 3: Your details', select: 'Selection' },
    labels: {
      room: 'Room Booking',
      menu: 'Table / Dishes Booking',
      selectRoom: 'Select your room',
      selectMenu: 'Select your menu',
      empty: 'No options available',
      customerName: 'Your Full Name',
      resDate: 'Reservation Date',
      resTime: 'Reservation Time',
      transfer: 'Bank Transfer Payment',
      transferDesc: 'To confirm your booking, the spot requires advance payment. Copy the details and attach proof.',
      bankInfo: 'Bank Information',
      total: 'Total to Transfer',
      taxes: 'Taxes included',
      continue: 'CONTINUE',
      back: 'BACK',
      goPayment: 'GO TO PAYMENT',
      sendProof: 'SEND PROOF',
      placeholderName: 'e.g., John Doe',
      waGreeting: 'Hello!',
      waBooking: 'I would like to make a reservation:',
      waCustomer: 'Customer',
      waDate: 'Date',
      waTime: 'Time',
      waOrder: 'Order',
      waTotal: 'Total',
      waFoot: 'I am writing to confirm availability and proceed with payment.',
      viewGallery: 'View Photos'
    }
  }
};

export default function ReservationModal({ ally, onClose, language = 'es' }: ReservationModalProps) {
  const mt = modalTranslations[language];
  const [step, setStep] = useState<Step>('select');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [customerInfo, setCustomerInfo] = useState({ name: '', date: '', time: '' });
  const [activeGallery, setActiveGallery] = useState<string[] | null>(null);

  const toggleItem = (itemId: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: prev[itemId] ? 0 : 1
    }));
  };

  const selectedObjects = (ally.items || []).filter(i => selectedItems[i.id]);
  const total = selectedObjects.reduce((acc, i) => acc + parseFloat(i.price || '0'), 0);

  const handleFinish = async () => {
    if (!customerInfo.name || !customerInfo.date || !customerInfo.time) return;
    
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'reservations'), {
        allyId: ally.id,
        allyName: ally.name,
        customerName: customerInfo.name,
        date: customerInfo.date,
        time: customerInfo.time,
        total: total,
        items: selectedObjects.map(i => i.name),
        status: 'pendiente',
        timestamp: serverTimestamp()
      });

      const selectedList = selectedObjects
        .map(i => `- ${i.name} ($${i.price})`)
        .join('\n');

      const message = encodeURIComponent(
        `${mt.labels.waGreeting} ${ally.name}! 👋\n\n` +
        `${mt.labels.waBooking}\n` +
        `👤 ${mt.labels.waCustomer}: ${customerInfo.name}\n` +
        `📅 ${mt.labels.waDate}: ${customerInfo.date}\n` +
        `⏰ ${mt.labels.waTime}: ${customerInfo.time}\n\n` +
        `📦 ${mt.labels.waOrder}:\n${selectedList}\n\n` +
        `💰 ${mt.labels.waTotal}: $${total.toFixed(2)}\n\n` +
        `${mt.labels.waFoot}`
      );

      window.open(`https://wa.me/${ally.whatsapp?.replace(/\+/g, '')}?text=${message}`, '_blank');
      onClose();
    } catch (e) {
      console.error(e);
      alert("Error al procesar reserva");
    } finally {
      setIsSaving(false);
    }
  };

  const isHotel = ally.type === 'hospedaje';

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-in fade-in duration-300">
      
      {/* Lightbox para galería deslizable */}
      {activeGallery && (
        <div className="fixed inset-0 z-[1100] bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => setActiveGallery(null)}>
          <button className="absolute top-6 right-6 text-white p-3 bg-white/10 rounded-full hover:bg-white/20 z-[1110] transition-all active:scale-90 shadow-2xl">
            <X size={24}/>
          </button>
          
          <div className="w-full max-w-4xl h-full flex flex-col justify-center items-center">
            <div 
              className="w-full h-full flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory items-center py-20 px-4" 
              onClick={e => e.stopPropagation()}
            >
              {activeGallery.map((img, i) => (
                <div key={i} className="min-w-full h-full flex-shrink-0 snap-center flex items-center justify-center">
                  <img 
                    src={img} 
                    className="max-h-full max-w-full object-contain rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5" 
                    alt="Gallery item"
                  />
                </div>
              ))}
            </div>
            
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4 animate-bounce">
              <div className="flex gap-2">
                {activeGallery.map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
                ))}
              </div>
              <p className="text-white/40 text-[9px] font-black uppercase tracking-[0.3em] backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                Desliza para explorar
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-[3rem] sm:rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
        
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-slate-900 leading-none">{ally.name}</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#118AB2] mt-2">
              {isHotel ? mt.labels.room : mt.labels.menu}
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-90">
            <X size={24}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
          
          {step === 'select' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-50 rounded-xl text-[#118AB2]">
                  {isHotel ? <Bed size={20}/> : <Utensils size={20}/>}
                </div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  {isHotel ? mt.labels.selectRoom : mt.labels.selectMenu}
                </h4>
              </div>
              <div className="grid gap-4">
                {(ally.items || []).map(item => (
                  <div 
                    key={item.id} 
                    className={`group/item p-4 rounded-3xl border-2 transition-all flex items-center gap-4 relative overflow-hidden ${selectedItems[item.id] ? 'border-[#118AB2] bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                  >
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 relative group/thumb">
                      {item.image ? (
                        <img src={item.image} className="w-full h-full object-cover" alt={item.name}/>
                      ) : (item.images && item.images.length > 0) ? (
                        <img src={item.images[0]} className="w-full h-full object-cover" alt={item.name}/>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
                          {isHotel ? <Bed size={24}/> : <Utensils size={24}/>}
                        </div>
                      )}
                      
                      {item.images && item.images.length > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveGallery(item.images || null); }}
                          className="absolute inset-0 bg-[#118AB2]/60 flex items-center justify-center text-white opacity-0 group-hover/item:opacity-100 transition-opacity"
                        >
                          <ImageIcon size={20} className="drop-shadow-lg" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex-1 cursor-pointer" onClick={() => toggleItem(item.id)}>
                      <h5 className="text-sm font-black text-slate-900 leading-tight mb-1">{item.name}</h5>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-[#118AB2] tracking-tighter">$ {item.price}</span>
                        {item.images && item.images.length > 0 && (
                          <div 
                            className="flex items-center gap-1.5 cursor-pointer hover:bg-[#118AB2]/10 p-1 rounded-md transition-all"
                            onClick={(e) => { e.stopPropagation(); setActiveGallery(item.images || null); }}
                          >
                            <ImageIcon size={10} className="text-[#118AB2]" />
                            <span className="text-[8px] font-black text-[#118AB2] uppercase tracking-widest">{item.images.length} Fotos</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div 
                      onClick={() => toggleItem(item.id)}
                      className={`w-8 h-8 rounded-2xl flex items-center justify-center border-2 transition-all cursor-pointer ${selectedItems[item.id] ? 'bg-[#118AB2] border-[#118AB2] rotate-0 scale-110' : 'border-slate-200 rotate-45 scale-90'}`}
                    >
                      {selectedItems[item.id] && <CheckCircle2 size={16} className="text-white"/>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div className="bg-white p-2 text-center mb-4">
                 <p className="text-[10px] font-black uppercase tracking-widest text-[#118AB2]">{mt.steps.details}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 ml-2">{mt.labels.customerName}</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                  <input 
                    type="text" 
                    value={customerInfo.name}
                    onChange={(e) => setCustomerInfo(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 pl-12 font-bold outline-none focus:border-[#118AB2] transition-all" 
                    placeholder={mt.labels.placeholderName}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 ml-2">{mt.labels.resDate}</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                      type="date" 
                      value={customerInfo.date}
                      onChange={(e) => setCustomerInfo(p => ({ ...p, date: e.target.value }))}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 pl-12 font-bold outline-none focus:border-[#118AB2] transition-all" 
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3 ml-2">{mt.labels.resTime}</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                    <input 
                      type="time" 
                      value={customerInfo.time}
                      onChange={(e) => setCustomerInfo(p => ({ ...p, time: e.target.value }))}
                      className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 pl-12 font-bold outline-none focus:border-[#118AB2] transition-all" 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 text-center">
              <div className="bg-amber-50 border-2 border-amber-200 p-8 rounded-[3rem]">
                <div className="w-16 h-16 bg-amber-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-amber-500/20">
                  <Wallet size={32}/>
                </div>
                <h4 className="text-xl font-black text-amber-900 mb-2">{mt.labels.transfer}</h4>
                <p className="text-xs text-amber-700 font-medium leading-relaxed">{mt.labels.transferDesc}</p>
                <div className="mt-6 p-6 bg-white/80 rounded-3xl text-left border border-amber-100 shadow-sm">
                  <p className="text-[8px] font-black uppercase tracking-widest text-amber-600 mb-3">{mt.labels.bankInfo}</p>
                  <pre className="text-xs font-bold text-slate-800 whitespace-pre-wrap font-['Montserrat'] leading-relaxed text-justify">
                    {ally.bankDetails || '...'}
                  </pre>
                </div>
              </div>
              <div className="bg-slate-950 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-2xl">
                <div className="text-left">
                   <span className="text-[8px] font-black uppercase tracking-widest opacity-60 block">{mt.labels.total}</span>
                   <span className="text-xs font-bold text-blue-400">{mt.labels.taxes}</span>
                </div>
                <span className="text-3xl font-black tracking-tighter">$ {total.toFixed(2)}</span>
              </div>
            </div>
          )}

        </div>

        <div className="p-8 border-t border-slate-100 bg-white shadow-inner">
          {step === 'select' && (
            <button 
              disabled={total <= 0}
              onClick={() => setStep('details')}
              className="w-full py-6 rounded-[2.5rem] bg-slate-900 text-white font-black text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-30"
            >
              {mt.labels.continue} <ArrowRight size={18}/>
            </button>
          )}
          {step === 'details' && (
            <div className="flex gap-4">
              <button onClick={() => setStep('select')} className="flex-1 py-6 rounded-[2rem] bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">{mt.labels.back}</button>
              <button 
                disabled={!customerInfo.name || !customerInfo.date || !customerInfo.time}
                onClick={() => setStep('payment')} 
                className="flex-[2] py-6 rounded-[2rem] bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-30"
              >
                {mt.labels.goPayment} <CreditCard size={18}/>
              </button>
            </div>
          )}
          {step === 'payment' && (
            <div className="flex gap-4">
              <button onClick={() => setStep('details')} className="flex-1 py-6 rounded-[2rem] bg-slate-100 text-slate-400 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">{mt.labels.back}</button>
              <button 
                disabled={isSaving}
                onClick={handleFinish}
                className="flex-[2] py-6 rounded-[2rem] bg-[#25D366] text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <Send size={18}/>}
                {mt.labels.sendProof}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
