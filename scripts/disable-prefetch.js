const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            getFiles(p, fileList);
        } else if (p.endsWith('.tsx') || p.endsWith('.jsx')) {
            fileList.push(p);
        }
    }
    return fileList;
}

const srcDir = path.join(__dirname, '..', 'src');
const files = getFiles(srcDir);
let changedCount = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    // Replace <Link with <Link prefetch={false} if it doesn't already have prefetch=
    const newContent = content.replace(/<Link(\s+)(?![^>]*prefetch=\{)/g, '<Link prefetch={false}$1');

    if (newContent !== content) {
        fs.writeFileSync(f, newContent, 'utf8');
        changedCount++;
        console.log('Updated', path.relative(srcDir, f));
    }
});

console.log('Total files updated:', changedCount);
