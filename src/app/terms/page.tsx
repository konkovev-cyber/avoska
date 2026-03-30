'use client';

import Link from 'next/link';
import { ChevronLeft, Scale, ShieldCheck, FileText } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-primary font-semibold mb-8 hover:translate-x-[-4px] transition-transform">
                <ChevronLeft className="h-5 w-5" /> На главную
            </Link>

            <div className="bg-surface rounded-[2.5rem] border border-border p-8 md:p-12 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                        <Scale className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-semibold">Публичная оферта</h1>
                </div>

                <div className="space-y-8 text-muted-foreground font-medium leading-relaxed">
                    <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60">Сервис «Авоська+»</p>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">1. Предмет соглашения</h2>
                        <p>
                            Настоящее Пользовательское соглашение является публичной офертой. Сервис «Авоська+» предоставляет Пользователю площадку для размещения, поиска и просмотра частных объявлений. Сервис не является организатором сделки, покупателем или продавцом.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">2. Обязанности Пользователя</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Предоставлять достоверную информацию при регистрации и создании объявлений.</li>
                            <li>Не размещать товары и услуги, оборот которых запрещен или ограничен законодательством РФ.</li>
                            <li>Не использовать Сервис для спама, мошенничества или нарушения авторских прав.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">3. Права Администрации</h2>
                        <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>Администрация имеет право модерировать, редактировать или удалять любые объявления без объяснения причин.</li>
                            <li>В случае нарушения правил аккаунт Пользователя может быть заблокирован.</li>
                            <li>Администрация не несет ответственности за качество товаров и благонадежность продавцов. Всю ответственность за сделку несут сами пользователи.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">4. Персональные данные</h2>
                        <p>
                            Используя Сервис, Пользователь дает согласие на обработку своих персональных данных в соответствии с <Link prefetch={false} href="/privacy" className="text-primary hover:underline">Политикой конфиденциальности</Link>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-foreground mb-4">5. Статус проекта</h2>
                        <p className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-700 italic">
                            Внимание: Проект «Авоська+» находится в стадии разработки (Beta). Возможны технические сбои. Используя сайт, вы подтверждаете, что осведомлены о текущем статусе проекта.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
