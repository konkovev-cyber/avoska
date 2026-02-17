'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ChevronDown, Search as SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  columns?: 1 | 2;
  triggerClassName?: string;
  prefixIcon?: React.ReactNode;
  showSearch?: boolean;
}

export default function ResponsiveSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'Выберите...',
  columns = 1,
  triggerClassName,
  prefixIcon,
  showSearch = true
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label;

  useEffect(() => {
    setMounted(true);

    const handleClickOutside = (event: MouseEvent) => {
      // Only close on desktop; mobile modal manages its own closing logic
      if (window.innerWidth < 1024) return;

      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const mobileModal = (
    <div className="fixed inset-0 z-[500] flex items-end justify-center lg:hidden animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-lg bg-surface rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-full duration-300 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-muted/20 rounded-full" />
        </div>

        <div className="px-6 pt-2 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-black uppercase tracking-tight ml-1">{label || 'Выберите'}</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 bg-muted/10 rounded-full text-muted-foreground hover:bg-muted/20 transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {showSearch && (
            <div className="relative group">
              <input
                type="text"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 pl-4 pr-10 bg-muted/5 border border-border rounded-xl shadow-inner outline-none focus:border-primary transition-all font-bold text-sm"
                autoFocus
              />
              <SearchIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto p-4 custom-scrollbar",
          columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-2" : "space-y-2"
        )}>
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={cn(
                  "flex items-center justify-between px-5 py-3.5 rounded-xl border-2 transition-all font-bold text-left",
                  value === opt.value
                    ? "bg-primary/5 border-primary text-primary shadow-sm"
                    : "bg-surface border-border/40 hover:bg-muted/10 hover:border-border"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))
          ) : (
            <div className="py-12 text-center text-muted-foreground font-bold">Ничего не найдено</div>
          )}
        </div>
      </div>
    </div>
  );

  const desktopDropdown = (
    <div className="absolute top-[calc(100%+6px)] left-1/2 -translate-x-1/2 lg:left-0 lg:translate-x-0 w-full min-w-[240px] bg-surface border border-border rounded-2xl shadow-2xl z-[50] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col max-h-[400px]">
      {showSearch && options.length > 8 && (
        <div className="p-2 border-b border-border/50 bg-muted/5">
          <div className="relative">
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-8 pr-4 bg-background border border-border rounded-lg outline-none focus:border-primary transition-all font-bold text-xs"
              autoFocus
            />
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-1 custom-scrollbar">
        {filteredOptions.length > 0 ? (
          filteredOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
                setSearch('');
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all font-bold text-left text-sm group",
                value === opt.value
                  ? "bg-primary text-white"
                  : "hover:bg-primary/10 hover:text-primary"
              )}
            >
              <span className="truncate">{opt.label}</span>
              {value === opt.value && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))
        ) : (
          <div className="py-8 text-center text-muted-foreground text-xs font-bold">Ничего не найдено</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-1 relative" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-11 px-4 rounded-xl bg-surface border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold flex items-center justify-between transition-all hover:border-primary group",
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {prefixIcon}
          <span className={cn("truncate", selectedLabel ? "text-foreground" : "text-muted-foreground/50 font-medium")}>
            {selectedLabel || placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-all ml-2",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && mounted && (
        <>
          {createPortal(mobileModal, document.body)}
          <div className="hidden lg:block">
            {desktopDropdown}
          </div>
        </>
      )}
    </div>
  );
}

