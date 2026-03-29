'use client';

import { Banner } from '@/lib/types';
import { ImageIcon, Trash2, Upload, MessageCircle, Megaphone, Smartphone, Star, Pencil, List, Layout, Type, Palette } from 'lucide-react';
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

const PRESET_GRADIENTS = [
    { id: 'blue', label: 'Синий', value: 'bg-gradient-to-r from-blue-600 to-blue-800' },
    { id: 'green', label: 'Зеленый', value: 'bg-gradient-to-r from-green-600 to-green-700' },
    { id: 'orange', label: 'Оранжевый', value: 'bg-gradient-to-r from-orange-500 to-orange-600' },
    { id: 'purple', label: 'Фиолетовый', value: 'bg-gradient-to-r from-purple-600 to-indigo-700' },
    { id: 'red', label: 'Красный', value: 'bg-gradient-to-r from-red-500 to-rose-600' },
    { id: 'dark', label: 'Темный', value: 'bg-gradient-to-r from-zinc-800 to-black' },
];

const PRESET_ICONS = [
    { id: 'MessageCircle', icon: MessageCircle },
    { id: 'Megaphone', icon: Megaphone },
    { id: 'Smartphone', icon: Smartphone },
    { id: 'Star', icon: Star },
    { id: 'ImageIcon', icon: ImageIcon },
];

export function BannersSection({ banners, onUpdate, bannersEnabled, setBannersEnabled }: BannersSectionProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [position, setPosition] = useState<'top' | 'sidebar'>('top');
    const [type, setType] = useState<'image' | 'text'>('image');
    const [buttonText, setButtonText] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(PRESET_GRADIENTS[0].value);
    const [iconName, setIconName] = useState('Megaphone');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState('');
    const [imageUrl, setImageUrl] = useState('');
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
            let finalImageUrl = imageFile ? '' : imageUrl.trim();

            if (type === 'image') {
                if (imageFile) {
                    const compressed = await compressImage(imageFile, 800, 0.7);
                    const fileName = `banner-${Date.now()}.jpg`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('images')
                        .upload(fileName, compressed);

                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
                    finalImageUrl = publicUrl;
                } else if (!finalImageUrl && editingBanner?.image_url) {
                    finalImageUrl = editingBanner.image_url;
                }

                if (!finalImageUrl) {
                    setLoading(false);
                    return toast.error('Загрузите изображение или укажите ссылку');
                }
            }

            const bannerData = {
                title: title.trim(),
                content: content.trim(),
                position,
                type,
                button_text: type === 'text' ? buttonText.trim() : null,
                background_color: type === 'text' ? backgroundColor : null,
                icon_name: type === 'text' ? iconName : null,
                image_url: type === 'image' ? finalImageUrl : null,
                link_url: linkUrl.trim(),
                is_active: true
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
        setImageUrl('');
        setPosition('top');
        setType('image');
        setButtonText('');
        setBackgroundColor(PRESET_GRADIENTS[0].value);
        setIconName('Megaphone');
        setEditingBanner(null);
    };

    const editBanner = (b: Banner) => {
        setEditingBanner(b);
        setTitle(b.title);
        setContent(b.content || '');
        setLinkUrl(b.link_url || '');
        setPosition(b.position || 'top');
        setType(b.type || 'image');
        setButtonText(b.button_text || '');
        setBackgroundColor(b.background_color || PRESET_GRADIENTS[0].value);
        setIconName(b.icon_name || 'Megaphone');
        setImageUrl(b.image_url || '');
        setImagePreview(b.image_url || '');
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

    const SelectedIconComp = PRESET_ICONS.find(i => i.id === iconName)?.icon || Megaphone;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between bg-white/80 p-5 rounded-[2rem] border border-primary/10 shadow-sm backdrop-blur-md">
                <div>
                    <h3 className="font-semibold text-sm uppercase tracking-widest text-primary">Рекламная панель</h3>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Управляйте контентом рекламных слотов</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Статус:</span>
                    <button
                        onClick={async () => {
                            const next = !bannersEnabled;
                            setBannersEnabled(next);
                            await supabase.from('app_settings').upsert({ key: 'banners_enabled', value: String(next) });
                            toast.success(next ? 'Баннеры включены' : 'Баннеры выключены');
                        }}
                        className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            bannersEnabled ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted"
                        )}
                    >
                        <div className={cn(
                            "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                            bannersEnabled ? "left-7" : "left-1"
                        )} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <form onSubmit={saveBanner} className="bg-white/80 backdrop-blur-md p-6 rounded-[2rem] border border-primary/10 shadow-sm space-y-4">
                        <h3 className="font-semibold text-xs uppercase tracking-widest mb-2 flex items-center gap-2 text-primary">
                            {editingBanner ? <Pencil className="h-4 w-4" /> : <Layout className="h-4 w-4" />}
                            {editingBanner ? 'Редактировать баннер' : 'Новое объявление'}
                        </h3>

                        {/* Banner Type Toggle */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Тип рекламы</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setType('image')}
                                    className={cn(
                                        "py-2.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all border",
                                        type === 'image' ? "bg-primary text-white border-primary shadow-md" : "bg-white text-muted-foreground border-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    <ImageIcon className="h-3 w-3" />
                                    Картинка
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('text')}
                                    className={cn(
                                        "py-2.5 rounded-xl flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all border",
                                        type === 'text' ? "bg-primary text-white border-primary shadow-md" : "bg-white text-muted-foreground border-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    <Type className="h-3 w-3" />
                                    Текст
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Заголовок</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-semibold shadow-sm"
                                placeholder="..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Текст описания</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium h-20 resize-none shadow-sm"
                                placeholder="..."
                            />
                        </div>

                        {type === 'text' && (
                            <>
                                <div className="space-y-1 font-semibold">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Надпись на кнопке</label>
                                    <input
                                        type="text"
                                        value={buttonText}
                                        onChange={(e) => setButtonText(e.target.value)}
                                        className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
                                        placeholder="Например: Вступить"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-2">
                                        <Palette className="h-3 w-3" /> Тема оформления
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {PRESET_GRADIENTS.map((g) => (
                                            <button
                                                key={g.id}
                                                type="button"
                                                onClick={() => setBackgroundColor(g.value)}
                                                className={cn(
                                                    "h-8 rounded-lg border-2 transition-all",
                                                    g.value,
                                                    backgroundColor === g.value ? "border-primary scale-105 shadow-md" : "border-white/10"
                                                )}
                                                title={g.label}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Иконка</label>
                                    <div className="flex flex-wrap gap-2">
                                        {PRESET_ICONS.map((iconObj) => (
                                            <button
                                                key={iconObj.id}
                                                type="button"
                                                onClick={() => setIconName(iconObj.id)}
                                                className={cn(
                                                    "p-2.5 rounded-xl border transition-all",
                                                    iconName === iconObj.id ? "bg-primary text-white border-primary shadow-md" : "bg-white text-muted-foreground border-primary/10"
                                                )}
                                            >
                                                <iconObj.icon className="h-4 w-4" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Ссылка для перехода</label>
                            <input
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                className="w-full bg-white border border-primary/20 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all font-medium shadow-sm"
                                placeholder="https://..."
                            />
                        </div>

                        <div className="space-y-1 pb-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Место показа</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setPosition('top')}
                                    className={cn(
                                        "py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                        position === 'top'
                                            ? "bg-primary text-white border-primary shadow-md"
                                            : "bg-white text-muted-foreground border-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    Верхний
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPosition('sidebar')}
                                    className={cn(
                                        "py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all border",
                                        position === 'sidebar'
                                            ? "bg-primary text-white border-primary shadow-md"
                                            : "bg-white text-muted-foreground border-primary/10 hover:border-primary/30"
                                    )}
                                >
                                    Боковой
                                </button>
                            </div>
                        </div>

                        {type === 'image' && (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-primary/60 ml-1">Ссылка на изображение</label>
                                    <input
                                        type="text"
                                        value={imageUrl}
                                        onChange={(e) => {
                                            setImageUrl(e.target.value);
                                            if (!imageFile) setImagePreview(e.target.value);
                                        }}
                                        className="w-full bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 transition-all shadow-sm"
                                        placeholder="/banners/test.svg"
                                    />
                                </div>

                                <div className="space-y-2 pt-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 text-center block opacity-50">Или загрузка файла</label>
                                    <label className="relative aspect-[2.4/1] rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden group">
                                        {imagePreview ? (
                                            <>
                                                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Upload className="text-white h-8 w-8" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-primary/60">
                                                <Upload className="h-7 w-7 mb-2 opacity-60" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Выбрать файл</span>
                                            </div>
                                        )}
                                        <input type="file" onChange={handleFileChange} className="hidden" accept="image/*" />
                                    </label>
                                </div>
                            </>
                        )}

                        <div className="flex gap-2 pt-2">
                            {editingBanner && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-3.5 bg-muted hover:bg-muted-foreground/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                                >
                                    Отмена
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-[2] py-3.5 bg-primary hover:bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
                            >
                                {loading ? 'Ждем...' : editingBanner ? 'Применить' : 'Создать'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-xs uppercase tracking-widest flex items-center gap-2 ml-1 text-muted-foreground">
                        <List className="h-4 w-4" />
                        Активные слоты ({banners.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map((banner) => (
                            <div key={banner.id} className="bg-white/80 backdrop-blur-md rounded-3xl border border-primary/10 overflow-hidden group hover:shadow-xl transition-all h-fit">
                                <div className="aspect-[2.5/1] relative overflow-hidden bg-primary/5">
                                    {banner.type === 'text' ? (
                                        <div className={cn("w-full h-full flex items-center p-4 relative", banner.background_color)}>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white shrink-0">
                                                    {(() => {
                                                        const Icon = PRESET_ICONS.find(i => i.id === banner.icon_name)?.icon || Megaphone;
                                                        return <Icon className="h-5 w-5" />;
                                                    })()}
                                                </div>
                                                <div className="text-white overflow-hidden">
                                                    <h4 className="font-bold text-xs line-clamp-1">{banner.title}</h4>
                                                    <p className="text-[9px] text-white/80 line-clamp-1 uppercase font-semibold">{banner.content}</p>
                                                    {banner.button_text && (
                                                        <div className="mt-1 px-2 py-0.5 bg-white text-primary text-[8px] font-bold w-fit rounded-lg shadow-sm">
                                                            {banner.button_text}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <img src={banner.image_url!} className={cn("w-full h-full object-cover transition-all", !banner.is_active && "grayscale opacity-50")} alt="" />
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-2 left-2 flex gap-1.5">
                                        <div className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-lg text-[8px] font-bold text-primary uppercase border border-primary/10 shadow-sm">
                                            {banner.position === 'sidebar' ? 'Боковой' : 'Верхний'}
                                        </div>
                                        {banner.type === 'text' && (
                                            <div className="px-2 py-0.5 bg-primary text-white rounded-lg text-[8px] font-bold uppercase shadow-sm">
                                                Текст
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => editBanner(banner)} className="p-2 bg-white/40 hover:bg-white/90 backdrop-blur-md text-primary rounded-xl transition-all shadow-sm">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => deleteBanner(banner.id)} className="p-2 bg-red-500/40 hover:bg-red-500 backdrop-blur-md text-white rounded-xl transition-all shadow-sm">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-3.5 flex items-center justify-between border-t border-border/40 bg-surface/30">
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                                            <Palette className="h-3 w-3 text-primary opacity-50" />
                                            {banner.clicks_count || 0} кликов
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleBannerActive(banner.id, !banner.is_active)}
                                        className={cn(
                                            "px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                                            banner.is_active ? "bg-green-500/10 text-green-600 border border-green-500/20" : "bg-red-500/10 text-red-600 border border-red-500/20"
                                        )}
                                    >
                                        {banner.is_active ? 'ВКЛ' : 'ВЫКЛ'}
                                    </button>
                                </div>
                            </div>
                        ))}
                        {banners.length === 0 && (
                            <div className="col-span-full py-16 text-center bg-surface rounded-[2.5rem] border-2 border-dashed border-border/40">
                                <ImageIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground/20" />
                                <p className="text-muted-foreground font-bold text-xs uppercase tracking-widest">Нет активных баннеров</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

