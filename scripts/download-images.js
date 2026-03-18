const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const categories = [
    { name: 'transport', url: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=400&auto=format&fit=crop' },
    { name: 'real-estate', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop' },
    { name: 'jobs', url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=400&auto=format&fit=crop' },
    { name: 'services', url: 'https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=400&auto=format&fit=crop' },
    { name: 'electronics', url: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=400&auto=format&fit=crop' },
    { name: 'home', url: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop' },
    { name: 'clothing', url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop' },
    { name: 'parts', url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop' },
    { name: 'hobby', url: 'https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?q=80&w=400&auto=format&fit=crop' },
    { name: 'pets', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop' },
    { name: 'beauty', url: 'https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?q=80&w=400&auto=format&fit=crop' },
    { name: 'kids', url: 'https://images.unsplash.com/photo-1515488442805-d37197004f1e?q=80&w=400&auto=format&fit=crop' }
];

const downloadDir = path.join(__dirname, 'public', 'categories');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

async function downloadAll() {
    console.log('Downloading images using Node fetch...');
    for (const cat of categories) {
        try {
            const response = await fetch(cat.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const stream = fs.createWriteStream(path.join(downloadDir, `${cat.name}.jpg`));
            await pipeline(response.body, stream);
            console.log(`Downloaded ${cat.name}.jpg`);
        } catch (error) {
            console.error(`Failed to download ${cat.name}:`, error.message);
        }
    }
    console.log('Finished!');
}

downloadAll();
