'use client';

import { Ad } from '@/lib/types';
import { Package, MapPin, Clock, Search, List, Grid3x3, CheckCircle, Ban, Trash2, ShieldCheck, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface AdsTableProps {
    ads: Ad[];
    viewMode: 'grid' | 'table';
    onUpdate: () => Promise<void>;
    searchQuery: string;
}

export function AdsTable({ ads, viewMode, onUpdate, searchQuery }: AdsTableProps) {
    const filteredAds = ads.filter(ad =>
        ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ad.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const updateAdStatus = async (id: string, status: string) => {
        try {
            const { error } = await supabase.from('ads').update({ status }).eq('id', id);
            if (error) throw error;
            toast.success(`Статус обновлен: ${status}`);
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    const toggleVip = async (id: string, isVip: boolean) => {
        try {
            const { error } = await supabase.from('ads').update({ is_vip: isVip }).eq('id', id);
            if (error) throw error;
            toast.success(isVip ? 'VIP статус присвоен' : 'VIP статус снят');
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    const deleteAd = async (id: string) => {
        if (!confirm('Удалить объявление навсегда?')) return;
        try {
            const { error } = await supabase.from('ads').delete().eq('id', id);
            if (error) throw error;
            toast.success('Объявление удалено');
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    if (viewMode === 'table') {
        return (
            <div className="bg-surface rounded-2xl border border-border/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/30 border-b border-border/40">
                                <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Объявление</th>
                                <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Цена</th>
                                <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Город</th>
                                <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Статус</th>
                                <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filteredAds.map((ad) => (
                                <tr key={ad.id} className="hover:bg-muted/20 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border/40">
                                                {ad.images?.[0] ? (
                                                    <img src={ad.images[0]} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <Package className="w-full h-full p-3 text-muted-foreground/30" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{ad.title}</p>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(ad.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 font-semibold text-sm">
                                        {ad.price ? `${ad.price.toLocaleString()} ₽` : '—'}
                                    </td>
                                    <td className="p-4 text-xs text-muted-foreground hidden md:table-cell">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {ad.city}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider",
                                            ad.status === 'active' ? "bg-green-500/10 text-green-500" :
                                            ad.status === 'pending' ? "bg-yellow-500/10 text-yellow-500" :
                                            "bg-red-500/10 text-red-500"
                                        )}>
                                            {ad.status === 'active' ? 'Активно' : ad.status === 'pending' ? 'На проверке' : 'Забанено'}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {ad.status === 'pending' ? (
                                                <button onClick={() => updateAdStatus(ad.id, 'active')} className="p-2 hover:bg-green-500/10 text-green-500 rounded-lg transition-all" title="Опубликовать">
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                            ) : ad.status === 'active' ? (
                                                <button onClick={() => updateAdStatus(ad.id, 'pending')} className="p-2 hover:bg-yellow-500/10 text-yellow-500 rounded-lg transition-all" title="Снять с публ.">
                                                    <ShieldCheck className="h-4 w-4" />
                                                </button>
                                            ) : (
                                                <button onClick={() => updateAdStatus(ad.id, 'active')} className="p-2 hover:bg-blue-500/10 text-blue-500 rounded-lg transition-all" title="Разбанить">
                                                     <ShieldCheck className="h-4 w-4" />
                                                </button>
                                            )}
                                            
                                            <button onClick={() => toggleVip(ad.id, !ad.is_vip)} className={cn("p-2 rounded-lg transition-all", ad.is_vip ? "bg-orange-500/10 text-orange-500" : "hover:bg-muted text-muted-foreground")} title="VIP">
                                                <ShieldCheck className="h-4 w-4" />
                                            </button>

                                            {ad.status !== 'rejected' && (
                                                <button onClick={() => updateAdStatus(ad.id, 'rejected')} className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all" title="Бан">
                                                    <Ban className="h-4 w-4" />
                                                </button>
                                            )}
                                            
                                            <button onClick={() => deleteAd(ad.id)} className="p-2 hover:bg-red-600 text-muted-foreground hover:text-white rounded-lg transition-all">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAds.map((ad) => (
                <div key={ad.id} className="bg-surface rounded-2xl border border-border/40 overflow-hidden group hover:shadow-xl transition-all">
                    <div className="aspect-video relative">
                        <img src={ad.images?.[0] || ''} className="w-full h-full object-cover" alt="" />
                        <div className="absolute top-2 right-2 flex gap-1">
                            <div className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider backdrop-blur-md",
                                ad.status === 'active' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            )}>
                                {ad.status}
                            </div>
                        </div>
                    </div>
                    <div className="p-4">
                        <h4 className="font-semibold text-sm truncate mb-1">{ad.title}</h4>
                        <p className="text-primary font-bold text-lg mb-3">{ad.price?.toLocaleString()} ₽</p>
                        <div className="flex gap-2">
                            <button onClick={() => updateAdStatus(ad.id, 'active')} className="flex-1 py-2 bg-muted hover:bg-primary hover:text-white rounded-xl text-xs font-semibold transition-all">Одобрить</button>
                            <button onClick={() => deleteAd(ad.id)} className="p-2 bg-muted hover:bg-red-500 hover:text-white rounded-xl transition-all">
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
