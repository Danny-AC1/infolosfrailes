
import React, { useRef, useState, useEffect } from 'react';
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
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  // Clear local preview when the source changes (upload finished and prop updated)
  useEffect(() => {
    if (src && localPreview) {
      setLocalPreview(null);
    }
  }, [src]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    // Show immediate local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLocalPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `images/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      onSave(url);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Error subiendo imagen.");
      setLocalPreview(null); // Clear preview on error
    } finally {
      setIsUploading(false);
    }
  };

  const displaySrc = localPreview || src;

  return (
    <div className={`relative group/img bg-slate-100 flex items-center justify-center overflow-hidden ${className}`}>
      {displaySrc ? (
        <img src={displaySrc} alt={alt || "Image"} className={`w-full h-full object-cover transition-opacity duration-300 ${isUploading ? 'opacity-50' : 'opacity-100'}`} />
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
        <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex items-center justify-center z-10">
          <div className="bg-white/90 p-4 rounded-full shadow-lg">
            <RefreshCw className="animate-spin text-[#118AB2]" size={32} />
          </div>
        </div>
      )}
    </div>
  );
}
