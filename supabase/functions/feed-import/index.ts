import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
}

// Примитивный маппинг категорий Avito -> Avoska
const categoryMapping: Record<string, string> = {
    'Телефоны': 'electronics',
    'Аудио и видео': 'electronics',
    'Товары для компьютера': 'electronics',
    'Игры, приставки и программы': 'electronics',
    'Одежда, обувь, аксессуары': 'clothes',
    'Детская одежда и обувь': 'clothes',
    'Товары для детей и игрушки': 'children',
    'Мебель и интерьер': 'home',
    'Ремонт и строительство': 'home',
    'Бытовая техника': 'home',
    'Квартиры': 'real-estate',
    'Комнаты': 'real-estate',
    'Дома, дачи, коттеджи': 'real-estate',
    'Земельные участки': 'real-estate',
    'Коммерческая недвижимость': 'real-estate',
    'Недвижимость за рубежом': 'real-estate',
    'Автомобили': 'auto',
    'Мотоциклы и мототехника': 'auto',
    'Грузовики и спецтехника': 'auto',
    'Водный транспорт': 'auto',
    'Запчасти и аксессуары': 'auto',
    'Вакансии': 'jobs',
    'Резюме': 'jobs',
    'Предложение услуг': 'services',
    'Животные': 'animals',
    'Красота и здоровье': 'health',
    'Билеты и путешествия': 'hobbies',
    'Спорт и отдых': 'hobbies',
    'Охота и рыбалка': 'hobbies',
    'Книги и журналы': 'hobbies',
    'Коллекционирование': 'hobbies',
    'Музыкальные инструменты': 'hobbies',
    'Велосипеды': 'hobbies',
    'Оборудование для бизнеса': 'business',
    'Готовый бизнес': 'business'
};

function getAvoskaCategory(avitoCategory: string): string {
    if (categoryMapping[avitoCategory]) return categoryMapping[avitoCategory];
    const normalized = (avitoCategory || "").toLowerCase();
    for (const [key, val] of Object.entries(categoryMapping)) {
        if (normalized.includes(key.toLowerCase())) return val;
    }
    return 'other';
}

async function uploadImageFromUrl(url: string, supabase: any): Promise<string | null> {
    try {
        const response = await fetch(url.trim());
        if (!response.ok) return null;
        const blob = await response.blob();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.jpg`;
        const filePath = `ads/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('ads').upload(filePath, blob);
        if (uploadError) return null;
        const { data: { publicUrl } } = supabase.storage.from('ads').getPublicUrl(filePath);
        return publicUrl;
    } catch (e) {
        return null;
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const authHeader = req.headers.get('Authorization');
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
        if (authError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

        const { ads } = await req.json();
        const results = [];
        const failedResults = [];

        for (const ad of ads) {
            try {
                const title = ad.Title || ad.name || 'Без названия';
                const description = ad.Description || ad.description || '';
                const price = parseInt(ad.Price || ad.price || '0', 10);
                const avitoCategory = ad.Category || ad.categoryId || '';

                let rawImages = [];
                if (ad.Images && ad.Images.Image) {
                    rawImages = Array.isArray(ad.Images.Image) ? ad.Images.Image : [ad.Images.Image];
                    rawImages = rawImages.map((img: any) => img['@_url'] || img.url || img);
                } else if (ad.picture) {
                    rawImages = Array.isArray(ad.picture) ? ad.picture : [ad.picture];
                }

                const uploadedImages = [];
                for (const imageUrl of rawImages.slice(0, 5)) {
                    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
                        const publicUrl = await uploadImageFromUrl(imageUrl, supabase);
                        if (publicUrl) uploadedImages.push(publicUrl);
                    }
                }

                const categorySlug = getAvoskaCategory(avitoCategory);
                const dbAd = {
                    user_id: user.id,
                    title,
                    description,
                    price,
                    category_id: categorySlug,
                    city: ad.Address || ad.City || 'Все города',
                    images: uploadedImages,
                    specifications: {
                        year: ad.Year,
                        mileage: ad.Kilometrage,
                        brand: ad.Brand,
                        model: ad.Model
                    },
                    status: 'active',
                    condition: ad.Condition === 'Новый' ? 'new' : 'used'
                };

                const { data: inserted, error: insertError } = await supabase.from('ads').insert(dbAd).select().single();
                if (insertError) throw insertError;
                results.push(inserted.id);
            } catch (e: any) {
                failedResults.push({ ad, error: e.message });
            }
        }

        return new Response(JSON.stringify({ success: true, successResults: results, failedResults }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
})
