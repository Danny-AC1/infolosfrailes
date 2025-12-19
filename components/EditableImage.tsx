
import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Image as ImageIcon, Plus } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
  const [progress, setProgress] = useState(0);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (src && localPreview) {
      setLocalPreview(null);
      setProgress(0);
    }
  }, [src]);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.8);
        };
      };
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    const previewReader = new FileReader();
    previewReader.onloadend = () => setLocalPreview(previewReader.result as string);
    previewReader.readAsDataURL(file);

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(p);
        },
        (error) => {
          console.error("Upload error:", error);
          setIsUploading(false);
          setLocalPreview(null);
          alert("Error al subir la imagen.");
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          onSave(url);
          setIsUploading(false);
        }
      );
    } catch (err) {
      console.error(err);
      setIsUploading(false);
    }
  };

  const displaySrc = localPreview || src;

  return (
    <div className={`relative group/img bg-slate-100 flex items-center justify-center overflow-hidden transition-all duration-500 border-2 border-transparent ${isAdmin && !displaySrc ? 'border-dashed border-slate-300' : ''} ${className}`}>
      {displaySrc ? (
        <img 
          src={displaySrc} 
          alt={alt || "Imagen"} 
          className={`w-full h-full object-cover transition-all duration-700 ${isUploading ? 'scale-110 blur-sm opacity-50' : 'scale-100 opacity-100'}`} 
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-300 gap-2 p-4 w-full h-full text-center">
          <ImageIcon size={40} strokeWidth={1} />
          {isAdmin && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sin imagen</span>}
        </div>
      )}
      
      {isAdmin && !isUploading && (
        <div 
          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-all cursor-pointer ${displaySrc ? 'opacity-0 group-hover/img:opacity-100' : 'opacity-100'}`}
        >
          <div className="flex flex-col items-center gap-3">
             <div className="bg-white text-slate-900 p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all">
                <Camera size={24} />
             </div>
             {isAdmin && !displaySrc && (
               <span className="text-white text-[10px] font-black uppercase tracking-[0.2em] drop-shadow-lg">Añadir foto</span>
             )}
          </div>
        </div>
      )}
      
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />

      {isUploading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/40 backdrop-blur-sm">
          <div className="w-2/3 h-1.5 bg-white/20 rounded-full overflow-hidden mb-2 border border-white/10">
            <div className="h-full bg-[#118AB2] transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
            {progress < 100 ? `${Math.round(progress)}%` : 'Guardando...'}
          </span>
        </div>
      )}
    </div>
  );
}
