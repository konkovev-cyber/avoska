'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email');

    return (
        <div className="w-full max-w-md p-8 bg-surface rounded-[2.5rem] shadow-2xl border border-border relative overflow-hidden text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="h-10 w-10 text-primary" />
            </div>

            <h1 className="text-3xl font-black mb-4 tracking-tighter">Подтвердите почту</h1>

            <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
                Мы отправили письмо с подтверждением на адрес <br />
                <span className="text-foreground font-bold">{email || 'вашу почту'}</span>. <br />
                Пожалуйста, перейдите по ссылке в письме, чтобы активировать аккаунт.
            </p>

            <div className="space-y-4">
                <button
                    onClick={() => router.push('/login')}
                    className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/30 hover:opacity-90 active:scale-95 transition-all"
                >
                    Перейти к логину
                </button>

                <Link
                    href="/"
                    className="flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    На главную
                </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-border/50">
                <p className="text-xs text-muted-foreground font-medium">
                    Не пришло письмо? Проверьте папку <b>Спам</b> или <br />
                    попробуйте зарегистрироваться снова позже.
                </p>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-4">
            <Suspense fallback={<div>Загрузка...</div>}>
                <VerifyEmailContent />
            </Suspense>
        </main>
    );
}
