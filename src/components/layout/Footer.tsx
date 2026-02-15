'use client';

import Link from 'next/link';
import { Send, Mail, MapPin, AlertCircle, Info, Heart, Smartphone } from 'lucide-react';

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
                            © 2026 Все права защищены.
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
                            href="https://github.com/konkovev-cyber/avoska/releases/download/v0.1.0/avoska.apk"
                            className="bg-green-50 text-green-600 hover:bg-green-600 hover:text-white p-2 rounded-full transition-all flex items-center justify-center"
                            title="Скачать приложение для Android (.apk)"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17.523 15.3414C17.0673 15.3414 16.6974 14.9715 16.6974 14.5158C16.6974 14.0601 17.0673 13.6902 17.523 13.6902C17.9787 13.6902 18.3486 14.0601 18.3486 14.5158C18.3486 14.9715 17.9787 15.3414 17.523 15.3414ZM6.477 15.3414C6.0213 15.3414 5.6514 14.9715 5.6514 14.5158C5.6514 14.0601 6.0213 13.6902 6.477 13.6902C6.9327 13.6902 7.3026 14.0601 7.3026 14.5158C7.3026 14.9715 6.9327 15.3414 6.477 15.3414ZM17.8488 11.0841L19.7826 7.7346C19.8966 7.5369 19.8286 7.2847 19.6309 7.1707C19.434 7.0567 19.1818 7.1247 19.0678 7.3224L17.1064 10.7201C15.658 10.0617 14.0205 9.7155 12.28 9.7155C10.5395 9.7155 8.902 10.0617 7.4536 10.7201L5.4922 7.3224C5.3782 7.1247 5.126 7.0567 4.9291 7.1707C4.7314 7.2847 4.6634 7.5369 4.7774 7.7346L6.7112 11.0841C3.3916 12.8715 1.1444 16.3262 1.1044 20.3544H23.4564C23.4164 16.3262 21.1692 12.8715 17.8488 11.0841Z" />
                            </svg>
                        </a>
                        <a
                            href="https://t.me/HT_Elk"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white p-2 rounded-full transition-all"
                            title="Написать в Telegram"
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
