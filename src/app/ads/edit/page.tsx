'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { X, AlertCircle, PlusSquare, Rocket, CheckCircle2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import ResponsiveSelect from '@/components/ui/ResponsiveSelect';

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport' },
    { name: 'Недвижимость', slug: 'real-estate' },
    { name: 'Аренда квартир', slug: 'rent-apartments' },
    { name: 'Аренда коммерции', slug: 'rent-commercial' },
    { name: 'Услуги', slug: 'services' },
    { name: 'Работа', slug: 'jobs' },
    { name: 'Аренда авто', slug: 'rent-cars' },
    { name: 'Аренда инструмента', slug: 'rent-tools' },
    { name: 'Электроника', slug: 'electronics' },
    { name: 'Дом и дача', slug: 'home' },
    { name: 'Одежда', slug: 'clothing' },
    { name: 'Запчасти', slug: 'parts' },
    { name: 'Хобби', slug: 'hobby' },
    { name: 'Животные', slug: 'pets' },
    { name: 'Красота', slug: 'beauty' },
    { name: 'Детское', slug: 'kids' },
];

function EditAdContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fields
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [address, setAddress] = useState('');
    const [price, setPrice] = useState('');
    const [salaryFrom, setSalaryFrom] = useState('');
    const [salaryTo, setSalaryTo] = useState('');
    const [category, setCategory] = useState('');
    const [city, setCity] = useState('');
    const [cities, setCities] = useState<any[]>([]);
    const [condition, setCondition] = useState('used');
    const [delivery, setDelivery] = useState(false);
    const [specifications, setSpecifications] = useState<Record<string, string>>({});

    // Images
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImages, setNewImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);

    useEffect(() => {
        if (!id) {
            router.push('/profile');
            return;
        }
        checkUserAndFetchAd();
        fetchCities();
    }, [id]);

    const checkUserAndFetchAd = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Сначала нужно войти в аккаунт');
            router.push('/login');
            return;
        }

        const { data: ad, error } = await supabase
            .from('ads')
            .select('*, categories(slug)')
            .eq('id', id)
            .single();

        if (error || !ad) {
            setError('Объявление не найдено или у вас нет прав на его редактирование');
            setLoading(false);
            return;
        }

        if (ad.user_id !== session.user.id) {
            setError('У вас нет прав на редактирование этого объявления');
            setLoading(false);
            return;
        }

        // Populate fields
        setTitle(ad.title);
        setDescription(ad.description);
        setAddress(ad.address || '');
        setPrice(ad.price ? String(ad.price) : '');
        setSalaryFrom(ad.salary_from ? String(ad.salary_from) : '');
        setSalaryTo(ad.salary_to ? String(ad.salary_to) : '');
        setCategory(ad.categories?.slug || '');
        setCity(ad.city);
        setCondition(ad.condition || 'used');
        setDelivery(ad.delivery_possible || false);
        setSpecifications(ad.specifications || {});
        setExistingImages(ad.images || []);

        setLoading(false);
    };

    const fetchCities = async () => {
        const { data } = await supabase.from('cities').select('name').order('is_default', { ascending: false });
        if (data) setCities(data);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (existingImages.length + newImages.length + files.length > 5) {
            toast.error('Максимум 5 изображений');
            return;
        }

        const toastId = toast.loading('Сжатие изображений...');
        try {
            const processedFiles: File[] = [];
            const urls: string[] = [];
            for (const file of files) {
                const compressed = await compressImage(file);
                processedFiles.push(compressed);
                urls.push(URL.createObjectURL(compressed));
            }
            setNewImages([...newImages, ...processedFiles]);
            setPreviewUrls([...previewUrls, ...urls]);
            toast.success('Готово', { id: toastId });
        } catch (err) {
            toast.error('Ошибка обработки', { id: toastId });
        } finally {
            toast.dismiss(toastId);
        }
    };

    const removeExistingImage = (index: number) => {
        setExistingImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeNewImage = (index: number) => {
        setNewImages(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!title || !category || !description) {
            toast.error('Заполните обязательные поля');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Обновляем объявление...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Пользователь не авторизован');

            const uploadedImageUrls: string[] = [];
            for (const file of newImages) {
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
                const filePath = `${session.user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('ad-images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(filePath);
                uploadedImageUrls.push(publicUrl);
            }

            const finalImages = [...existingImages, ...uploadedImageUrls];

            const { data: catData } = await supabase.from('categories').select('id').eq('slug', category).single();
            if (!catData) throw new Error('Категория не найдена');

            const { error: updateError } = await supabase.from('ads').update({
                category_id: catData.id,
                title,
                description,
                price: category === 'jobs' ? null : (price ? parseFloat(price) : null),
                salary_from: category === 'jobs' ? (salaryFrom ? parseFloat(salaryFrom) : null) : null,
                salary_to: category === 'jobs' ? (salaryTo ? parseFloat(salaryTo) : null) : null,
                city,
                address,
                delivery_possible: delivery,
                images: finalImages,
                condition: (category === 'jobs' || category === 'services') ? 'new' : condition,
                specifications
            }).eq('id', id);

            if (updateError) throw updateError;

            toast.success('Объявление обновлено!', { id: toastId });
            router.push('/profile');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    if (error) return (
        <div className="container mx-auto px-4 py-20 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-black mb-4 uppercase tracking-tighter">Ошибка</h1>
            <p className="text-muted-foreground font-medium">{error}</p>
            <button onClick={() => router.back()} className="mt-8 text-primary font-black uppercase text-xs tracking-widest hover:underline">Вернуться назад</button>
        </div>
    );

    return (
        <div className="container mx-auto px-2 md:px-4 py-2 max-w-3xl pb-24">
            <div className="bg-surface border border-border rounded-[2rem] p-4 md:p-6 shadow-2xl shadow-black/5">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                        title="Назад"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                        <Rocket className="h-5 w-5 text-primary" />
                        Редактировать
                    </h1>
                </div>

                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Заголовок</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-bold transition-all placeholder:font-medium placeholder:text-muted-foreground/50"
                                placeholder="Например: Велосипед"
                            />
                        </div>
                        <div className="space-y-1">
                            <ResponsiveSelect
                                label="Категория"
                                value={category}
                                onChange={setCategory}
                                options={CATEGORIES.map(c => ({ value: c.slug, label: c.name }))}
                                placeholder="Выберите категорию"
                            />
                        </div>
                    </div>

                    {/* Price & [Condition + Delivery] Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {category === 'jobs' ? (
                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">З/П От</label>
                                    <input type="number" value={salaryFrom} onChange={(e) => setSalaryFrom(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-black transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">З/П До</label>
                                    <input type="number" value={salaryTo} onChange={(e) => setSalaryTo(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-black transition-all" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Цена (₽)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value.replace(/^-/, ''))}
                                        className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-black text-lg transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    {!(category === 'services' || category === 'rent-commercial' || (category === 'real-estate' && (specifications.type === 'house' || specifications.type === 'plot'))) && (
                                        <div className="flex-1 space-y-1">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1 truncate block text-center md:text-left">
                                                {(category === 'real-estate' && specifications.type === 'apartment') || category === 'rent-apartments' ? 'Жильё' : 'Состояние'}
                                            </label>
                                            <div className="flex bg-muted/10 p-1 rounded-xl h-11 border border-border/40 w-full relative">
                                                {(category === 'real-estate' && specifications.type === 'apartment') || category === 'rent-apartments' ? (
                                                    <>
                                                        <button onClick={() => setCondition('secondary')} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center z-10", condition === 'secondary' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Втор</button>
                                                        <button onClick={() => setCondition('new_building')} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center z-10", condition === 'new_building' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Нов</button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => setCondition('used')} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center z-10", condition === 'used' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Б/У</button>
                                                        <button onClick={() => setCondition('new')} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center z-10", condition === 'new' ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Нов</button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="w-[120px] space-y-1">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1 block text-center md:text-left">Доставка</label>
                                        <div className="flex bg-muted/10 p-1 rounded-xl h-11 border border-border/40 w-full">
                                            <button onClick={() => setDelivery(false)} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center", !delivery ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Нет</button>
                                            <button onClick={() => setDelivery(true)} className={cn("flex-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center", delivery ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Да</button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Specifications (Conditional) */}
                    {(category === 'transport' || category === 'real-estate' || category === 'rent-apartments' || category === 'rent-commercial' || category === 'rent-cars') && (
                        <div className="bg-white rounded-2xl p-4 border border-border shadow-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Характеристики</h3>

                            {(category === 'transport' || category === 'rent-cars') && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Марка</label>
                                        <input type="text" placeholder="Toyota" value={specifications.brand || ''} onChange={(e) => setSpecifications({ ...specifications, brand: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Год</label>
                                        <input type="number" placeholder="2020" value={specifications.year || ''} onChange={(e) => setSpecifications({ ...specifications, year: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                    </div>
                                    {category === 'transport' && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Пробег</label>
                                            <input type="number" placeholder="50000" value={specifications.mileage || ''} onChange={(e) => setSpecifications({ ...specifications, mileage: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">КПП</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSpecifications({ ...specifications, transmission: 'auto' })}
                                                className={cn(
                                                    "py-2 rounded-lg text-[10px] font-black uppercase transition-all border",
                                                    specifications.transmission === 'auto' ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/50"
                                                )}
                                            >
                                                Автомат
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSpecifications({ ...specifications, transmission: 'manual' })}
                                                className={cn(
                                                    "py-2 rounded-lg text-[10px] font-black uppercase transition-all border",
                                                    specifications.transmission === 'manual' ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/50"
                                                )}
                                            >
                                                Механика
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(category === 'real-estate' || category === 'rent-apartments' || category === 'rent-commercial') && (
                                <div className="space-y-3">
                                    {(category === 'rent-apartments' || category === 'rent-commercial') && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Срок аренды</label>
                                            <div className="flex bg-white p-1 rounded-lg border border-border">
                                                <button onClick={() => setSpecifications({ ...specifications, rent_type: 'daily' })} className={cn("flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all", specifications.rent_type === 'daily' ? "bg-primary text-white" : "text-muted-foreground")}>Посуточно</button>
                                                <button onClick={() => setSpecifications({ ...specifications, rent_type: 'long_term' })} className={cn("flex-1 py-2 rounded-md text-[10px] font-black uppercase transition-all", specifications.rent_type === 'long_term' ? "bg-primary text-white" : "text-muted-foreground")}>На долгий срок</button>
                                            </div>
                                        </div>
                                    )}
                                    {category === 'real-estate' && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Тип недвижимости</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { value: 'apartment', label: 'Квартира' },
                                                    { value: 'house', label: 'Дом' },
                                                    { value: 'plot', label: 'Участок' },
                                                    { value: 'commercial', label: 'Коммерция' }
                                                ].map(t => (
                                                    <button
                                                        key={t.value}
                                                        type="button"
                                                        onClick={() => setSpecifications({ ...specifications, type: t.value })}
                                                        className={cn(
                                                            "py-2 rounded-lg text-[9px] font-black uppercase transition-all border",
                                                            specifications.type === t.value ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/50"
                                                        )}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(specifications.type === 'apartment' || category === 'rent-apartments') && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Комнат</label>
                                                <div className="grid grid-cols-5 gap-1">
                                                    {['studio', '1', '2', '3', '4+'].map(r => (
                                                        <button
                                                            key={r}
                                                            type="button"
                                                            onClick={() => setSpecifications({ ...specifications, rooms: r })}
                                                            className={cn(
                                                                "py-1.5 rounded text-[9px] font-black uppercase transition-all border",
                                                                specifications.rooms === r ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/50"
                                                            )}
                                                        >
                                                            {r}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Площадь (м²)</label>
                                                <input type="number" value={specifications.area || ''} onChange={(e) => setSpecifications({ ...specifications, area: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                            </div>
                                        </div>
                                    )}
                                    {(specifications.type === 'commercial' || category === 'rent-commercial') && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Площадь (м²)</label>
                                            <input type="number" value={specifications.area || ''} onChange={(e) => setSpecifications({ ...specifications, area: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                        </div>
                                    )}
                                    {specifications.type === 'house' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Дом (м²)</label>
                                                <input type="number" value={specifications.house_area || ''} onChange={(e) => setSpecifications({ ...specifications, house_area: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Участок (сот)</label>
                                                <input type="number" value={specifications.plot_area || ''} onChange={(e) => setSpecifications({ ...specifications, plot_area: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                            </div>
                                        </div>
                                    )}
                                    {specifications.type === 'plot' && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Участок (сот)</label>
                                            <input type="number" value={specifications.plot_area || ''} onChange={(e) => setSpecifications({ ...specifications, plot_area: e.target.value })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Описание</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 md:p-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium text-sm min-h-[120px] transition-all resize-none placeholder:text-muted-foreground/50 leading-relaxed"
                            placeholder="Опишите товар подробнее..."
                        />
                    </div>

                    {/* Photos */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Фотографии</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            <label className="relative w-20 h-20 shrink-0 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:bg-muted/10 hover:border-primary/50 transition-all text-muted-foreground active:scale-95 group bg-background">
                                <PlusSquare className="h-5 w-5 opacity-40 group-hover:text-primary group-hover:opacity-100 transition-all" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-center">Добавить</span>
                                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>

                            {/* Existing Images */}
                            {existingImages.map((url, index) => (
                                <div key={`existing-${index}`} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-border/60 shadow-sm group bg-background animate-in fade-in zoom-in-95">
                                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <button
                                        onClick={() => removeExistingImage(index)}
                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                    {/* Small indicator for old images */}
                                    <div className="absolute bottom-0 inset-x-0 h-1 bg-primary/20" />
                                </div>
                            ))}

                            {/* New Images */}
                            {previewUrls.map((url, index) => (
                                <div key={`new-${index}`} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-border/60 shadow-sm group bg-background animate-in fade-in zoom-in-95">
                                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <button
                                        onClick={() => removeNewImage(index)}
                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                    <div className="absolute bottom-0 inset-x-0 h-1 bg-green-500/50" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Location Row (Compact Group) */}
                    <div className="bg-white rounded-2xl p-4 border border-border shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <ResponsiveSelect
                                    label="Город"
                                    value={city}
                                    onChange={setCity}
                                    options={cities.map(c => ({ value: c.name, label: c.name }))}
                                    placeholder="Выберите город"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Адрес (необязательно)</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full h-10 px-3 rounded-lg bg-surface border border-border outline-none focus:border-primary font-bold text-sm transition-all placeholder:font-normal"
                                    placeholder="Улица, дом"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex gap-3">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="flex-1 h-14 bg-primary text-white rounded-xl font-black text-lg uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {submitting ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white" />
                        ) : (
                            <>
                                <Rocket className="h-5 w-5" />
                                <span>Сохранить</span>
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="w-24 h-14 bg-white border border-border text-muted-foreground rounded-xl font-black text-xs uppercase tracking-wider hover:bg-muted/30 active:scale-95 transition-all shadow-sm"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function EditAdPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-20 text-center font-black uppercase tracking-widest opacity-30 text-xs">Загрузка объявления...</div>}>
            <EditAdContent />
        </Suspense>
    );
}
