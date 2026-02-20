'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { X, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function AuthForm({ mode }: { mode: 'login' | 'register' | 'forgot-password' | 'update-password' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const errorParam = useMemo(() => searchParams.get('error'), [searchParams]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Безопасное получение origin только на клиенте
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            
            if (mode === 'register') {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${origin}/auth/callback`,
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;

                if (data.user && !data.session) {
                    toast.success('Почти готово! Проверьте почту для подтверждения.');
                    router.push(`/verify-email?email=${encodeURIComponent(email)}`);
                    return;
                }

                toast.success('Регистрация успешна!');
                router.push('/login');
            } else if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success('С возвращением!');
                router.push('/');
                router.refresh();
            } else if (mode === 'forgot-password') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${origin}/auth/callback?next=/update-password`,
                });
                if (error) throw error;
                toast.success('Проверьте почту!', {
                    description: 'Мы отправили ссылку для сброса пароля.'
                });
            } else if (mode === 'update-password') {
                const { error } = await supabase.auth.updateUser({
                    password: password
                });
                if (error) throw error;
                toast.success('Пароль успешно обновлен!');
                router.push('/');
            }
        } catch (error: any) {
            toast.error(error.message || 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm p-5 md:p-8 bg-surface rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-border relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button
                onClick={() => router.push('/')}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground active:scale-90 z-10"
                title="Закрыть"
            >
                <X className="h-5 w-5" />
            </button>
            <h2 className="text-2xl md:text-3xl font-black text-center mb-6 md:mb-8 tracking-tighter">
                {mode === 'login' ? 'С возвращением!' :
                    mode === 'register' ? 'Станьте своим' :
                        mode === 'forgot-password' ? 'Сброс пароля' : 'Новый пароль'}
            </h2>

            {errorParam === 'unauthorized' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex flex-col gap-1 animate-in slide-in-from-top-2 duration-500">
                    <div className="flex items-center gap-2 text-red-600">
                        <ShieldCheck className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Доступ ограничен</span>
                    </div>
                    <p className="text-[10px] text-red-500 font-bold leading-tight">
                        Пожалуйста, войдите в аккаунт или зарегистрируйтесь, чтобы продолжить.
                    </p>
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4 md:space-y-5">
                {mode === 'register' && (
                    <div>
                        <label className="block text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-[0.15em] ml-1">Как вас зовут?</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full h-12 md:h-14 px-4 md:px-5 rounded-xl md:rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold text-sm"
                            placeholder="Иван Иванов"
                            required
                        />
                    </div>
                )}
                {mode !== 'update-password' && (
                    <div>
                        <label className="block text-[9px] font-black uppercase text-muted-foreground mb-1.5 tracking-[0.15em] ml-1">Ваша почта (Email)</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-12 md:h-14 px-4 md:px-5 rounded-xl md:rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold text-sm"
                            placeholder="example@mail.com"
                            required
                        />
                    </div>
                )}
                {mode !== 'forgot-password' && (
                    <div>
                        <div className="flex justify-between items-center mb-1.5">
                            <label className="block text-[9px] font-black uppercase text-muted-foreground tracking-[0.15em] ml-1">
                                {mode === 'update-password' ? 'Новый пароль' : 'Пароль'}
                            </label>
                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => router.push('/forgot-password')}
                                    className="text-[9px] font-bold uppercase tracking-wider text-primary hover:underline"
                                >
                                    Забыли пароль?
                                </button>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-12 md:h-14 px-4 md:px-5 rounded-xl md:rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold text-sm"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 md:h-14 bg-primary text-white font-black uppercase tracking-widest rounded-xl md:rounded-2xl shadow-xl shadow-primary/30 hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 mt-2"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span className="text-xs">Загрузка...</span>
                        </div>
                    ) : (
                        <span className="text-sm">{mode === 'login' ? 'Войти' :
                            mode === 'register' ? 'Создать аккаунт' :
                                mode === 'forgot-password' ? 'Сбросить пароль' : 'Обновить пароль'}</span>
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full h-12 md:h-14 bg-muted/30 text-muted-foreground font-black uppercase tracking-widest rounded-xl md:rounded-2xl hover:bg-muted/50 transition-all flex items-center justify-center gap-2 mt-1"
                >
                    <ArrowLeft className="h-3 w-3" />
                    <span className="text-xs">Назад</span>
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
                ) : mode === 'register' ? (
                    <p className="text-sm font-medium text-muted-foreground">
                        Уже есть аккаунт?{' '}
                        <button onClick={() => router.push('/login')} className="text-primary font-black hover:underline uppercase text-xs tracking-wider">
                            Войти
                        </button>
                    </p>
                ) : mode === 'forgot-password' ? (
                    <p className="text-sm font-medium text-muted-foreground">
                        Вспомнили пароль?{' '}
                        <button onClick={() => router.push('/login')} className="text-primary font-black hover:underline uppercase text-xs tracking-wider">
                            Войти
                        </button>
                    </p>
                ) : null}
            </div>
        </div>
    );
}
