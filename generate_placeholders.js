const fs = require('fs');
const path = require('path');

const categories = [
    { slug: 'transport', name: 'Транспорт', color1: '#f97316', color2: '#ef4444', icon: '🚗' },
    { slug: 'real-estate', name: 'Недвиж-ть', color1: '#3b82f6', color2: '#2563eb', icon: '🏠' },
    { slug: 'jobs', name: 'Работа', color1: '#ef4444', color2: '#dc2626', icon: '💼' },
    { slug: 'services', name: 'Услуги', color1: '#a855f7', color2: '#9333ea', icon: '🛠️' },
    { slug: 'electronics', name: 'Электр-ка', color1: '#22c55e', color2: '#16a34a', icon: '📱' },
    { slug: 'home', name: 'Для дома', color1: '#facc15', color2: '#ea580c', icon: '🛋️' },
    { slug: 'clothing', name: 'Одежда', color1: '#60a5fa', color2: '#3b82f6', icon: '👕' },
    { slug: 'parts', name: 'Запчасти', color1: '#9ca3af', color2: '#4b5563', icon: '⚙️' },
    { slug: 'hobby', name: 'Хобби', color1: '#f472b6', color2: '#e11d48', icon: '🎨' },
    { slug: 'pets', name: 'Животные', color1: '#fde047', color2: '#eab308', icon: '🐾' },
    { slug: 'beauty', name: 'Красота', color1: '#f9a8d4', color2: '#db2777', icon: '💄' },
    { slug: 'kids', name: 'Детское', color1: '#67e8f9', color2: '#06b6d4', icon: '🧸' }
];

const dir = path.join(__dirname, 'public', 'categories');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

categories.forEach(cat => {
    const svgContent = `
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad-${cat.slug}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${cat.color1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${cat.color2};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad-${cat.slug})" />
  <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="120" fill="white">${cat.icon}</text>
  <text x="50%" y="80%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" opacity="0.9">${cat.name}</text>
</svg>`;

    fs.writeFileSync(path.join(dir, `${cat.slug}.svg`), svgContent.trim());
    console.log(`Generated ${cat.slug}.svg`);
});
