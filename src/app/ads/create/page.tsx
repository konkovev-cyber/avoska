'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X, PlusSquare, Rocket, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import ResponsiveSelect from '@/components/ui/ResponsiveSelect';

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport' },
    { name: 'Недвижимость', slug: 'real-estate' },
    { name: 'Аренда квартир', slug: 'rent-apartments' },
    { name: 'Аренда коммерции', slug: 'rent-commercial' },
    { name: 'Аренда авто', slug: 'rent-cars' },
    { name: 'Работа', slug: 'jobs' },
    { name: 'Услуги', slug: 'services' },
    { name: 'Аренда инструмента', slug: 'rent-tools' },
    { name: 'Электроника', slug: 'electronics' },
    { name: 'Дом и дача', slug: 'home' },
    { name: 'Одежда', slug: 'clothing' },
    { name: 'Запчасти', slug: 'parts' },
    { name: 'Хобби', slug: 'hobby' },
    { name: 'Животные', slug: 'pets' },
    { name: 'Красота', slug: 'beauty' },
    { name: 'Детское', slug: 'kids' },
    { name: 'Для бизнеса', slug: 'business' },
    { name: 'Спорт и отдых', slug: 'sport' },
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
    const [specifications, setSpecifications] = useState<Record<string, string>>({});
    const [cities, setCities] = useState<any[]>([]);
    const [condition, setCondition] = useState('used');
    const [delivery, setDelivery] = useState(false);
    const [images, setImages] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [limitReached, setLimitReached] = useState(false);

    const router = useRouter();

    useEffect(() => {
        checkUser();
        fetchCities();
    }, []);

    useEffect(() => {
        setSpecifications({});
    }, [category]);

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

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (images.length + files.length > 5) {
            toast.error('Максимум 5 изображений');
            return;
        }

        setLoading(true);
        const toastId = toast.loading('Обработка фото...');
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
            toast.success('Фото добавлены', { id: toastId });
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
        const toastId = toast.loading('Публикуем...');

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
                status: 'pending',
                condition: (category === 'jobs' || category === 'services') ? 'new' : condition,
                specifications,
                latitude: null,
                longitude: null
            });

            if (insertError) throw insertError;

            toast.success('Отправлено на модерацию!', { id: toastId });
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
                <h1 className="text-3xl font-black mb-4">Лимит достигнут</h1>
                <p className="text-muted-foreground mb-8">Вы достигли предела бесплатных объявлений.</p>
                <a href="https://t.me/HT_Elk" className="bg-primary text-white px-8 py-3 rounded-xl font-bold">Написать админу</a>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-2 md:px-4 py-2 max-w-3xl pb-24">
            <div className="bg-surface border border-border rounded-[2rem] p-4 md:p-6 shadow-2xl shadow-black/5">
                <h1 className="text-xl md:text-2xl font-black mb-4 tracking-tight flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Новое объявление
                </h1>

                <div className="space-y-3">
                    {/* Main Info Row */}
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
                                columns={2}
                            />
                        </div>
                    </div>

                    {/* Price & [Condition + Delivery] Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                        {category === 'jobs' ? (
                            <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">З/П От</label>
                                    <input type="number" min="0" value={salaryFrom} onChange={(e) => setSalaryFrom(Math.max(0, parseFloat(e.target.value) || 0).toString())} className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-black transition-all" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">З/П До</label>
                                    <input type="number" min="0" value={salaryTo} onChange={(e) => setSalaryTo(Math.max(0, parseFloat(e.target.value) || 0).toString())} className="w-full h-11 px-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-black transition-all" />
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
                                        onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0).toString())}
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
                                        <input type="number" min="0" value={specifications.year || ''} onChange={(e) => setSpecifications({ ...specifications, year: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                    </div>
                                    {category === 'transport' && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Пробег (км)</label>
                                            <input type="number" min="0" value={specifications.mileage || ''} onChange={(e) => setSpecifications({ ...specifications, mileage: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
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
                                                <input type="number" min="0" value={specifications.area || ''} onChange={(e) => setSpecifications({ ...specifications, area: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                            </div>
                                        </div>
                                    )}
                                    {(specifications.type === 'commercial' || category === 'rent-commercial') && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Площадь (м²)</label>
                                            <input type="number" min="0" value={specifications.area || ''} onChange={(e) => setSpecifications({ ...specifications, area: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                        </div>
                                    )}
                                    {specifications.type === 'house' && (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Дом (м²)</label>
                                                <input type="number" min="0" value={specifications.house_area || ''} onChange={(e) => setSpecifications({ ...specifications, house_area: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Участок (сот)</label>
                                                <input type="number" min="0" value={specifications.plot_area || ''} onChange={(e) => setSpecifications({ ...specifications, plot_area: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
                                            </div>
                                        </div>
                                    )}
                                    {specifications.type === 'plot' && (
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-bold text-muted-foreground ml-1">Участок (сот)</label>
                                            <input type="number" min="0" value={specifications.plot_area || ''} onChange={(e) => setSpecifications({ ...specifications, plot_area: Math.max(0, parseFloat(e.target.value) || 0).toString() })} className="w-full h-10 px-3 rounded-lg bg-white border border-border outline-none focus:border-primary font-bold text-sm" />
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
                            className="w-full p-4 rounded-xl bg-white border border-border outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-medium text-sm min-h-[140px] transition-all resize-none placeholder:text-muted-foreground/50 leading-relaxed"
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

                            {previewUrls.map((url, index) => (
                                <div key={index} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-border/60 shadow-sm group bg-background animate-in fade-in zoom-in-95">
                                    <img src={url} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                    <button
                                        onClick={() => removeImage(index)}
                                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-md hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
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

                {/* Submit */}
                <div className="mt-8">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full h-16 bg-primary text-white rounded-2xl font-black text-lg uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:hover:scale-100"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white" />
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
