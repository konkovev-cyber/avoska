'use client';

import { Bell, Send, Bot, ShieldCheck, MapPin, Trash2, Plus, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';

interface SettingsSectionProps {
    tgChatId: string;
    setTgChatId: (v: string) => void;
    tgNotifyNewAds: boolean;
    setTgNotifyNewAds: (v: boolean) => void;
    tgNotifyNewUsers: boolean;
    setTgNotifyNewUsers: (v: boolean) => void;
    onSaveTg: () => Promise<void>;
    onTestTg: () => Promise<void>;
    tgSaving: boolean;
    cities: { id: string, name: string }[];
    onUpdateCities: () => Promise<void>;
}

export function SettingsSection({
    tgChatId, setTgChatId, tgNotifyNewAds, setTgNotifyNewAds, tgNotifyNewUsers, setTgNotifyNewUsers,
    onSaveTg, onTestTg, tgSaving, cities, onUpdateCities
}: SettingsSectionProps) {
    const [newCityName, setNewCityName] = useState('');
    const [editingCity, setEditingCity] = useState<{id: string, name: string} | null>(null);

    const handleAddCity = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCityName.trim()) return;
        try {
            if (editingCity) {
                const { error } = await supabase.from('cities').update({ name: newCityName.trim() }).eq('id', editingCity.id);
                if (error) throw error;
                toast.success('Город обновлен');
            } else {
                const { error } = await supabase.from('cities').insert({ name: newCityName.trim() });
                if (error) throw error;
                toast.success('Город добавлен');
            }
            setNewCityName('');
            setEditingCity(null);
            await onUpdateCities();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const deleteCity = async (id: string) => {
        if (!confirm('Удалить город?')) return;
        const { error } = await supabase.from('cities').delete().eq('id', id);
        if (!error) {
            toast.success('Удалено');
            onUpdateCities();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Telegram Notifications */}
            <div className="bg-surface rounded-2xl border border-border/40 p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                        <Send className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm uppercase tracking-widest">Уведомления в Telegram</h3>
                        <p className="text-xs text-muted-foreground">Настройка автоматических отчетов</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold uppercase text-muted-foreground ml-1">Chat ID (группы или админа)</label>
                        <input
                            type="text"
                            value={tgChatId}
                            onChange={(e) => setTgChatId(e.target.value)}
                            className="w-full bg-muted/50 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                            placeholder="-100123456789"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/20 cursor-pointer hover:bg-muted/50 transition-all group">
                            <span className="text-[10px] font-semibold uppercase tracking-wide group-hover:text-primary transition-colors">Новые объявления</span>
                            <button
                                onClick={() => setTgNotifyNewAds(!tgNotifyNewAds)}
                                className={cn("w-10 h-5 rounded-full relative transition-all", tgNotifyNewAds ? "bg-primary" : "bg-muted-foreground/30")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", tgNotifyNewAds ? "left-6" : "left-1")} />
                            </button>
                        </label>
                        <label className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border border-border/20 cursor-pointer hover:bg-muted/50 transition-all group">
                            <span className="text-[10px] font-semibold uppercase tracking-wide group-hover:text-primary transition-colors">Новые юзеры</span>
                            <button
                                onClick={() => setTgNotifyNewUsers(!tgNotifyNewUsers)}
                                className={cn("w-10 h-5 rounded-full relative transition-all", tgNotifyNewUsers ? "bg-primary" : "bg-muted-foreground/30")}
                            >
                                <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", tgNotifyNewUsers ? "left-6" : "left-1")} />
                            </button>
                        </label>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-border/40 mt-4">
                        <button
                            onClick={onTestTg}
                            className="flex-1 py-3 bg-muted hover:bg-muted-foreground/10 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all"
                        >
                            Тест связи
                        </button>
                        <button
                            onClick={onSaveTg}
                            disabled={tgSaving}
                            className="flex-[2] py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-semibold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                        >
                            {tgSaving ? 'Сохранение...' : 'Сохранить настройки'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Cities Management */}
            <div className="bg-surface rounded-2xl border border-border/40 p-6 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm uppercase tracking-widest">Список городов</h3>
                        <p className="text-xs text-muted-foreground">Добавление или удаление регионов</p>
                    </div>
                </div>

                <form onSubmit={handleAddCity} className="flex gap-2">
                    <input
                        type="text"
                        value={newCityName}
                        onChange={(e) => setNewCityName(e.target.value)}
                        placeholder="Название города..."
                        className="flex-1 bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                    />
                    <button type="submit" className="p-2.5 bg-primary text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md">
                        {editingCity ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </button>
                </form>

                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-border">
                    {cities.map(city => (
                        <div key={city.id} className="flex items-center justify-between p-3 bg-muted/20 border border-border/40 rounded-xl group hover:bg-muted/40 transition-all">
                            <span className="text-sm font-semibold group-hover:text-primary transition-colors">{city.name}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingCity(city); setNewCityName(city.name); }} className="p-1.5 hover:bg-primary/10 text-primary rounded-lg">
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => deleteCity(city.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
