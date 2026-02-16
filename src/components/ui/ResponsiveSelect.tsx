'use client';

import { useState } from 'react';
import { X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export default function ResponsiveSelect({ label, value, onChange, options, placeholder = 'Выберите...' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <>
      {/* Desktop: Native Select */}
      <div className="hidden md:block space-y-1">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">{label}</label>
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-11 px-4 pr-10 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold appearance-none transition-all cursor-pointer"
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Mobile: Button + Bottom Sheet */}
      <div className="md:hidden space-y-1">
        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">{label}</label>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold flex items-center justify-between transition-all"
        >
          <span className={selectedLabel ? "text-foreground" : "text-muted-foreground/50 font-medium"}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Bottom Sheet Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:hidden animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <h2 className="text-xl font-black uppercase tracking-tight ml-2">{label}</h2>
              <button onClick={() => setIsOpen(false)} className="p-2 bg-muted/10 rounded-full text-muted-foreground">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto pb-8 pr-2 custom-scrollbar">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-6 py-4 rounded-2xl border-2 transition-all font-bold text-left",
                    value === opt.value ? "bg-primary/5 border-primary text-primary" : "bg-muted/10 border-transparent hover:bg-muted/20"
                  )}
                >
                  <span>{opt.label}</span>
                  {value === opt.value && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
