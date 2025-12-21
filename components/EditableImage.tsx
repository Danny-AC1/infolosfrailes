
import React, { useState, useEffect } from 'react';
import { ImageIcon, Link as LinkIcon, Save, X, ExternalLink } from 'lucide-react';

interface EditableImageProps {
  src: string;
  isAdmin: boolean;
  onSave: (url: string) => void;
  className?: string;
  alt?: string;
}

export default function EditableImage({ src, isAdmin, onSave, className, alt }: EditableImageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [urlValue, setUrlValue] = useState(src || '');

  useEffect(() => {
    setUrlValue(src || '');
  }, [src]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (urlValue.trim() === '' || urlValue.trim().startsWith('http')) {
      onSave(urlValue.trim());
      setIsEditing(false);
    } else {
      alert("Por favor, ingresa una URL válida que comience con http:// o https://");
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUrlValue(src || '');
    setIsEditing(false);
  };

  if (isAdmin && isEditing) {
    return (
      <div 
        className={`bg-slate-900/90 backdrop-blur-md p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${className}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full text-center">
          <div className="bg-blue-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <LinkIcon className="text-blue-400" size={24} />
          </div>
          <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-1">Enlace de Imagen</h4>
          <p className="text-[8px] text-white/50 uppercase font-bold mb-4 tracking-wider">Usa enlaces directos de ImgBB o PostImages</p>
          
          <input 
            type="text" 
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            className="w-full bg-white/10 border-2 border-white/20 focus:border-blue-400 rounded-2xl p-4 text-white text-xs font-bold outline-none transition-all placeholder:text-white/20"
            placeholder="https://i.ibb.co/..."
            autoFocus
          />
        </div>
        
        <div className="flex gap-3 w-full">
          <button 
            onClick={handleSave} 
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            <Save size={14}/> Aplicar Link
          </button>
          <button 
            onClick={handleCancel} 
            className="flex-1 bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancelar
          </button>
        </div>
        
        <p className="text-[7px] text-white/30 font-bold uppercase tracking-widest text-center mt-2">
          Asegúrate de que el enlace termine en .jpg, .png o .webp
        </p>
      </div>
    );
  }

  return (
    <div className={`relative group/img bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-500 ${className}`}>
      {src ? (
        <img 
          src={src} 
          alt={alt || "Imagen"} 
          className="w-full h-full object-cover transition-all duration-700 scale-100 group-hover/img:scale-105" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=Error+al+cargar+imagen';
          }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300 gap-3 p-8 w-full h-full text-center bg-slate-50 border-2 border-dashed border-slate-200 m-2 rounded-[2rem]">
          <ImageIcon size={48} strokeWidth={1} className="opacity-40" />
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Sin Imagen</span>
            {isAdmin && <span className="text-[7px] font-bold text-slate-300 uppercase block tracking-widest">Haz clic para agregar enlace</span>}
          </div>
        </div>
      )}
      
      {isAdmin && (
        <div 
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
          className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-all cursor-pointer gap-4 ${src ? 'opacity-0 group-hover/img:opacity-100' : 'opacity-100'}`}
        >
          <div className="bg-white text-slate-900 p-5 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all">
            <LinkIcon size={24} />
          </div>
          <div className="text-center">
            <span className="text-white text-[9px] font-black uppercase tracking-[0.3em] bg-blue-600 px-4 py-1.5 rounded-full shadow-lg">Editar Enlace</span>
            <p className="text-white/60 text-[7px] font-bold uppercase tracking-widest mt-2 italic">ImgBB / PostImages / Otros</p>
          </div>
        </div>
      )}
    </div>
  );
}
