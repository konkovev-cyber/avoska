'use client';

import { Info, ShieldCheck, MessageCircle, PlusCircle, Search, HelpCircle, Heart, Users, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function HelpPage() {
    return (
        <div className="container mx-auto px-4 py-16 max-w-5xl">
            {/* Header / Mission Statement */}
            <div className="text-center mb-20 space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-4 rotate-3 hover:rotate-6 transition-transform">
                    <Heart className="h-10 w-10 text-primary fill-current" />
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-foreground">
                    Ближе к людям
                </h1>
                <p className="text-xl md:text-2xl text-muted font-medium max-w-3xl mx-auto leading-relaxed">
                    Авоська+ — это не просто доска объявлений. Это способ сделать жизнь в нашем городе проще, честнее и добрее. Мы строим сообщество, где соседи помогают соседям.
                </p>
            </div>

            {/* Core Values Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-24">
                <div className="bg-surface p-10 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <Users className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Сообщество</h3>
                    <p className="text-muted leading-relaxed font-medium">
                        Мы объединяем людей, живущих рядом. Продавайте вещи, которые стали не нужны, и находите сокровища у соседей.
                    </p>
                </div>
                <div className="bg-surface p-10 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Честность</h3>
                    <p className="text-muted leading-relaxed font-medium">
                        Открытые профили, отзывы и модерация. Мы за безопасные сделки и прозрачные отношения между людьми.
                    </p>
                </div>
                <div className="bg-surface p-10 rounded-[2.5rem] border border-border shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all group">
                    <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <MapPin className="h-7 w-7" />
                    </div>
                    <h3 className="text-2xl font-black mb-3">Локальность</h3>
                    <p className="text-muted leading-relaxed font-medium">
                        Всё рядом. Не нужно ехать на другой конец города или ждать доставку из другой страны. Поддержим своих!
                    </p>
                </div>
            </div>

            {/* FAQ Section */}
            <div className="max-w-3xl mx-auto space-y-12">
                <h2 className="text-3xl font-black text-center mb-10 border-b border-border pb-6">Частые вопросы</h2>

                <div className="space-y-8">
                    <div className="flex gap-6">
                        <div className="shrink-0 pt-1">
                            <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center border border-border">
                                <PlusCircle className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-black mb-2">Как разместить объявление?</h3>
                            <p className="text-muted leading-relaxed font-medium">
                                Нажмите кнопку "Разместить объявление" вверху сайта. Это бесплатно. Опишите товар честно, добавьте фото — и ваши соседи увидят его мгновенно.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <div className="shrink-0 pt-1">
                            <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center border border-border">
                                <Search className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-black mb-2">Как найти нужное?</h3>
                            <p className="text-muted leading-relaxed font-medium">
                                Просто введите название в поиск или выберите категорию. Мы покажем сначала самые свежие предложения из вашего города.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <div className="shrink-0 pt-1">
                            <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center border border-border">
                                <MessageCircle className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-black mb-2">Как связаться?</h3>
                            <p className="text-muted leading-relaxed font-medium">
                                Пишите продавцу во встроенном чате. Это безопасно и удобно. Договоритесь о встрече в людном месте.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact / CTA */}
            <div className="mt-24 p-12 bg-gradient-to-br from-primary to-accent rounded-[3.5rem] text-center text-white shadow-2xl shadow-primary/30 relative overflow-hidden">
                <div className="relative z-10 max-w-2xl mx-auto">
                    <h2 className="text-4xl font-black mb-6">Мы всегда на связи</h2>
                    <p className="text-lg opacity-90 font-medium mb-10 leading-relaxed">
                        У вас есть идея, как сделать Авоську лучше? Или возникла проблема? Напишите нам — мы реальные люди и ответим лично.
                    </p>
                    <a
                        href="https://t.me/avoskaplus_bot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-primary px-10 py-5 rounded-2xl font-black hover:scale-105 transition-transform shadow-lg text-lg"
                    >
                        <MessageCircle className="h-5 w-5 fill-current" />
                        Написать в поддержку
                    </a>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-[-100px] left-[-100px] w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
            </div>

            <div className="mt-16 text-center">
                <Link href="/" className="inline-flex items-center gap-2 text-muted font-bold hover:text-primary transition-colors uppercase tracking-widest text-xs">
                    <Heart className="h-3 w-3 fill-current" /> Вернуться на главную
                </Link>
            </div>
        </div>
    );
}
