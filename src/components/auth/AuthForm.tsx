'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X } from 'lucide-react';

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
        <div className="w-full max-w-sm p-6 md:p-8 bg-surface rounded-[2.5rem] shadow-2xl border border-border relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button
                onClick={() => router.push('/')}
                className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground active:scale-90"
                title="Закрыть"
            >
                <X className="h-6 w-6" />
            </button>
            <h2 className="text-3xl font-black text-center mb-8 tracking-tighter">
                {mode === 'login' ? 'С возвращением!' : 'Станьте своим'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-5">
                {mode === 'register' && (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Как вас зовут?</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full h-14 px-5 rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold"
                            placeholder="Иван Иванов"
                            required
                        />
                    </div>
                )}
                <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Ваша почта (Email)</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-14 px-5 rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold"
                        placeholder="example@mail.com"
                        required
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Пароль</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-14 px-5 rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold"
                        placeholder="••••••••"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-4"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Загрузка...</span>
                        </div>
                    ) : (
                        mode === 'login' ? 'Войти' : 'Создать аккаунт'
                    )}
                </button>
            </form>

            <div className="mt-8 text-center">
                {mode === 'login' ? (
                    <p className="text-sm font-medium text-muted-foreground">
                        У вас ещё нет аккаунта?{' '}
                        <button onClick={() => router.push('/register')} className="text-primary font-black hover:underline uppercase text-xs tracking-wider">
                            Создать
                        </button>
                    </p>
                ) : (
                    <p className="text-sm font-medium text-muted-foreground">
                        Уже есть аккаунт?{' '}
                        <button onClick={() => router.push('/login')} className="text-primary font-black hover:underline uppercase text-xs tracking-wider">
                            Войти
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
}
