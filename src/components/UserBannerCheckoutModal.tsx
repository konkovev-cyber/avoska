'use client';

import { useState } from 'react';
import { X, Sparkles, Image as ImageIcon, Link2, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import ImageCropperModal from '@/components/ui/ImageCropperModal';

interface BannerCheckoutModalProps {
    position: 'top' | 'sidebar';
    onClose: () => void;
}

export default function BannerCheckoutModal({ position, onClose }: BannerCheckoutModalProps) {
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setCropImageSrc(reader.result as string);
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        const file = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setImageFile(file);
        setCropImageSrc(null);
    };

    const price = position === 'top' ? 1000 : 500;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !linkUrl.trim() || !imageFile) {
            toast.error('Заполните все поля и выберите картинку');
            return;
        }

        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Войдите в аккаунт');
                setLoading(false);
                return;
            }

            // 1. Загружаем картинку в bucket (используем images)
            const fileName = `banner-user-${session.user.id}-${Date.now()}.jpg`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, imageFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

            // 2. Создаем платеж со специальным packageType
            const packageType = position === 'top' ? 'banner_top_7_days' : 'banner_sidebar_7_days';

            const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                },
                body: JSON.stringify({
                    adId: null, // Для баннеров adId не нужен, но апи ждет ключ
                    packageType,
                    bannerData: {
                        title: title.trim(),
                        link_url: linkUrl.trim(),
                        image_url: publicUrl,
                        position: position
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка при создании платежа');
            }

            if (data.confirmationUrl) {
                window.location.href = data.confirmationUrl;
            } else {
                throw new Error('Ссылка на оплату не получена');
            }

        } catch (error: any) {
            console.error('Banner checkout error:', error);
            toast.error(error.message || 'Ошибка. Попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1002] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
            <form onSubmit={handleSubmit} className="bg-background w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-border flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">Реклама <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" /></h2>
                        <p className="text-xs text-muted-foreground font-semibold mt-1">Официальное размещение (7 дней)</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors active:scale-90">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200 dark:border-amber-900 mb-6">
                        <h3 className="font-bold text-amber-800 dark:text-amber-500 text-sm">Тариф: {position === 'top' ? 'Верхний Баннер' : 'Боковой Баннер'}</h3>
                        <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1 font-medium">Вашу рекламу увидят тысячи пользователей платформы.</p>
                        <div className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-500">{price} ₽ <span className="text-xs text-amber-700/50 uppercase tracking-widest">/ неделя</span></div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Заголовок (до 50 симв.)</label>
                        <input
                            required
                            maxLength={50}
                            placeholder="Например: Скидка 50% на кухни"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1"><Link2 className="w-3 h-3" /> Ссылка</label>
                        <input
                            required
                            type="url"
                            placeholder="https://..."
                            value={linkUrl}
                            onChange={e => setLinkUrl(e.target.value)}
                            className="w-full bg-surface border border-border/50 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-semibold"
                        />
                    </div>

                    <div className="space-y-1.5 pt-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Изображение ({position === 'top' ? 'Широкое 16:9' : 'Боковое 4:3'})</label>
                        <label className="h-28 border-2 border-dashed border-border hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative">
                            {imageFile ? (
                                <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover opacity-80" />
                            ) : (
                                <>
                                    <ImageIcon className="h-6 w-6 text-muted-foreground mb-2" />
                                    <span className="text-xs font-semibold text-muted-foreground max-w-[200px] text-center">Нажмите, чтобы выбрать файл</span>
                                </>
                            )}
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </label>
                    </div>
                </div>

                <div className="p-4 md:p-6 bg-surface/50 border-t border-border shrink-0">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase tracking-widest text-xs shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                            <>Оплатить {price} ₽ <ExternalLink className="h-3 w-3" /></>
                        )}
                    </button>
                    <p className="text-[9px] text-muted-foreground text-center font-semibold pt-3 leading-relaxed">
                        Безопасная оплата через ЮKassa.<br />Баннер активируется сразу после успешной оплаты.
                    </p>
                </div>
            </form>

            {cropImageSrc && (
                <ImageCropperModal
                    imageSrc={cropImageSrc}
                    aspectRatio={position === 'top' ? 21 / 9 : 4 / 3}
                    onClose={() => setCropImageSrc(null)}
                    onCropComplete={handleCropComplete}
                />
            )}
        </div>
    );
}
