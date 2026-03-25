'use client'; // Error components must be Client Components

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Optionally log the error to an error reporting service
        console.error('App Error Boundary caught an error:', error);
    }, [error]);

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-surface border-2 border-red-500/20 p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-xl shadow-red-500/5">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">Что-то пошло не так!</h2>
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        Произошла непредвиденная ошибка. Мы уже работаем над её устранением.
                    </p>
                </div>

                <div className="pt-2 space-y-3">
                    <button
                        onClick={() => reset()}
                        className="w-full h-12 bg-primary text-white flex items-center justify-center gap-2 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
                    >
                        <RefreshCw className="h-4 w-4" />
                        <span>Попробовать снова</span>
                    </button>

                    <Link
                        href="/"
                        className="w-full h-12 bg-muted/30 text-foreground flex items-center justify-center rounded-xl font-semibold uppercase text-[10px] tracking-widest hover:bg-muted/50 transition-all active:scale-95"
                    >
                        На главную
                    </Link>
                </div>
            </div>
        </div>
    );
}
