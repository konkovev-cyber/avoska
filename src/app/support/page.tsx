'use client';

import Link from 'next/link';
import { ChevronLeft, LifeBuoy, Send, Mail, MessageCircle } from 'lucide-react';

export default function SupportPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-2xl">
            <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-primary font-semibold mb-8 hover:translate-x-[-4px] transition-transform">
                <ChevronLeft className="h-5 w-5" /> На главную
            </Link>

            <div className="bg-surface rounded-[2.5rem] border border-border p-8 md:p-12 shadow-sm relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <LifeBuoy className="w-64 h-64 text-primary shrink-0" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-4 bg-primary/10 rounded-2xl text-primary">
                            <LifeBuoy className="h-8 w-8" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold">Служба поддержки</h1>
                    </div>

                    <p className="text-muted-foreground font-medium leading-relaxed mb-10">
                        Если у вас возникли вопросы, предложения или проблемы с использованием сервиса «Авоська+», выберите удобный способ связи, и мы постараемся помочь вам как можно быстрее.
                    </p>

                    <div className="space-y-4">
                        {/* Telegram Support */}
                        <a
                            href="https://t.me/avoskaplus_bot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-5 p-5 rounded-2xl border border-border hover:border-blue-500/30 hover:bg-blue-50/50 transition-all group"
                        >
                            <div className="w-14 h-14 bg-blue-100 text-blue-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Send className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground mb-1">Написать в Telegram</h3>
                                <p className="text-sm font-medium text-muted-foreground">Быстрый ответ и решение вопросов в мессенджере</p>
                                <p className="text-xs font-bold text-blue-500 mt-2">@avoskaplus_bot</p>
                            </div>
                        </a>

                        {/* Email Support */}
                        <a
                            href="mailto:admin@353290.ru"
                            className="flex items-center gap-5 p-5 rounded-2xl border border-border hover:border-orange-500/30 hover:bg-orange-50/50 transition-all group"
                        >
                            <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                <Mail className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground mb-1">Написать на Email</h3>
                                <p className="text-sm font-medium text-muted-foreground">Для официальных запросов и подробных писем</p>
                                <p className="text-xs font-bold text-orange-500 mt-2">admin@353290.ru</p>
                            </div>
                        </a>
                    </div>

                    <div className="mt-10 p-5 bg-muted/5 rounded-2xl border border-border/50 flex items-start gap-4">
                        <MessageCircle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-sm mb-1">Режим работы</h4>
                            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                                Мы стараемся отвечать на все запросы в течение 24 часов в рабочие дни. Техническая поддержка в Telegram обычно отвечает быстрее.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
