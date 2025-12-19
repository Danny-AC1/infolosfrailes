
import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

interface EditableImageProps {
  src: string;
  isAdmin: boolean;
  onSave: (url: string) => void;
  className?: string;
  alt?: string;
}

export default function EditableImage({ src, isAdmin, onSave, className, alt }: EditableImageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      onSave(url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Error subiendo imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`relative group/img bg-slate-100 flex items-center justify-center overflow-hidden ${className}`}>
      {src ? (
        <img src={src} alt={alt || "Image"} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300 gap-2 p-4">
          <ImageIcon size={48} strokeWidth={1.5} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Sin imagen cargada</span>
        </div>
      )}
      
      {isAdmin && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white/90 text-black px-6 py-3 rounded-2xl font-black flex items-center gap-3 shadow-2xl pointer-events-auto active:scale-95 transition-transform"
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <RefreshCw className="animate-spin" size={20} /> SUBIENDO...
              </>
            ) : (
              <>
                <Camera size={20} /> CAMBIAR IMAGEN
              </>
            )}
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
          <RefreshCw className="animate-spin text-[#118AB2]" size={32} />
        </div>
      )}
    </div>
  );
}
