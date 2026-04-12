'use client';

import { useState } from 'react';
import { X, Zap, Crown, Flame, ArrowUpCircle, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface PromotionModalProps {
    adId: string;
    adTitle: string;
    onClose: () => void;
    onUpdate: () => void;
}

const SERVICES = [
    {
        id: 'up_1_time',
        name: 'Поднятие в поиске',
        description: 'Разовое поднятие на 1-е место списка',
        price: 29,
        icon: ArrowUpCircle,
        color: 'bg-blue-500',
    },
    {
        id: 'highlight_3_days',
        name: 'Выделение ТОП',
        description: 'Яркая наклейка "ТОП" на 3 дня',
        price: 49,
        icon: Zap,
        color: 'bg-orange-500',
    },
    {
        id: 'urgent_7_days',
        name: 'Значок СРОЧНО',
        description: 'Красный стикер на 7 дней',
        price: 79,
        icon: Flame,
        color: 'bg-red-500',
    },
    {
        id: 'vip_7_days',
        name: 'VIP-статус',
        description: 'Всегда в топе категории на 7 дней',
        price: 149,
        icon: Crown,
        color: 'bg-purple-500',
    }
];

export default function PromotionModal({ adId, adTitle, onClose, onUpdate }: PromotionModalProps) {
    const [loading, setLoading] = useState<string | null>(null);

    const handlePromote = async (service: typeof SERVICES[0]) => {
        setLoading(service.id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Войдите в аккаунт');
                return;
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                },
                body: JSON.stringify({
                    adId,
                    packageType: service.id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при создании платежа');
            }

            // Перенаправляем на страницу оплаты (ЮKassa)
            if (data.confirmationUrl) {
                window.location.href = data.confirmationUrl;
            } else {
                throw new Error('Ссылка на оплату не получена');
            }

        } catch (error: any) {
            console.error('Promotion error:', error);
            toast.error(error.message || 'Сбой соединения. Попробуйте позже.');
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[1001] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-background w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">Продвижение <Crown className="h-5 w-5 text-purple-500" /></h2>
                        <p className="text-xs text-muted-foreground font-semibold mt-1 line-clamp-1">{adTitle}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors active:scale-90">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 space-y-3 overflow-y-auto">
                    {SERVICES.map((service) => (
                        <button
                            key={service.id}
                            disabled={!!loading}
                            onClick={() => handlePromote(service)}
                            className="w-full p-5 rounded-[2rem] border border-border/40 bg-surface/50 hover:bg-surface hover:border-primary/50 shadow-sm hover:shadow-xl transition-all group flex items-center gap-5 text-left active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative"
                        >
                            {/* Accent background glow on hover */}
                            <div className={cn(
                                "absolute -right-10 -top-10 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity",
                                service.color
                            )} />

                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3",
                                service.color,
                                "ring-4 ring-white/10"
                            )}>
                                {loading === service.id ? <Loader2 className="w-7 h-7 animate-spin" /> : <service.icon className="h-7 w-7" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold uppercase tracking-widest text-[11px] text-muted-foreground mb-0.5 group-hover:text-primary transition-colors">{service.name}</div>
                                <div className="text-sm font-bold leading-tight line-clamp-1">{service.description}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-xl font-black text-primary drop-shadow-sm">{service.price} ₽</div>
                                <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground flex items-center justify-end gap-1 mt-1 opacity-60 group-hover:opacity-100">
                                    Выбрать <ExternalLink className="h-3 w-3" />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-4 md:p-6 bg-muted/30 border-t border-border shrink-0">
                    <p className="text-[10px] text-muted-foreground text-center font-semibold uppercase tracking-widest leading-relaxed">
                        Оплата производится через защищенный шлюз ЮKassa.<br />
                        Услуга применится к вашему объявлению сразу после оплаты.
                    </p>
                </div>
            </div>
        </div>
    );
}
