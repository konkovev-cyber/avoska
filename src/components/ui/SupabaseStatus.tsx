'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SupabaseStatus() {
    const [status, setStatus] = useState<'checking' | 'awake' | 'sleeping' | 'error'>('checking');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        checkConnection();
    }, [retryCount]);

    const checkConnection = async () => {
        try {
            // Быстрый запрос для проверки связи
            const { error } = await supabase.from('categories').select('id').limit(1);

            if (error) {
                const pgError = error as any;
                // Если ошибка связана с таймаутом или подключением, вероятно база спит
                if (pgError.message?.includes('fetch') || pgError.status === 504 || pgError.status === 502) {
                    setStatus('sleeping');
                    // Авто-ретрай через 5 секунд
                    setTimeout(() => setRetryCount(prev => prev + 1), 5000);
                } else {
                    setStatus('error');
                }
            } else {
                setStatus('awake');
            }
        } catch (err) {
            setStatus('sleeping');
            setTimeout(() => setRetryCount(prev => prev + 1), 5000);
        }
    };

    if (status === 'awake' || status === 'checking') return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-background/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-500">
            <div className="bg-surface border-2 border-primary/20 p-8 rounded-[2.5rem] max-w-sm w-full space-y-6 shadow-2xl shadow-primary/10 text-center">
                <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center relative">
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">Запускаем сервис...</h2>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Похоже, база данных «отдыхала». Это займет около 10-15 секунд. Пожалуйста, не закрывайте страницу.
                    </p>
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 py-2 px-4 rounded-full w-fit mx-auto">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Попытка соединения...</span>
                </div>
            </div>
        </div>
    );
}
