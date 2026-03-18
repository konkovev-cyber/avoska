const fs = require('fs');
const https = require('https');
const path = require('path');

const categories = [
    { name: 'transport', url: 'https://picsum.photos/id/1071/400/400' },
    { name: 'real-estate', url: 'https://picsum.photos/id/1031/400/400' },
    { name: 'jobs', url: 'https://picsum.photos/id/1/400/400' },
    { name: 'services', url: 'https://picsum.photos/id/1070/400/400' },
    { name: 'electronics', url: 'https://picsum.photos/id/367/400/400' },
    { name: 'home', url: 'https://picsum.photos/id/1062/400/400' },
    { name: 'clothing', url: 'https://picsum.photos/id/1059/400/400' },
    { name: 'parts', url: 'https://picsum.photos/id/252/400/400' },
    { name: 'hobby', url: 'https://picsum.photos/id/96/400/400' },
    { name: 'pets', url: 'https://picsum.photos/id/237/400/400' },
    { name: 'beauty', url: 'https://picsum.photos/id/360/400/400' },
    { name: 'kids', url: 'https://picsum.photos/id/1084/400/400' }
];

const downloadDir = path.join(__dirname, 'public', 'categories');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

async function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { rejectUnauthorized: false }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Handle Redirects manually often needed for picsum
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

(async () => {
    console.log('Starting Node download...');
    for (const cat of categories) {
        try {
            console.log(`Downloading ${cat.name}...`);
            await download(cat.url, path.join(downloadDir, `${cat.name}.jpg`));
            console.log(`Saved ${cat.name}.jpg`);
        } catch (e) {
            console.error(`Error ${cat.name}:`, e.message);
        }
    }
    console.log('Done.');
})();
