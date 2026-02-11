'use client';

import Link from 'next/link';
import { ChevronLeft, ShieldCheck, Lock, EyeOff } from 'lucide-react';

export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Link href="/" className="inline-flex items-center gap-2 text-primary font-black mb-8 hover:translate-x-[-4px] transition-transform">
                <ChevronLeft className="h-5 w-5" /> На главную
            </Link>

            <div className="bg-surface rounded-[2.5rem] border border-border p-8 md:p-12 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-black">Конфиденциальность</h1>
                </div>

                <div className="space-y-8 text-muted font-medium leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">1. Сбор информации</h2>
                        <p>
                            Мы собираем только те данные, которые необходимы для работы сервиса: имя (full name), адрес электронной почты, номер телефона (если указан) и данные, предоставляемые при авторизации через сторонние сервисы (Supabase Auth).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">2. Использование данных</h2>
                        <p>
                            Ваши данные используются для:
                        </p>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Идентификации вас как автора объявления.</li>
                            <li>Обеспечения связи между покупателем и продавцом.</li>
                            <li>Предотвращения мошенничества и спама.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">3. Защита данных</h2>
                        <p>
                            Все данные хранятся в защищенной облачной инфраструктуре Supabase. Мы не передаем ваши личные данные третьим лицам, за исключением случаев, прямо предусмотренных законодательством РФ.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">4. Публичность данных</h2>
                        <p>
                            Размещая объявление, вы понимаете, что указанные вами контактные данные (имя, телефон) становятся доступными для просмотра неограниченному кругу лиц в целях совершения сделки.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">5. Удаление данных</h2>
                        <p>
                            Вы можете в любой момент изменить или удалить свои данные через личный кабинет или обратившись в поддержку через Telegram-бота @avoskaplus_bot.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
