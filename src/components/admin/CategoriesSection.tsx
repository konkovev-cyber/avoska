'use client';

import { AdCategory } from '@/lib/types';
import { Pencil, Trash2, Plus, ImageIcon, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';
import { compressImage } from '@/lib/image-utils';

interface CategoriesSectionProps {
    categories: AdCategory[];
    onUpdate: () => Promise<void>;
}

export function CategoriesSection({ categories, onUpdate }: CategoriesSectionProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return toast.error('Введите название');
        setLoading(true);

        try {
            let imageUrl = editingCategory?.image || '';
            const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            if (imageFile) {
                const compressed = await compressImage(imageFile, 400, 0.8);
                const fileName = `cat-${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage.from('images').upload(fileName, compressed);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            const catData = { name: name.trim(), slug: finalSlug, image: imageUrl };

            if (editingCategory) {
                const { error } = await supabase.from('categories').update(catData).eq('id', editingCategory.id);
                if (error) throw error;
                toast.success('Обновлено');
            } else {
                const { error } = await supabase.from('categories').insert([catData]);
                if (error) throw error;
                toast.success('Добавлено');
            }

            setName(''); setSlug(''); setImageFile(null); setImagePreview(''); setEditingCategory(null);
            await onUpdate();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <form onSubmit={handleSave} className="bg-surface p-6 rounded-2xl border border-border/40 space-y-4 shadow-sm">
                    <h3 className="font-semibold text-xs uppercase tracking-widest">{editingCategory ? 'Редактировать' : 'Новая категория'}</h3>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Название..." className="w-full bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm" />
                    <input value={slug} onChange={e => setSlug(e.target.value)} placeholder="Slug (опционально)..." className="w-full bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm" />
                    <label className="block aspect-square relative rounded-2xl border-2 border-dashed border-border/60 overflow-hidden cursor-pointer hover:border-primary/40 transition-all">
                         {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="" /> : <div className="flex flex-col items-center justify-center h-full text-muted-foreground"><Upload className="h-6 w-6 mb-1"/> <span className="text-[10px] font-semibold uppercase">Иконка</span></div>}
                         <input type="file" className="hidden" onChange={e => {
                             const f = e.target.files?.[0];
                             if (f) { setImageFile(f); const r = new FileReader(); r.onloadend = () => setImagePreview(r.result as string); r.readAsDataURL(f); }
                         }} />
                    </label>
                    <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                        {loading ? '...' : (editingCategory ? 'Сохранить' : 'Добавить')}
                    </button>
                    {editingCategory && <button type="button" onClick={() => { setEditingCategory(null); setName(''); setSlug(''); setImagePreview(''); }} className="w-full py-2 text-xs font-semibold text-muted-foreground uppercase">Отмена</button>}
                </form>
            </div>
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map(cat => (
                    <div key={cat.id} className="bg-surface rounded-2xl border border-border/40 p-3 group hover:shadow-lg transition-all text-center">
                        <img src={(cat as any).image} className="w-12 h-12 mx-auto rounded-xl object-cover mb-2" alt="" />
                        <p className="text-xs font-semibold uppercase tracking-tight truncate">{cat.name}</p>
                        <div className="flex justify-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingCategory(cat); setName(cat.name); setSlug(cat.slug); setImagePreview((cat as any).image); }} className="p-1.5 hover:bg-primary/10 text-primary rounded-lg"><Pencil className="h-3.5 w-3.5"/></button>
                            <button onClick={async () => { if(confirm('Удалить?')) { await supabase.from('categories').delete().eq('id', cat.id); onUpdate(); } }} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-lg"><Trash2 className="h-3.5 w-3.5"/></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
