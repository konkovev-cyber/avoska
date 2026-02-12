'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, X, MessageCircle, AlertCircle, Briefcase, Wrench, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { compressImage } from '@/lib/image-utils';
import { getCurrentCity } from '@/lib/geo';

const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport' },
    { name: 'Недвижимость', slug: 'real-estate' },
    { name: 'Работа', slug: 'jobs' },
    { name: 'Услуги', slug: 'services' },
    { name: 'Электроника', slug: 'electronics' },
    { name: 'Дом и дача', slug: 'home' },
    { name: 'Личные вещи', slug: 'clothing' },
    { name: 'Запчасти', slug: 'parts' },
    { name: 'Хобби и отдых', slug: 'hobby' },
    { name: 'Животные', slug: 'pets' },
    { name: 'Красота', slug: 'beauty' },
    { name: 'Детские товары', slug: 'kids' },
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
        const newImages = [...images];
        newImages.splice(index, 1);
        setImages(newImages);
        const newUrls = [...previewUrls];
        newUrls.splice(index, 1);
        setPreviewUrls(newUrls);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Пользователь не авторизован');

            const uploadedImageUrls: string[] = [];
            for (const file of images) {
                const fileName = `${Math.random()}.jpg`;
                const filePath = `${session.user.id}/${fileName}`;
                const { error: uploadError } = await supabase.storage.from('ad-images').upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('ad-images').getPublicUrl(filePath);
                uploadedImageUrls.push(publicUrl);
            }

            // Cleanup specifications by removing empty values
            const cleanSpecs = Object.fromEntries(
                Object.entries(specifications).filter(([_, v]) => v !== '')
            );

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
                status: 'pending', // Send to moderation by default
                condition: (category === 'jobs' || category === 'services') ? 'new' : condition,
                specifications: cleanSpecs
            });

            if (insertError) {
                if (insertError.message.includes('Limit reached')) {
                    setLimitReached(true);
                    return;
                }
                throw insertError;
            }

            toast.success('Объявление опубликовано!');

            // Notify via Telegram (Fire and forget)
            fetch('/api/notify-ad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ad: { id: (insertError as any)?.id || 'new', title, price, city },
                    author: session.user.email
                }),
            }).catch(console.error);

            router.push('/');
            router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (limitReached) {
        return (
            <div className="container mx-auto px-4 py-20 flex flex-col items-center text-center">
                <AlertCircle className="h-16 w-16 text-destructive mb-6" />
                <h1 className="text-3xl font-black mb-4">Лимит превышен</h1>
                <p className="text-muted mb-8">У вас уже 10 объявлений. Свяжитесь с нами для расширения.</p>
                <a href="https://t.me/HT_Elk" className="bg-[#229ED9] text-white px-8 py-4 rounded-full font-bold shadow-xl">Написать админу</a>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-3xl">
            <h1 className="text-3xl font-black mb-8">Создать объявление</h1>
            <form onSubmit={handleSubmit} className="space-y-8 bg-surface p-6 md:p-8 rounded-3xl border border-border shadow-sm">
                <div>
                    <label className="block text-sm font-bold mb-2">Название</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold mb-2">Категория</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full p-3 rounded-xl border border-border bg-background outline-none">
                            <option value="">Выберите...</option>
                            {CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        </select>
                    </div>

                    {category === 'jobs' ? (
                        <div>
                            <label className="block text-sm font-bold mb-2">Зарплата (₽)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" placeholder="От" value={salaryFrom} onChange={(e) => setSalaryFrom(e.target.value)} className="p-3 rounded-xl border border-border bg-background outline-none" />
                                <input type="number" placeholder="До" value={salaryTo} onChange={(e) => setSalaryTo(e.target.value)} className="p-3 rounded-xl border border-border bg-background outline-none" />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-bold mb-2">Цена (₽)</label>
                            <input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                    )}
                </div>

                {/* Dynamic Specifications */}
                {category === 'transport' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-sm font-bold mb-2">Марка</label>
                            <input type="text" placeholder="Напр: Toyota" value={specifications.brand || ''} onChange={(e) => setSpecifications({ ...specifications, brand: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Год выпуска</label>
                            <input type="number" placeholder="2020" value={specifications.year || ''} onChange={(e) => setSpecifications({ ...specifications, year: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Пробег (км)</label>
                            <input type="number" placeholder="50000" value={specifications.mileage || ''} onChange={(e) => setSpecifications({ ...specifications, mileage: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">КПП</label>
                            <select value={specifications.transmission || ''} onChange={(e) => setSpecifications({ ...specifications, transmission: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none">
                                <option value="">Не выбрано</option>
                                <option value="auto">Автомат</option>
                                <option value="manual">Механика</option>
                            </select>
                        </div>
                    </div>
                )}

                {category === 'real-estate' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-sm font-bold mb-2">Тип недвижимости</label>
                            <select
                                value={specifications.type || ''}
                                onChange={(e) => setSpecifications({ ...specifications, type: e.target.value })}
                                className="w-full p-3 rounded-xl border border-border bg-background outline-none"
                            >
                                <option value="">Выберите...</option>
                                <option value="apartment">Квартира</option>
                                <option value="house">Дом, дача, коттедж</option>
                                <option value="plot">Земельный участок</option>
                                <option value="garage">Гараж и машиноместо</option>
                                <option value="commercial">Коммерческая недвижимость</option>
                            </select>
                        </div>

                        {specifications.type === 'apartment' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Кол-во комнат</label>
                                    <select value={specifications.rooms || ''} onChange={(e) => setSpecifications({ ...specifications, rooms: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none">
                                        <option value="">Не выбрано</option>
                                        <option value="studio">Студия</option>
                                        <option value="1">1 комната</option>
                                        <option value="2">2 комнаты</option>
                                        <option value="3">3 комнаты</option>
                                        <option value="4+">4+ комнат</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Общая площадь (м²)</label>
                                    <input type="number" value={specifications.area || ''} onChange={(e) => setSpecifications({ ...specifications, area: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Этаж</label>
                                    <input type="number" value={specifications.floor || ''} onChange={(e) => setSpecifications({ ...specifications, floor: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Этажей в доме</label>
                                    <input type="number" value={specifications.total_floors || ''} onChange={(e) => setSpecifications({ ...specifications, total_floors: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                            </div>
                        )}

                        {specifications.type === 'house' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Площадь дома (м²)</label>
                                    <input type="number" value={specifications.house_area || ''} onChange={(e) => setSpecifications({ ...specifications, house_area: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Площадь участка (сот.)</label>
                                    <input type="number" value={specifications.plot_area || ''} onChange={(e) => setSpecifications({ ...specifications, plot_area: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Этажей в доме</label>
                                    <input type="number" value={specifications.total_floors || ''} onChange={(e) => setSpecifications({ ...specifications, total_floors: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Материал стен</label>
                                    <select value={specifications.material || ''} onChange={(e) => setSpecifications({ ...specifications, material: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none">
                                        <option value="">Выберите...</option>
                                        <option value="brick">Кирпич</option>
                                        <option value="wood">Брус/Бревно</option>
                                        <option value="block">Газоблоки</option>
                                        <option value="panel">Панель</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {specifications.type === 'plot' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold mb-2">Площадь (сот.)</label>
                                    <input type="number" value={specifications.plot_area || ''} onChange={(e) => setSpecifications({ ...specifications, plot_area: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold mb-2">Статус участка</label>
                                    <select value={specifications.status || ''} onChange={(e) => setSpecifications({ ...specifications, status: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none">
                                        <option value="">Выберите...</option>
                                        <option value="izhs">ИЖС</option>
                                        <option value="snt">СНТ/ДНП</option>
                                        <option value="prom">Промназначения</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {category === 'electronics' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-sm font-bold mb-2">Бренд</label>
                            <input type="text" placeholder="Apple, Samsung..." value={specifications.brand || ''} onChange={(e) => setSpecifications({ ...specifications, brand: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Модель</label>
                            <input type="text" placeholder="iPhone 15..." value={specifications.model || ''} onChange={(e) => setSpecifications({ ...specifications, model: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                    </div>
                )}

                {category === 'clothing' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-sm font-bold mb-2">Размер</label>
                            <input type="text" placeholder="M, 42, XL..." value={specifications.size || ''} onChange={(e) => setSpecifications({ ...specifications, size: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">Пол</label>
                            <select value={specifications.gender || ''} onChange={(e) => setSpecifications({ ...specifications, gender: e.target.value })} className="w-full p-3 rounded-xl border border-border bg-background outline-none">
                                <option value="">Не выбрано</option>
                                <option value="male">Мужской</option>
                                <option value="female">Женский</option>
                                <option value="unisex">Унисекс</option>
                            </select>
                        </div>
                    </div>
                )}

                {category !== 'jobs' && category !== 'services' && (
                    <div>
                        <label className="block text-sm font-bold mb-3">Состояние</label>
                        <div className="flex gap-4">
                            {['used', 'new'].map(c => (
                                <button key={c} type="button" onClick={() => setCondition(c)} className={cn("flex-1 p-3 rounded-xl border font-bold", condition === c ? "bg-primary text-white" : "bg-surface")}>
                                    {c === 'used' ? 'Б/у' : 'Новое'}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold mb-2">Описание</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={6} className="w-full p-3 rounded-xl border border-border bg-background outline-none" />
                </div>

                <div className="grid md:grid-cols-2 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-bold mb-2">Город</label>
                        <div className="flex gap-2">
                            <select
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                                className="flex-1 p-3 rounded-xl border border-border bg-background outline-none font-medium"
                            >
                                {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                {!cities.find(c => c.name === city) && <option value={city}>{city}</option>}
                            </select>
                            <button
                                type="button"
                                onClick={handleLocate}
                                title="Определить местоположение"
                                className="w-12 h-12 flex items-center justify-center bg-surface border border-border rounded-xl hover:text-primary transition-all active:scale-95"
                            >
                                <MapPin className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold mb-2">Адрес</label>
                        <input
                            type="text"
                            placeholder="Напр: ул. Ленина, д. 5"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full p-3 rounded-xl border border-border bg-background outline-none"
                        />
                    </div>
                    {category !== 'services' && category !== 'jobs' && (
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-border">
                            <input type="checkbox" checked={delivery} onChange={(e) => setDelivery(e.target.checked)} className="w-5 h-5 accent-primary" />
                            <span className="text-sm font-bold">Доставка</span>
                        </label>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold mb-4">Фото (до 3-х)</label>
                    <div className="flex gap-4">
                        {previewUrls.map((url, i) => (
                            <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden">
                                <img src={url} className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white"><X className="h-4 w-4" /></button>
                            </div>
                        ))}
                        {images.length < 3 && (
                            <label className="w-24 h-24 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:text-primary">
                                <Camera className="h-8 w-8" />
                                <input type="file" multiple onChange={handleImageChange} className="hidden" />
                            </label>
                        )}
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl shadow-xl disabled:opacity-50">
                    {loading ? 'Публикация...' : 'Опубликовать'}
                </button>
            </form>
        </div>
    );
}
