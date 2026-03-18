export const APP_VERSION = '0.1.5';
export const APP_BUILD = '2026.0217.1220'; // YYYY.MMDD.HHMM format
export const GITHUB_REPO = 'konkovev-cyber/avoska';
export const APK_DOWNLOAD_URL = 'https://avoska.353290.ru/avoska.apk';

// ─────────────────────────────────────────────────────────────────────────────
// Категории — единый источник правды. Не дублировать в других файлах!
// Импортировать: import { CATEGORIES, CategorySlug } from '@/lib/constants';
// ─────────────────────────────────────────────────────────────────────────────
export const CATEGORIES = [
    { name: 'Транспорт', slug: 'transport', image: '/categories/transport.jpg' },
    { name: 'Недвижимость', slug: 'real-estate', image: '/categories/real-estate.jpg' },
    { name: 'Для бизнеса', slug: 'business', image: '/categories/business.jpg' },
    { name: 'Спорт и отдых', slug: 'sport', image: '/categories/sport.jpg' },
    { name: 'Работа', slug: 'jobs', image: '/categories/jobs.jpg' },
    { name: 'Услуги', slug: 'services', image: '/categories/services.jpg' },
    { name: 'Электроника', slug: 'electronics', image: '/categories/electronics.jpg' },
    { name: 'Дом и дача', slug: 'home', image: '/categories/home.jpg' },
    { name: 'Одежда', slug: 'clothing', image: '/categories/clothing.jpg' },
    { name: 'Детское', slug: 'kids', image: '/categories/kids.jpg' },
    { name: 'Аренда квартир', slug: 'rent-apartments', image: '/categories/rent-apartments.jpg' },
    { name: 'Аренда коммерции', slug: 'rent-commercial', image: '/categories/rent-commercial.jpg' },
    { name: 'Аренда авто', slug: 'rent-cars', image: '/categories/rent-cars.jpg' },
    { name: 'Аренда инструмента', slug: 'rent-tools', image: '/categories/rent-tools.jpg' },
    { name: 'Запчасти', slug: 'parts', image: '/categories/parts.jpg' },
    { name: 'Хобби', slug: 'hobby', image: '/categories/hobby.jpg' },
    { name: 'Животные', slug: 'pets', image: '/categories/pets.jpg' },
    { name: 'Красота', slug: 'beauty', image: '/categories/beauty.jpg' },
] as const;

export type CategorySlug = typeof CATEGORIES[number]['slug'];
export type Category = typeof CATEGORIES[number];
