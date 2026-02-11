'use client';

import Link from 'next/link';
import { Send, Mail, MapPin, AlertCircle, Info, Heart } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-surface border-t border-border mt-12 py-8">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    {/* Logo & Copyright */}
                    <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-center md:text-left">
                        <Link href="/" className="flex items-center gap-1 group">
                            <span className="text-xl font-black text-primary tracking-tighter group-hover:opacity-80 transition-opacity">Авоська</span>
                            <span className="text-xl font-black text-accent">+</span>
                        </Link>
                        <p className="text-xs text-muted font-bold">
                            © {new Date().getFullYear()} Все права защищены.
                        </p>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex flex-wrap justify-center gap-6 text-xs font-bold text-muted uppercase tracking-wide">
                        <Link href="/categories" className="hover:text-primary transition-colors">Категории</Link>
                        <Link href="/help" className="hover:text-primary transition-colors">Помощь</Link>
                        <Link href="/terms" className="hover:text-primary transition-colors">Оферта</Link>
                        <Link href="/privacy" className="hover:text-primary transition-colors">Конфиденциальность</Link>
                    </div>

                    {/* Social & Beta Badge */}
                    <div className="flex items-center gap-4">
                        <a
                            href="https://t.me/avoskaplus_bot"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white p-2 rounded-full transition-all"
                            title="Telegram Бот"
                        >
                            <Send className="h-4 w-4" />
                        </a>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-orange-100/50">
                            <AlertCircle className="h-3 w-3" />
                            <span>Бета</span>
                        </div>
                    </div>
                </div>

                {/* Secondary Info */}
                <div className="mt-6 pt-6 border-t border-border/50 text-center">
                    <p className="text-[10px] text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
                        Проект находится на стадии разработки. Мы из Горячего Ключа <Heart className="h-3 w-3 text-red-500 inline fill-current mx-1 mb-0.5" /> и делаем сервис для людей.
                    </p>
                </div>
            </div>
        </footer>
    );
}
