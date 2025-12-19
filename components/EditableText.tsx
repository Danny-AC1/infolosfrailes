
import React, { useState, useEffect } from 'react';
import { Save, X, Edit2 } from 'lucide-react';

interface EditableTextProps {
  text: string;
  isAdmin: boolean;
  onSave: (newText: string) => void;
  className?: string;
  multiline?: boolean;
}

export default function EditableText({ text, isAdmin, onSave, className, multiline }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(text);

  useEffect(() => {
    setValue(text);
  }, [text]);

  if (!isAdmin) {
    return <p className={className}>{text}</p>;
  }

  if (!isEditing) {
    return (
      <div className="relative group/text inline-block w-full">
        <p className={`${className} group-hover/text:bg-blue-50/50 transition-colors rounded-lg cursor-pointer px-1 -mx-1`} onClick={() => setIsEditing(true)}>
          {text}
        </p>
        <button 
          onClick={() => setIsEditing(true)}
          className="absolute -top-6 right-0 opacity-0 group-hover/text:opacity-100 bg-blue-500 text-white p-1 rounded transition-opacity"
        >
          <Edit2 size={12}/>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-white border-2 border-blue-400 p-4 rounded-xl font-bold text-slate-800 outline-none min-h-[120px]"
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-white border-2 border-blue-400 p-3 rounded-xl font-bold text-slate-800 outline-none"
          autoFocus
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={() => {
            onSave(value);
            setIsEditing(false);
          }}
          className="flex items-center gap-1 bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs"
        >
          <Save size={14}/> GUARDAR
        </button>
        <button
          onClick={() => {
            setValue(text);
            setIsEditing(false);
          }}
          className="flex items-center gap-1 bg-slate-200 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs"
        >
          <X size={14}/> CANCELAR
        </button>
      </div>
    </div>
  );
}
