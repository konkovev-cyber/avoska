'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();
    const [status, setStatus] = useState('Авторизация...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Supabase sends tokens in the URL hash fragment (#access_token=...)
                // The supabase-js client automatically picks up the hash and sets the session
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Auth callback error:', error);
                    setStatus('Ошибка авторизации. Перенаправление...');
                    setTimeout(() => router.push('/login'), 2000);
                    return;
                }

                if (data.session) {
                    setStatus('Успешно! Перенаправление...');
                    router.push('/');
                } else {
                    // Try to detect hash and set session from URL
                    const hash = window.location.hash;
                    if (hash && hash.includes('access_token')) {
                        // supabase-js should automatically handle this
                        // Wait a moment for it to process
                        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                        if (session) {
                            setStatus('Успешно! Перенаправление...');
                            router.push('/');
                            return;
                        }
                    }
                    setStatus('Сессия не найдена. Перенаправление...');
                    setTimeout(() => router.push('/login'), 2000);
                }
            } catch (err) {
                console.error('Callback error:', err);
                setStatus('Ошибка. Перенаправление...');
                setTimeout(() => router.push('/login'), 2000);
            }
        };

        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-lg font-bold text-foreground">{status}</p>
            </div>
        </div>
    );
}
