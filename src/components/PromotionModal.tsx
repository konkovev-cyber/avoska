'use client';

import { useState } from 'react';
import { X, Zap, Crown, Timer, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PromotionModalProps {
    adId: string;
    adTitle: string;
    onClose: () => void;
    onUpdate: () => void;
}

const SERVICES = [
    {
        id: 'turbo',
        name: 'Турбо-продажа',
        description: 'Выделение цветом и приоритет в поиске',
        price: 199,
        icon: Zap,
        color: 'bg-orange-500',
        field: 'is_turbo'
    },
    {
        id: 'vip',
        name: 'VIP-статус',
        description: 'Ваше объявление всегда в топе категории',
        price: 499,
        icon: Crown,
        color: 'bg-purple-500',
        field: 'is_vip'
    },
    {
        id: 'pin',
        name: 'Закрепить',
        description: 'Объявление не будет опускаться в ленте 7 дней',
        price: 299,
        icon: Timer,
        color: 'bg-blue-500',
        field: 'pinned_until'
    }
];

export default function PromotionModal({ adId, adTitle, onClose, onUpdate }: PromotionModalProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handlePromote = async (service: typeof SERVICES[0]) => {
        setLoading(service.id);
        try {
            const updateData: any = {};
            if (service.field === 'pinned_until') {
                const date = new Date();
                date.setDate(date.getDate() + 7);
                updateData[service.field] = date.toISOString();
            } else {
                updateData[service.field] = true;
            }

            const { error } = await supabase
                .from('ads')
                .update(updateData)
                .eq('id', adId);

            if (error) throw error;

            toast.success(`${service.name} активирована!`);
            onUpdate();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Ошибка при активации услуги');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-background w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black">Продвижение</h2>
                        <p className="text-xs text-muted-foreground font-bold mt-1 line-clamp-1">{adTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    {SERVICES.map((service) => (
                        <button
                            key={service.id}
                            disabled={!!loading}
                            onClick={() => handlePromote(service)}
                            className="w-full p-2.5 rounded-2xl border border-border bg-surface hover:border-primary transition-all group flex items-center gap-3 text-left active:scale-[0.98]"
                        >
                            <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 transition-transform group-hover:rotate-6",
                                service.color
                            )}>
                                <service.icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-black text-[11px] uppercase tracking-wider">{service.name}</div>
                                <div className="text-[10px] text-muted-foreground font-bold truncate">{service.description}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-[11px] font-black text-primary">{service.price} ₽</div>
                                <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Выбрать</div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-6 bg-muted/30 border-t border-border mt-2">
                    <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest leading-relaxed">
                        При активации услуги она вступит в силу мгновенно.<br />
                        Это демонстрационный режим. Оплата не требуется.
                    </p>
                </div>
            </div>
        </div>
    );
}
