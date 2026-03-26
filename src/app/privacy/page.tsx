'use client';

import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Lock, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Link href="/" className="inline-flex items-center gap-2 text-primary font-semibold mb-8 hover:translate-x-[-4px] transition-transform">
                <ChevronLeft className="h-5 w-5" /> На главную
            </Link>

            <div className="bg-surface rounded-[2.5rem] border border-border p-8 md:p-12 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-bold">Политика обработки персональных данных</h1>
                </div>

                <div className="space-y-8 text-muted-foreground font-medium leading-relaxed">
                    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60">Сервис «Авоська+»</p>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. Общие положения</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Оператор: ИП Местный (в стадии оформления)</li>
                            <li>Адрес: г. Горячий Ключ</li>
                            <li>Email: privacy@avoska.ru</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2. Какие данные мы собираем</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li><strong>При регистрации:</strong> email, телефон, имя.</li>
                            <li><strong>При подаче объявления:</strong> фотографии, текст описания, контактные данные.</li>
                            <li><strong>Технические данные:</strong> IP-адрес, файлы cookies, метрики метрики посещаемости.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">3. Цели обработки данных</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Предоставление услуг сервиса «Авоська+».</li>
                            <li>Модерация объявлений и предотвращение мошенничества.</li>
                            <li>Обратная связь с пользователями, рассылка служебных уведомлений.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. Сроки хранения</h2>
                        <p>
                            Персональные данные хранятся до момента удаления аккаунта пользователем самостоятельно через настройки профиля, либо до момента отзыва согласия на обработку персональных данных.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5. Права пользователя</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Доступ к своим данным в личном кабинете.</li>
                            <li>Исправление и самостоятельное удаление данных.</li>
                            <li>Отзыв согласия на обработку ПДн (путем удаления аккаунта в настройках).</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">6. Защита данных</h2>
                        <p>
                            Мы применяем современные стандарты безопасности: подключение по протоколу HTTPS, надежное шифрование (Supabase/PostgreSQL), разграничение прав доступа RLS (Row Level Security) и хеширование паролей для защиты вашей личной информации. Данные хранятся на серверах.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
