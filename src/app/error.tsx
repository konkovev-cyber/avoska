'use client'; // Error components must be Client Components

import { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';

// Ключи Supabase-сессии, которые НЕ нужно удалять при сбросе
const SUPABASE_AUTH_KEYS = [
    'sb-access-token',
    'sb-refresh-token',
    'supabase.auth.token',
];

async function clearAppCache(): Promise<void> {
    // 1. Сбросить SW-кэши (причина ошибки после обновления)
    if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // 2. Очистить sessionStorage полностью — там метаданные навигации
    sessionStorage.clear();

    // 3. Очистить localStorage, но сохранить авторизацию Supabase
    const preserved: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (SUPABASE_AUTH_KEYS.some(k => key.includes(k)) || key.startsWith('sb-'))) {
            preserved[key] = localStorage.getItem(key) || '';
        }
    }
    localStorage.clear();
    Object.entries(preserved).forEach(([k, v]) => localStorage.setItem(k, v));

    // 4. Снять регистрацию устаревшего Service Worker
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
    }
}

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [isClearing, setIsClearing] = useState(false);
    const [autoFixed, setAutoFixed] = useState(false);

    useEffect(() => {
        console.error('App Error Boundary caught an error:', error);

        // Автоматическое исправление при первой ошибке загрузки:
        // если sessionStorage ещё не помечен — это первый визит с ошибкой,
        // значит скорее всего причина в устаревшем кэше после обновления.
        const alreadyTriedAutoFix = sessionStorage.getItem('app_error_auto_fix');
        if (!alreadyTriedAutoFix) {
            sessionStorage.setItem('app_error_auto_fix', '1');
            setAutoFixed(true);
            // Чистим кэши и перезагружаем без ввода данных пользователем
            clearAppCache().then(() => {
                window.location.reload();
            });
        }
    }, [error]);

    const handleFullReset = async () => {
        setIsClearing(true);
        try {
            await clearAppCache();
            // Убираем флаг авто-фикса чтобы следующая ошибка снова попробовала
            sessionStorage.removeItem('app_error_auto_fix');
            window.location.href = '/';
        } catch (e) {
            console.error('Reset failed:', e);
            window.location.reload();
        } finally {
            setIsClearing(false);
        }
    };

    // Если автофикс запущен — показываем экран загрузки
    if (autoFixed) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
                <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Обновляем приложение...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-surface border-2 border-red-500/20 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-xl shadow-red-500/5">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Что-то пошло не так!</h2>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Произошла непредвиденная ошибка. Попробуйте сбросить приложение — ваши данные сохранятся.
                    </p>
                </div>

                <div className="pt-2 space-y-3">
                    <button
                        onClick={handleFullReset}
                        disabled={isClearing}
                        className="w-full h-12 bg-primary text-white flex items-center justify-center gap-2 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-70"
                    >
                        {isClearing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Trash2 className="h-4 w-4" />
                        )}
                        <span>{isClearing ? 'Сбрасываем...' : 'Сбросить приложение'}</span>
                    </button>

                    <button
                        onClick={() => reset()}
                        className="w-full h-12 bg-muted/30 text-foreground flex items-center justify-center gap-2 rounded-xl font-semibold uppercase text-[10px] tracking-widest hover:bg-muted/50 transition-all active:scale-95"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span>Попробовать снова</span>
                    </button>

                    <Link prefetch={false}
                        href="/"
                        className="w-full h-12 bg-muted/10 text-muted-foreground flex items-center justify-center rounded-xl font-semibold uppercase text-[10px] tracking-widest hover:bg-muted/20 transition-all active:scale-95"
                    >
                        На главную
                    </Link>
                </div>
            </div>
        </div>
    );
}
