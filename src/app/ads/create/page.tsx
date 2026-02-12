'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, X, Briefcase, Wrench, MapPin, PlusSquare, Rocket, Navigation, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import { getCurrentCity } from '@/lib/geo';

const MapPicker = dynamic(() => import('@/components/MapPicker'), {
    ssr: false,
    loading: () => <div className="h-[300px] w-full bg-muted animate-pulse rounded-3xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest text-muted-foreground opacity-50">Загрузка карты...</div>
});

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport' },
    { name: 'Недвижимость', slug: 'real-estate' },
    { name: 'Работа', slug: 'jobs' },
    { name: 'Услуги', slug: 'services' },
    { name: 'Электроника', slug: 'electronics' },
    { name: 'Дом и дача', slug: 'home' },
    { name: 'Одежда', slug: 'clothing' },
    { name: 'Запчасти', slug: 'parts' },
    { name: 'Хобби', slug: 'hobby' },
    { name: 'Животные', slug: 'pets' },
    { name: 'Красота', slug: 'beauty' },
    { name: 'Детское', slug: 'kids' },
];

export default function CreateAdPage() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [price, setPrice] = useState('');
    const [salaryFrom, setSalaryFrom] = useState('');
    const [salaryTo, setSalaryTo] = useState('');
    const [category, setCategory] = useState('');
    const [city, setCity] = useState('Горячий Ключ');
    const [cities, setCities] = useState<any[]>([]);
    const [condition, setCondition] = useState('used');
    const [delivery, setDelivery] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [specifications, setSpecifications] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [limitReached, setLimitReached] = useState(false);

    const router = useRouter();

    useEffect(() => {
        checkUser();
        fetchCities();
    }, []);

    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Сначала нужно войти в аккаунт');
            router.push('/login');
        }
    };

    const fetchCities = async () => {
        const { data } = await supabase.from('cities').select('name').order('is_default', { ascending: false });
        if (data) setCities(data);
    };

    const handleLocate = async () => {
        const toastId = toast.loading('Определяем город...');
        const detectedCity = await getCurrentCity();
        if (detectedCity) {
            setCity(detectedCity);
            toast.success(`Ваш город: ${detectedCity}`, { id: toastId });
        } else {
            toast.error('Не удалось определить город', { id: toastId });
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 3) {
            toast.error('Максимум 3 изображения');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Сжатие изображений...');
        try {
            const processedFiles: File[] = [];
            const urls: string[] = [];
            for (const file of files) {
                const compressed = await compressImage(file);
                processedFiles.push(compressed);
                urls.push(URL.createObjectURL(compressed));
            }
            setImages([...images, ...processedFiles]);
            setPreviewUrls([...previewUrls, ...urls]);
            toast.success('Готово', { id: toastId });
        } catch (err) {
            toast.error('Ошибка обработки', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!title || !category || !description) {
            toast.error('Заполните обязательные поля');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Создаем объявление...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Пользователь не авторизован');

            const uploadedImageUrls: string[] = [];
            for (const file of images) {
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const filePath = `${session.user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('ad-images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(filePath);
                uploadedImageUrls.push(publicUrl);
            }

            const { data: catData } = await supabase.from('categories').select('id').eq('slug', category).single();
            if (!catData) throw new Error('Категория не найдена');

            const { error: insertError } = await supabase.from('ads').insert({
                user_id: session.user.id,
                category_id: catData.id,
                title,
                description,
                price: category === 'jobs' ? null : (price ? parseFloat(price) : null),
                salary_from: category === 'jobs' ? (salaryFrom ? parseFloat(salaryFrom) : null) : null,
                salary_to: category === 'jobs' ? (salaryTo ? parseFloat(salaryTo) : null) : null,
                city,
                address,
                delivery_possible: delivery,
                images: uploadedImageUrls,
                status: 'active', // For now, direct post
                condition: (category === 'jobs' || category === 'services') ? 'new' : condition,
                specifications,
                latitude: lat,
                longitude: lng
            });

            if (insertError) throw insertError;

            toast.success('Объявление опубликовано!', { id: toastId });
            router.push('/');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (limitReached) {
        return (
            <div className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
                <AlertCircle className="h-16 w-16 text-destructive mb-6" />
                <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">Лимит достигнут</h1>
                <p className="text-muted-foreground mb-8 font-medium">Вы достигли предела бесплатных объявлений. Обратитесь в поддержку для расширения.</p>
                <a href="https://t.me/HT_Elk" className="bg-primary text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-95 transition-all">Написать админу</a>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl pb-32">
            <h1 className="text-3xl md:text-5xl font-black mb-8 tracking-tighter flex items-center gap-4">
                Подать объявление
                <CheckCircle2 className="h-8 w-8 text-primary opacity-20" />
            </h1>

            <div className="space-y-8">
                {/* Section 1: Categories */}
                <section className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Briefcase className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Категория</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.slug}
                                onClick={() => setCategory(cat.slug)}
                                className={cn(
                                    "px-3 py-3.5 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all text-center flex flex-col items-center justify-center gap-1",
                                    category === cat.slug
                                        ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]"
                                        : "border-border bg-surface hover:border-primary/50 text-muted-foreground"
                                )}
                            >
                                <span>{cat.name}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section 2: Photos */}
                <section className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                            <Camera className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Фотографии</h2>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        {previewUrls.map((url, index) => (
                            <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm group">
                                <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <button
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full shadow-lg active:scale-90"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                        {images.length < 3 && (
                            <label className="relative aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 hover:border-primary/50 transition-all text-muted-foreground active:scale-95 group">
                                <PlusSquare className="h-8 w-8 opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Добавить</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        )}
                    </div>
                </section>

                {/* Section 3: Details */}
                <section className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Wrench className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Описание</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Заголовок</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-14 px-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-bold text-lg transition-all"
                                placeholder="Например: iPhone 13 Pro"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {category === 'jobs' ? (
                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">З/П От</label>
                                        <input type="number" value={salaryFrom} onChange={(e) => setSalaryFrom(e.target.value)} className="w-full h-14 px-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-black text-xl transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">З/П До</label>
                                        <input type="number" value={salaryTo} onChange={(e) => setSalaryTo(e.target.value)} className="w-full h-14 px-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-black text-xl transition-all" />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Цена (₽)</label>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            className="w-full h-14 px-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-black text-xl transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Состояние</label>
                                        <div className="flex bg-muted p-1 rounded-2xl h-14">
                                            <button onClick={() => setCondition('used')} className={cn("flex-1 rounded-xl text-[10px] font-black uppercase transition-all", condition === 'used' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}>Б/У</button>
                                            <button onClick={() => setCondition('new')} className={cn("flex-1 rounded-xl text-[10px] font-black uppercase transition-all", condition === 'new' ? "bg-white shadow-sm text-primary" : "text-muted-foreground")}>Новое</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Подробное описание</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full p-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-medium text-lg min-h-[160px] transition-all resize-none"
                                placeholder="Расскажите подробнее о товаре..."
                            />
                        </div>
                    </div>
                </section>

                {/* Section 4: Location */}
                <section className="bg-surface border border-border rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                            <MapPin className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Локация</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Город</label>
                                <div className="relative group/city">
                                    <select
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        className="w-full h-14 px-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-bold text-lg appearance-none transition-all"
                                    >
                                        {cities.map((c) => (
                                            <option key={c.name} value={c.name}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">&nbsp;</label>
                                <button
                                    onClick={handleLocate}
                                    className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-primary/5 active:scale-95 transition-all"
                                >
                                    <Navigation className="h-4 w-4" />
                                    Моё местоположение
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-2 tracking-[0.2em] ml-1">Адрес</label>
                            <input
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                className="w-full h-14 px-5 rounded-2xl bg-surface border border-border outline-none focus:border-primary font-bold text-lg transition-all"
                                placeholder="Улица, дом..."
                            />
                        </div>

                        <div className="rounded-3xl overflow-hidden border border-border">
                            <MapPicker onChange={(pos: [number, number]) => {
                                setLat(pos[0]);
                                setLng(pos[1]);
                            }} />
                        </div>
                    </div>
                </section>
            </div>

            {/* Bottom sticky wrapper for button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border z-50 md:static md:bg-transparent md:border-none md:p-0 md:mt-12">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full h-16 md:h-20 bg-primary text-white rounded-2xl md:rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-white" />
                        ) : (
                            <>
                                <Rocket className="h-6 w-6" />
                                <span>Опубликовать</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
