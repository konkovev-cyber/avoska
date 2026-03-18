const fs = require('fs');
const path = require('path');
const https = require('https');

const categories = [
    { name: 'transport', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=400&auto=format&fit=crop' },
    { name: 'real-estate', url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop' },
    { name: 'jobs', url: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=400&auto=format&fit=crop' },
    { name: 'services', url: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=400&auto=format&fit=crop' },
    { name: 'electronics', url: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?q=80&w=400&auto=format&fit=crop' },
    { name: 'home', url: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=400&auto=format&fit=crop' },
    { name: 'clothing', url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400&auto=format&fit=crop' },
    { name: 'parts', url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop' },
    { name: 'hobby', url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?q=80&w=400&auto=format&fit=crop' },
    { name: 'pets', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=400&auto=format&fit=crop' },
    { name: 'beauty', url: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?q=80&w=400&auto=format&fit=crop' },
    { name: 'kids', url: 'https://images.unsplash.com/photo-1472162072942-cd5147eb3902?q=80&w=400&auto=format&fit=crop' }
];

const downloadDir = path.join(__dirname, 'public', 'categories');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

// Игнорируем ошибки сертификатов
const agent = new https.Agent({
    rejectUnauthorized: false
});

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, { agent }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadImage(response.headers.location, filepath).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(filepath);
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`Downloaded to ${filepath}`);
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(filepath, () => { }); // Delete the file async. (But we don't check the result)
                reject(err);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => { }); // Delete the file async. (But we don't check the result)
            reject(err);
        });
    });
}

(async () => {
    console.log('Starting download...');
    for (const cat of categories) {
        const filepath = path.join(downloadDir, `${cat.name}.jpg`);
        try {
            console.log(`Downloading ${cat.name}...`);
            await downloadImage(cat.url, filepath);
        } catch (error) {
            console.error(`Error downloading ${cat.name}:`, error.message);
        }
    }
    console.log('Done!');
})();
