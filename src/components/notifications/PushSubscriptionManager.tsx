'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PushSubscriptionManager() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            checkSubscription();
        } else {
            setLoading(false);
        }
    }, []);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Error checking subscription:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribe = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Войдите, чтобы включить уведомления');
                return;
            }

            const registration = await navigator.serviceWorker.ready;

            // Re-fetch to get fresh VAPID key if needed, or hardcode/env
            const response = await fetch('/api/push/vapid-public-key');
            const { publicKey } = await response.json();

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // Save to database
            const { error } = await supabase
                .from('push_subscriptions')
                .upsert({
                    user_id: session.user.id,
                    subscription: sub.toJSON(),
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setSubscription(sub);
            toast.success('Уведомления включены!');
        } catch (error) {
            console.error('Subscription error:', error);
            toast.error('Не удалось включить уведомления');
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        setLoading(true);
        try {
            if (subscription) {
                await subscription.unsubscribe();

                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    await supabase
                        .from('push_subscriptions')
                        .delete()
                        .eq('user_id', session.user.id);
                }

                setSubscription(null);
                toast.success('Уведомления отключены');
            }
        } catch (error) {
            console.error('Unsubscription error:', error);
            toast.error('Ошибка при отключении');
        } finally {
            setLoading(false);
        }
    };

    if (!isSupported) return null;

    return (
        <div className="flex items-center gap-2 p-4 bg-surface border border-border rounded-2xl mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
                <h4 className="text-sm font-black uppercase tracking-tight">Push-уведомления</h4>
                <p className="text-xs text-muted-foreground">Получайте сообщения даже когда сайт закрыт</p>
            </div>
            <button
                onClick={subscription ? unsubscribe : subscribe}
                disabled={loading}
                className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
                    subscription
                        ? "bg-muted text-muted-foreground hover:bg-red-50 hover:text-red-500"
                        : "bg-primary text-white shadow-lg shadow-primary/20"
                )}
            >
                {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : subscription ? (
                    <>
                        <BellOff className="h-4 w-4" />
                        Выключить
                    </>
                ) : (
                    <>
                        <Bell className="h-4 w-4" />
                        Включить
                    </>
                )}
            </button>
        </div>
    );
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

import { cn } from '@/lib/utils';
