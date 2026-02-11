'use client';

import Link from 'next/link';
import { ChevronLeft, Scale, ShieldCheck, FileText } from 'lucide-react';

export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <Link href="/" className="inline-flex items-center gap-2 text-primary font-black mb-8 hover:translate-x-[-4px] transition-transform">
                <ChevronLeft className="h-5 w-5" /> На главную
            </Link>

            <div className="bg-surface rounded-[2.5rem] border border-border p-8 md:p-12 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                        <Scale className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-black">Публичная оферта</h1>
                </div>

                <div className="space-y-8 text-muted font-medium leading-relaxed">
                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">1. Общие положения</h2>
                        <p>
                            Настоящая оферта является официальным предложением сервиса «Авоська+» (далее — Сервис) для любого физического или юридического лица (Пользователя) использовать платформу для размещения объявлений. Использование Сервиса означает полное и безоговорочное принятие условий данной оферты.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">2. Предмет соглашения</h2>
                        <p>
                            Сервис предоставляет Пользователю услуги по размещению, поиску и просмотру частных объявлений о продаже товаров и оказании услуг. Сервис является информационной площадкой и не является участником сделок между Пользователями.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">3. Права и обязанности</h2>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>Пользователь обязуется предоставлять достоверную информацию в объявлениях.</li>
                            <li>Запрещено размещение товаров, оборот которых ограничен или запрещен законодательством РФ.</li>
                            <li>Администрация имеет право модерировать или удалять любые объявления без объяснения причин.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">4. Ответственность</h2>
                        <p>
                            Сервис не несёт ответственности за качество товаров, законность их продажи и достоверность описаний. Все риски, связанные с заключением сделок, Пользователи несут самостоятельно.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-black text-foreground mb-4">5. Статус проекта</h2>
                        <p className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-700 italic">
                            Внимание: Проект «Авоська+» находится в стадии разработки (Beta). Возможны технические сбои. Используя сайт, вы подтверждаете, что осведомлены о текущем статусе проекта.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
}
