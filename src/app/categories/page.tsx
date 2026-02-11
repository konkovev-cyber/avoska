'use client';

import Link from 'next/link';
import { Home, Car, Smartphone, Shirt, Gamepad, Armchair, ChevronRight } from 'lucide-react';

const CATEGORIES = [
    { name: 'Недвижимость', slug: 'real-estate', icon: Home, color: 'bg-blue-500', desc: 'Квартиры, дома, комнаты и участки' },
    { name: 'Транспорт', slug: 'transport', icon: Car, color: 'bg-green-500', desc: 'Легковые авто, спецтехника и запчасти' },
    { name: 'Электроника', slug: 'electronics', icon: Smartphone, color: 'bg-purple-500', desc: 'Телефоны, компьютеры и гаджеты' },
    { name: 'Одежда', slug: 'clothing', icon: Shirt, color: 'bg-orange-500', desc: 'Мужская, женская и детская одежда' },
    { name: 'Хобби', slug: 'hobby', icon: Gamepad, color: 'bg-red-500', desc: 'Игры, коллекционирование и отдых' },
    { name: 'Для дома', slug: 'home', icon: Armchair, color: 'bg-teal-500', desc: 'Мебель, ремонт и декор' },
];

export default function CategoriesPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <h1 className="text-4xl font-black mb-8">Все категории</h1>

            <div className="grid md:grid-cols-2 gap-6">
                {CATEGORIES.map((cat) => (
                    <Link
                        key={cat.slug}
                        href={`/category?slug=${cat.slug}`}
                        className="flex items-center p-8 bg-surface rounded-3xl border border-border hover:border-primary hover:shadow-xl transition-all group"
                    >
                        <div className={`w-16 h-16 ${cat.color} rounded-2xl flex items-center justify-center text-white mr-6 group-hover:scale-110 transition-transform shadow-lg`}>
                            <cat.icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-xl font-black mb-1">{cat.name}</h3>
                            <p className="text-muted text-sm">{cat.desc}</p>
                        </div>
                        <ChevronRight className="h-6 w-6 text-muted group-hover:text-primary transition-colors" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
