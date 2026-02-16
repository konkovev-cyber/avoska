# 🧰 Toolkit — Переиспользуемые утилиты и улучшения

> Этот файл содержит готовые к копированию скрипты, паттерны и рекомендации,
> собранные из проекта **Avoska**. Для использования в другом проекте —
> поменяйте **вводные** (отмечены `⚙️ НАСТРОЙКА`).

---

## 📋 Перед применением — спросите себя:

1. **Какой хостинг?** (Beget/другой, FTP или SSH?)
2. **Какой домен?** (например `mysite.ru`)
3. **Supabase или другой BaaS?** (URL + anon key)
4. **Статический билд (`output: export`) или серверный?**
5. **Есть ли мобильное приложение (Capacitor)?**
6. **Какой FTP-путь?** (например `/mysite.ru/public_html/`)

---

## 1. 🚀 Автодеплой на FTP-хостинг (Beget и подобные)

### `ftp-deploy.js`

```js
// ⚙️ НАСТРОЙКА — поменяйте перед использованием:
const CONFIG = {
    ftp: {
        host: "ВАШ_ХОСТ.beget.tech",      // ⚙️ FTP хост
        user: "ВАШ_ЛОГИН",                 // ⚙️ FTP логин
        password: "ВАШ_ПАРОЛЬ",            // ⚙️ FTP пароль
        secure: false
    },
    localBuildDir: "out",                    // ⚙️ Папка с билдом (out / dist / build)
    zipFileName: "deploy.zip",               // ⚙️ Имя архива
    remotePath: "/mysite.ru/public_html/"     // ⚙️ Путь на сервере
};

const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const localPath = path.join(__dirname, CONFIG.localBuildDir);
    const zipPath = path.join(__dirname, CONFIG.zipFileName);

    try {
        await client.access(CONFIG.ftp);
        console.log("✅ FTP connected");

        // Удаляем старый архив
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
            console.log("🗑️  Old archive removed");
        }

        // Создаём ZIP (tar работает на Windows 10+, Linux, macOS)
        console.log("📦 Creating ZIP...");
        execSync(`tar -a -c -f "${CONFIG.zipFileName}" -C "${localPath}" .`, { stdio: 'inherit' });
        console.log("✅ ZIP created");

        // Загружаем
        const remoteFull = CONFIG.remotePath + CONFIG.zipFileName;
        console.log(`📤 Uploading to ${remoteFull}...`);
        await client.uploadFrom(zipPath, remoteFull);
        console.log("✅ Upload complete");

    } catch (err) {
        console.error("❌ FTP Error:", err);
    }
    client.close();
}

deploy();
```

### Добавьте в `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && node ftp-deploy.js"
  }
}
```

**Зависимость:** `npm install basic-ftp`

---

## 2. 📦 Автораспаковка ZIP на сервере

### `_unzip.php` — загружается на сервер, вызывается по HTTP, удаляется

```php
<?php
// ⚙️ НАСТРОЙКА:
$file = 'deploy.zip';  // ⚙️ Имя архива (должно совпадать с zipFileName выше)

set_time_limit(300);
if (!file_exists($file)) { die("Error: $file not found"); }
$zip = new ZipArchive;
if ($zip->open($file) === TRUE) {
    $zip->extractTo(__DIR__);
    $zip->close();
    unlink($file);
    echo "Success";
} else {
    echo "Error: cannot open zip";
}
```

### `remote-unzip.js` — автоматизация загрузки, вызова и удаления

```js
// ⚙️ НАСТРОЙКА — те же что в ftp-deploy.js плюс:
const CONFIG = {
    ftp: {
        host: "ВАШ_ХОСТ.beget.tech",
        user: "ВАШ_ЛОГИН",
        password: "ВАШ_ПАРОЛЬ",
        secure: false
    },
    remotePath: "/mysite.ru/public_html/",
    siteUrl: "http://mysite.ru",            // ⚙️ URL сайта (без слеша в конце)
    phpScript: "_unzip.php"
};

const ftp = require("basic-ftp");
const path = require("path");
const http = require("http");

async function run() {
    const client = new ftp.Client();
    try {
        await client.access(CONFIG.ftp);
        await client.uploadFrom(
            path.join(__dirname, CONFIG.phpScript),
            CONFIG.remotePath + CONFIG.phpScript
        );
        console.log("📤 Script uploaded");

        await new Promise(r => {
            http.get(`${CONFIG.siteUrl}/${CONFIG.phpScript}`, res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => { console.log("📥 Response:", d); r(); });
            }).on('error', e => { console.error(e.message); r(); });
        });

        await client.remove(CONFIG.remotePath + CONFIG.phpScript);
        console.log("🧹 Cleanup done");
    } catch (e) { console.error(e); }
    client.close();
}
run();
```

---

## 3. 🔐 Auth Callback для статического Supabase-сайта

Когда сайт собирается через `output: 'export'`, серверные Route Handlers **не работают**.
Нужна **клиентская** страница для обработки email-подтверждения.

### `src/app/auth/callback/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
// ⚙️ НАСТРОЙКА: замените импорт на ваш Supabase клиент
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
    const router = useRouter();
    // ⚙️ НАСТРОЙКА: текст можно перевести
    const [status, setStatus] = useState('Авторизация...');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    setStatus('Ошибка авторизации');
                    setTimeout(() => router.push('/login'), 2000);  // ⚙️ путь к логину
                    return;
                }
                if (data.session) {
                    router.push('/');  // ⚙️ путь после успеха
                } else {
                    const hash = window.location.hash;
                    if (hash?.includes('access_token')) {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (session) { router.push('/'); return; }
                    }
                    setStatus('Сессия не найдена');
                    setTimeout(() => router.push('/login'), 2000);
                }
            } catch (err) {
                setStatus('Ошибка');
                setTimeout(() => router.push('/login'), 2000);
            }
        };
        handleCallback();
    }, [router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto" />
                <p className="text-lg font-bold">{status}</p>
            </div>
        </div>
    );
}
```

**Не забудьте:** в Supabase Dashboard → Authentication → URL Configuration → Site URL: `https://ваш-домен.ru`
И Redirect URLs: `https://ваш-домен.ru/auth/callback`

---

## 4. 🖼️ Сжатие изображений на клиенте

Готовая утилита — перед загрузкой на сервер ужимает фото.

```ts
// ⚙️ НАСТРОЙКА: maxWidth и quality при вызове
export async function compressImage(
    file: File,
    maxWidth = 1200,    // ⚙️ Макс. ширина (для аватаров: 400, для фото объявлений: 1200)
    quality = 0.8       // ⚙️ Качество JPEG (0.6 = сильное сжатие, 0.9 = минимальное)
): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxWidth) { width *= maxWidth / height; height = maxWidth; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { reject(new Error('Canvas context failed')); return; }
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                        } else {
                            reject(new Error('Blob conversion failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}
```

---

## 5. 🌙 Тема (Light / Dark / System)

```ts
'use client';

export type Theme = 'light' | 'dark' | 'system';

export function getTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
}

export function setTheme(theme: Theme) {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    if (theme === 'system') {
        localStorage.removeItem('theme');
        const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.toggle('dark', sys === 'dark');
        root.removeAttribute('data-theme');
    } else {
        localStorage.setItem('theme', theme);
        root.classList.toggle('dark', theme === 'dark');
        root.setAttribute('data-theme', theme);
    }
}

export function initTheme() {
    if (typeof window === 'undefined') return;
    setTheme(getTheme());
}
```

---

## 6. 🔗 Shareable URL (Web + Capacitor)

```ts
// ⚙️ НАСТРОЙКА:
const PRODUCTION_DOMAIN = "https://mysite.ru";  // ⚙️ Ваш домен
const ITEM_PATH = "/ad";                         // ⚙️ Путь к странице товара/элемента

export function getShareableUrl(itemId?: string): string {
    const isCapacitor = typeof window !== 'undefined' && (
        window.location.protocol === 'capacitor:' ||
        window.location.protocol === 'ionic:' ||
        (window.location.protocol === 'http:' && window.location.hostname === 'localhost')
    );

    if (isCapacitor) {
        if (itemId) return `${PRODUCTION_DOMAIN}${ITEM_PATH}?id=${itemId}`;
        if (typeof window !== 'undefined') {
            const id = new URLSearchParams(window.location.search).get('id');
            if (id) return `${PRODUCTION_DOMAIN}${ITEM_PATH}?id=${id}`;
        }
        return PRODUCTION_DOMAIN;
    }

    return typeof window !== 'undefined' ? window.location.href : '';
}
```

---

## 7. 🛡️ Рекомендации по улучшениям для проекта

### Критичные (безопасность)

| # | Что | Зачем |
|---|-----|-------|
| 1 | **Убрать FTP-пароли из кода** | Сейчас пароли в `ftp-deploy.js` открытым текстом. Используйте `.env` файл и `process.env.FTP_PASSWORD` |
| 2 | **Добавить `.env.local` в `.gitignore`** | Проверьте, что секреты не попадают в Git |
| 3 | **HTTPS для FTP** | `secure: false` → `secure: true` (если хостинг поддерживает FTPS) |

### Полезные (UX)

| # | Что | Зачем |
|---|-----|-------|
| 4 | **SEO: meta-теги на каждой странице** | `<title>`, `<meta description>` — сейчас нет динамических мета-тегов |
| 5 | **PWA manifest** | Добавить `manifest.json` для установки сайта как приложения |
| 6 | **Скелетоны вместо спиннеров** | Вместо `animate-spin` показывать серые блоки-заглушки формы контента |
| 7 | **Lazy loading изображений** | Добавить `loading="lazy"` ко всем `<img>` |
| 8 | **404 страница с навигацией** | Красивая страница ошибки с кнопкой "На главную" |

### Производительность

| # | Что | Зачем |
|---|-----|-------|
| 9  | **Дебаунс поиска** | Не отправлять запрос на каждый символ, ждать 300мс |
| 10 | **Кэширование списков** | Использовать `zustand` persist для офлайн-доступа |
| 11 | **Оптимизация бандла** | `next/dynamic` для тяжёлых компонентов (карта, чат) |

### Инфраструктура

| # | Что | Зачем |
|---|-----|-------|
| 12 | **GitHub Actions CI/CD** | Автодеплой при push в master (уже частично есть) |
| 13 | **Мониторинг ошибок** | Sentry Free Tier — ловит баги в проде |
| 14 | **Бэкапы БД** | Автобэкап Supabase через pg_dump или встроенный dashboard |

---

## 8. 📂 Шаблон `.env.local`

```env
# ⚙️ НАСТРОЙКА — заполните своими значениями

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# FTP (для деплоя)
FTP_HOST=myhost.beget.tech
FTP_USER=myuser
FTP_PASSWORD=mypassword
FTP_REMOTE_PATH=/mysite.ru/public_html/

# Сайт
NEXT_PUBLIC_SITE_URL=https://mysite.ru
```

### Обновлённый `ftp-deploy.js` с `.env`:

```js
require('dotenv').config({ path: '.env.local' });

const CONFIG = {
    ftp: {
        host: process.env.FTP_HOST,
        user: process.env.FTP_USER,
        password: process.env.FTP_PASSWORD,
        secure: false
    },
    localBuildDir: "out",
    zipFileName: "deploy.zip",
    remotePath: process.env.FTP_REMOTE_PATH
};
// ... остальной код без изменений
```

**Зависимость:** `npm install dotenv`

---

## 9. 🔄 Скрипт полного деплоя (одна команда)

```json
{
  "scripts": {
    "deploy": "npm run build && node ftp-deploy.js && node remote-unzip.js",
    "deploy:clean": "npm run build && node ftp-clean.js && node ftp-deploy.js && node remote-unzip.js"
  }
}
```

---

*Создано из проекта Avoska. Лицензия: используй как хочешь.*
