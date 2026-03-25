'use client';

import { Banner } from '@/lib/types';
import { ImageIcon, Trash2, ShieldCheck, Upload, X, MoreHorizontal, MousePointerClick, Eye, Pencil, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';
import { compressImage } from '@/lib/image-utils';

interface BannersSectionProps {
    banners: Banner[];
    onUpdate: () => Promise<void>;
    bannersEnabled: boolean;
    setBannersEnabled: (v: boolean) => void;
}

export function BannersSection({ banners, onUpdate, bannersEnabled, setBannersEnabled }: BannersSectionProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const saveBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return toast.error('Введите название');
        setLoading(true);

        try {
            let imageUrl = editingBanner?.image_url || '';

            if (imageFile) {
                const compressed = await compressImage(imageFile, 800, 0.7);
                const fileName = `banner-${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(fileName, compressed);

                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            const bannerData = {
                title: title.trim(),
                content: content.trim(),
                image_url: imageUrl,
                link_url: linkUrl.trim(),
                is_active: true,
                sort_order: editingBanner?.sort_order || 0
            };

            if (editingBanner) {
                const { error } = await supabase.from('banners').update(bannerData).eq('id', editingBanner.id);
                if (error) throw error;
                toast.success('Баннер обновлен');
            } else {
                const { error } = await supabase.from('banners').insert([bannerData]);
                if (error) throw error;
                toast.success('Баннер добавлен');
            }

            resetForm();
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setContent('');
        setLinkUrl('');
        setImageFile(null);
        setImagePreview('');
        setEditingBanner(null);
    };

    const editBanner = (b: Banner) => {
        setEditingBanner(b);
        setTitle(b.title);
        setContent(b.content || '');
        setLinkUrl(b.link_url || '');
        setImagePreview(b.image_url);
    };

    const deleteBanner = async (id: string) => {
        if (!confirm('Удалить баннер?')) return;
        try {
            const { error } = await supabase.from('banners').delete().eq('id', id);
            if (error) throw error;
            toast.success('Баннер удален');
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    const toggleBannerActive = async (id: string, active: boolean) => {
        try {
            const { error } = await supabase.from('banners').update({ is_active: active }).eq('id', id);
            if (error) throw error;
            await onUpdate();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-border/40">
                <div>
                    <h3 className="font-semibold text-sm uppercase tracking-widest">Отображение рекламы</h3>
                    <p className="text-xs text-muted-foreground">Включить или выключить баннеры на главной</p>
                </div>
                <button
                    onClick={async () => {
                        const next = !bannersEnabled;
                        setBannersEnabled(next);
                        await supabase.from('app_settings').upsert({ key: 'banners_enabled', value: String(next) });
                        toast.success(next ? 'Баннеры включены' : 'Баннеры выключены');
                    }}
                    className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        bannersEnabled ? "bg-primary" : "bg-muted"
                    )}
                >
                    <div className={cn(
                        "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                        bannersEnabled ? "left-7" : "left-1"
                    )} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <form onSubmit={saveBanner} className="bg-surface p-6 rounded-2xl border border-border/40 space-y-4">
                        <h3 className="font-semibold text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                            {editingBanner ? <Pencil className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                            {editingBanner ? 'Редактировать' : 'Новый баннер'}
                        </h3>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground ml-1">Заголовок</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-semibold"
                                placeholder="Заголовок баннера..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground ml-1">Описание (опционально)</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium h-20 resize-none"
                                placeholder="Текст под заголовком..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground ml-1">Ссылка</label>
                            <input
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="w-full bg-muted/50 border border-border/40 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                placeholder="https://..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-semibold uppercase text-muted-foreground ml-1 text-center block">Изображение</label>
                            <label className="relative aspect-[2/1] rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/40 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="text-white h-8 w-8" />
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center text-muted-foreground">
                                        <Upload className="h-8 w-8 mb-2 opacity-50" />
                                        <span className="text-[10px] font-semibold uppercase tracking-widest">Загрузить фото</span>
                                    </div>
                                )}
                                <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                            </label>
                        </div>

                        <div className="flex gap-2 pt-2">
                            {editingBanner && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-3 bg-muted hover:bg-muted-foreground/10 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all"
                                >
                                    Отмена
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-semibold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Сохранение...' : editingBanner ? 'Сохранить' : 'Добавить'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-xs uppercase tracking-widest flex items-center gap-2 ml-1">
                        <List className="h-4 w-4" />
                        Активные баннеры ({banners.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map((banner) => (
                            <div key={banner.id} className="bg-surface rounded-2xl border border-border/40 overflow-hidden group hover:shadow-xl transition-all h-fit">
                                <div className="aspect-[2.4/1] relative overflow-hidden bg-muted">
                                    <img src={banner.image_url} className={cn("w-full h-full object-cover transition-all", !banner.is_active && "grayscale opacity-50")} alt="" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                                        <h4 className="text-white font-semibold text-sm line-clamp-1">{banner.title}</h4>
                                        <p className="text-white/60 text-[10px] line-clamp-1">{banner.content || 'Нет описания'}</p>
                                    </div>
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => editBanner(banner)} className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-lg transition-all">
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => deleteBanner(banner.id)} className="p-2 bg-red-500/20 hover:bg-red-500/80 backdrop-blur-md text-white rounded-lg transition-all">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3 flex items-center justify-between border-t border-border/40">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                                            <Eye className="h-3 w-3 text-primary" />
                                            {banner.impressions_count || 0}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase">
                                            <MousePointerClick className="h-3 w-3 text-orange-500" />
                                            {banner.clicks_count || 0}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleBannerActive(banner.id, !banner.is_active)}
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-[8px] font-semibold uppercase tracking-widest transition-all",
                                            banner.is_active ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                        )}
                                    >
                                        {banner.is_active ? 'Активен' : 'Пауза'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {banners.length === 0 && (
                            <div className="col-span-full py-12 text-center bg-surface rounded-2xl border-2 border-dashed border-border/40">
                                <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                                <p className="text-muted-foreground font-semibold text-sm">Баннеров пока нет</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
