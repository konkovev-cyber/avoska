const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');

if (!fs.existsSync(outDir)) {
    console.log('No out directory found, skipping.');
    process.exit(0);
}

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, fileList);
        } else {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const allFiles = getFiles(outDir);

// Convert paths with __next. folder deeply nested into flat dotted files
// i.e., out/ads/create/__next.ads/create/__PAGE__.txt -> out/ads/create/__next.ads.create.__PAGE__.txt
let count = 0;
const dirsToRemove = new Set();

for (const filePath of allFiles) {
    const relPath = path.relative(outDir, filePath);
    // Use platform-independent separator
    const parts = relPath.split(path.sep);

    const nextFolderIndex = parts.findIndex(p => p.startsWith('__next.'));

    if (nextFolderIndex !== -1) {
        // If it's deeper than just the __next folder (like __next.ads/create/...)
        // Or if it's just __next.ad/__PAGE__.txt
        // The target directory is everything BEFORE the __next. folder
        const targetDirParts = parts.slice(0, nextFolderIndex);
        const targetDir = path.join(outDir, ...targetDirParts);

        // The flat filename is everything AFTER (and including) the __next. folder, joined by dots
        const fileParts = parts.slice(nextFolderIndex);
        const flatFileName = fileParts.join('.');

        const newFilePath = path.join(targetDir, flatFileName);

        // Move the file
        fs.renameSync(filePath, newFilePath);
        console.log(`Renamed: ${relPath} -> ${path.join(...targetDirParts, flatFileName)}`);
        count++;

        // Record directories that need cleanup
        for (let i = parts.length - 1; i > nextFolderIndex; i--) {
            const nestedDir = path.join(outDir, ...parts.slice(0, i));
            dirsToRemove.add(nestedDir);
        }
        const nextDir = path.join(outDir, ...parts.slice(0, nextFolderIndex + 1));
        dirsToRemove.add(nextDir);
    }
}

// Cleanup empty directories (must sort to deep-first)
const sortedDirs = Array.from(dirsToRemove).sort((a, b) => b.length - a.length);
for (const dir of sortedDirs) {
    try {
        if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
            fs.rmdirSync(dir);
        }
    } catch (e) {
        // Ignore cleanup errors
    }
}

console.log(`\nFixed ${count} RSC payload paths.`);
