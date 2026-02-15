'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function AuthForm({ mode }: { mode: 'login' | 'register' | 'forgot-password' | 'update-password' }) {
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
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
                    redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
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
        <div className="w-full max-w-sm p-6 md:p-8 bg-surface rounded-[2.5rem] shadow-2xl border border-border relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button
                onClick={() => router.push('/')}
                className="absolute top-6 right-6 p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground active:scale-90"
                title="Закрыть"
            >
                <X className="h-6 w-6" />
            </button>
            <h2 className="text-3xl font-black text-center mb-8 tracking-tighter">
                {mode === 'login' ? 'С возвращением!' :
                    mode === 'register' ? 'Станьте своим' :
                        mode === 'forgot-password' ? 'Сброс пароля' : 'Новый пароль'}
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
                {mode !== 'update-password' && (
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
                )}
                {mode !== 'forgot-password' && (
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1">
                                {mode === 'update-password' ? 'Новый пароль' : 'Пароль'}
                            </label>
                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => router.push('/forgot-password')}
                                    className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                                >
                                    Забыли пароль?
                                </button>
                            )}
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full h-14 px-5 rounded-2xl border border-border bg-background focus:border-primary outline-none transition-all font-bold"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                )}
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
                        mode === 'login' ? 'Войти' :
                            mode === 'register' ? 'Создать аккаунт' :
                                mode === 'forgot-password' ? 'Сбросить пароль' : 'Обновить пароль'
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => router.back()}
                    className="w-full h-14 bg-muted/30 text-muted-foreground font-black uppercase tracking-widest rounded-2xl hover:bg-muted/50 transition-all flex items-center justify-center gap-2 mt-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Назад
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
