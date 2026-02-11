'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AuthForm({ mode }: { mode: 'login' | 'register' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (mode === 'register') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                toast.success('Регистрация успешна! Теперь вы можете войти.');
                router.push('/login');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('С возвращением!');
                router.push('/');
                router.refresh();
            }
        } catch (error: any) {
            toast.error(error.message || 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md p-8 bg-surface rounded-2xl shadow-xl border border-border">
            <h2 className="text-3xl font-bold text-center mb-8">
                {mode === 'login' ? 'Вход в А+' : 'Регистрация в А+'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                    <div>
                        <label className="block text-sm font-medium mb-1">Имя</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="Иван Иванов"
                            required
                        />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="example@mail.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Пароль</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary outline-none transition-all"
                        placeholder="••••••••"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 mt-4"
                >
                    {loading ? 'Загрузка...' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
                </button>
            </form>

            <div className="mt-6 text-center text-sm">
                {mode === 'login' ? (
                    <p>
                        Нет аккаунта?{' '}
                        <button onClick={() => router.push('/register')} className="text-primary font-semibold hover:underline">
                            Зарегистрироваться
                        </button>
                    </p>
                ) : (
                    <p>
                        Уже есть аккаунт?{' '}
                        <button onClick={() => router.push('/login')} className="text-primary font-semibold hover:underline">
                            Войти
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
}
