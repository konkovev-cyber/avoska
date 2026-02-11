'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { ChevronLeft } from 'lucide-react';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase
                .from('categories')
                .select('*')
                .order('name');
            setCategories(data || []);
            setLoading(false);
        };
        fetchCategories();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-20 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 max-w-7xl">
            <div className="flex flex-col gap-2 mb-12">
                <Link href="/" className="inline-flex items-center gap-2 text-primary font-black mb-4 hover:translate-x-[-4px] transition-transform">
                    <ChevronLeft className="h-5 w-5" /> На главную
                </Link>
                <h1 className="text-5xl font-black tracking-tighter">Все категории</h1>
                <p className="text-muted font-bold">Найдите то, что нужно именно вам</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {categories.map((cat) => (
                    <Link
                        key={cat.slug}
                        href={`/category?slug=${cat.slug}`}
                        className="group relative h-48 rounded-[2rem] overflow-hidden border border-border bg-muted shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500"
                    >
                        {/* Full Card Image */}
                        <img
                            src={cat.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.name)}&background=f3f4f6&color=666&size=400`}
                            alt={cat.name}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(cat.name)}&background=f3f4f6&color=666&size=400`;
                            }}
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                        {/* Text Content */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                            <h3 className="text-white text-base font-black leading-tight drop-shadow-lg break-words">
                                {cat.name}
                            </h3>
                            <div className="w-8 h-1 bg-primary mt-2 rounded-full transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

